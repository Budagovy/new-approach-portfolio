/* QA gate for the "Selected projects" fan: the entrance opening into the
   fan, the resting geometry, hover lift and push, restore on leave, that
   the thumbnails actually load, and that the fan fits its column from
   desktop down to phones and under reduced motion. Exits non-zero on
   failure. Screenshots land in qa/frames/.

   Run with the dev server up:  npm run qa:projects
*/
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const URL_ = process.env.QA_URL || "http://localhost:3220";
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(58)} ${d}`); if (!p) fails.push(n); };

/* Each card's pose, decomposed from its 2D matrix, plus where it sits. */
const probe = () => {
  const fan = document.querySelector(".fan-layout"), sec = document.querySelector(".projects");
  const col = document.querySelector(".projects-body").getBoundingClientRect();
  const cards = [...document.querySelectorAll(".fan-card")].map((c) => {
    const cs = getComputedStyle(c);
    const m = cs.transform === "none" ? [1, 0, 0, 1, 0, 0] : cs.transform.slice(cs.transform.indexOf("(") + 1).match(/-?[\d.]+(?:e-?\d+)?/g).map(Number);
    const r = c.getBoundingClientRect(), img = c.querySelector("img");
    return {
      rot: Math.round(Math.atan2(m[1], m[0]) * 180 / Math.PI * 10) / 10, scale: +Math.hypot(m[0], m[1]).toFixed(3),
      tx: Math.round(m[4]), ty: Math.round(m[5]), opacity: +(+cs.opacity).toFixed(2), z: +cs.zIndex,
      left: Math.round(r.left), right: Math.round(r.right), loaded: !!img && img.complete && img.naturalWidth > 0,
    };
  });
  return {
    secTop: sec.offsetTop, position: getComputedStyle(sec).position, fanTop: Math.round(fan.getBoundingClientRect().top + scrollY), fanH: Math.round(fan.getBoundingClientRect().height),
    col: { l: Math.round(col.left), r: Math.round(col.right) }, cards,
    heading: +getComputedStyle(document.querySelector(".projects-heading")).opacity,
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/* ---------- desktop ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  let s = await page.evaluate(probe);
  ok("before it scrolls in: cards hidden, stacked low at the centre", s.cards.every((c) => c.opacity === 0 && c.tx === 0 && c.ty > 0), JSON.stringify(s.cards.map((c) => [c.opacity, c.tx, c.ty])));

  await page.evaluate((y) => scrollTo(0, y), s.fanTop - 140);
  await page.waitForTimeout(2600);
  s = await page.evaluate(probe);
  const [a, b, c] = s.cards;
  ok("entrance played: all three shown, heading revealed", s.cards.every((k) => k.opacity === 1) && s.heading === 1, JSON.stringify(s.cards.map((k) => k.opacity)));
  ok("centre card flat at full size, on top", b.rot === 0 && b.scale === 1 && b.tx === 0 && b.z > a.z && b.z > c.z, JSON.stringify(b));
  ok("side cards mirrored: tilted out, smaller, lower, either side", a.rot < 0 && c.rot === -a.rot && a.scale < 1 && a.scale === c.scale && a.tx === -c.tx && a.tx < 0 && a.ty > 0 && a.ty === c.ty, JSON.stringify([a, c].map((k) => [k.rot, k.scale, k.tx, k.ty])));
  ok("fan sits inside the page column", Math.min(...s.cards.map((k) => k.left)) >= s.col.l && Math.max(...s.cards.map((k) => k.right)) <= s.col.r, `cards ${Math.min(...s.cards.map((k) => k.left))}..${Math.max(...s.cards.map((k) => k.right))} in ${s.col.l}..${s.col.r}`);
  ok("all thumbnails loaded", s.cards.every((k) => k.loaded), JSON.stringify(s.cards.map((k) => k.loaded)));
  ok("section is ordinary flow, not pinned", s.position !== "sticky" && s.position !== "fixed", s.position);
  await page.screenshot({ path: OUT + "projects-rest.png" });
  const rest = s.cards;

  // Hover a side card: it lifts and grows, the centre card is pushed away from it.
  await page.locator(".fan-card").nth(0).hover();
  await page.waitForTimeout(900);
  s = await page.evaluate(probe);
  ok("hover left card: it lifts and grows", s.cards[0].ty < rest[0].ty && s.cards[0].scale > rest[0].scale, `ty ${rest[0].ty}->${s.cards[0].ty}, scale ${rest[0].scale}->${s.cards[0].scale}`);
  ok("hover left card: centre is pushed right and tilts away", s.cards[1].tx > rest[1].tx && s.cards[1].rot > 0, `tx ${rest[1].tx}->${s.cards[1].tx}, rot ${s.cards[1].rot}`);
  await page.screenshot({ path: OUT + "projects-hover.png" });

  // Hover the centre card: it lifts; the outermost cards hold their ground.
  // (Leave first, so the pointer goes to where the centre card RESTS, not
  // to where the previous hover had pushed it.)
  await page.mouse.move(10, 10);
  await page.waitForTimeout(1100);
  await page.locator(".fan-card").nth(1).hover();
  await page.waitForTimeout(900);
  s = await page.evaluate(probe);
  ok("hover centre card: it lifts and grows, back on its axis", s.cards[1].ty < rest[1].ty && s.cards[1].scale > 1 && s.cards[1].tx === 0, JSON.stringify(s.cards[1]));

  // Leave: everything back exactly where it rested.
  await page.mouse.move(10, 10);
  await page.waitForTimeout(1100);
  s = await page.evaluate(probe);
  ok("mouse leave: fan restores exactly", s.cards.every((k, i) => k.rot === rest[i].rot && k.scale === rest[i].scale && k.tx === rest[i].tx && k.ty === rest[i].ty), JSON.stringify(s.cards.map((k) => [k.rot, k.scale, k.tx, k.ty])));
  ok("desktop: no overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

/* ---------- fits at every width ---------- */
for (const [w, h, mobile] of [[1024, 768, false], [768, 1024, true], [390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  let s = await page.evaluate(probe);
  await page.evaluate((y) => scrollTo(0, y), s.fanTop - 120);
  await page.waitForTimeout(2600);
  s = await page.evaluate(probe);
  const l = Math.min(...s.cards.map((k) => k.left)), r = Math.max(...s.cards.map((k) => k.right));
  ok(`${w}px: fan shown and inside the column, no overflow`, s.cards.every((k) => k.opacity === 1) && l >= s.col.l && r <= s.col.r && s.overflow === 0, `cards ${l}..${r} in ${s.col.l}..${s.col.r}, overflow ${s.overflow}`);
  await page.screenshot({ path: `${OUT}projects-${w}.png` });
  await ctx.close();
}

/* ---------- reduced motion ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const s = await page.evaluate(probe);
  ok("reduced motion: fan simply there, no entrance to wait for", s.cards.every((k) => k.opacity === 1) && s.cards[1].rot === 0 && s.cards[0].rot < 0, JSON.stringify(s.cards.map((k) => [k.opacity, k.rot])));
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
