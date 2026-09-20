/* QA gate for the "Selected projects" grid: three 2:3 cards with title and
   tag, images actually loading, the grid centred inside the page column at
   the frame's proportions, the staggered reveal on scroll-in, one column
   on phones, and nothing to wait for under reduced motion. Exits non-zero
   on failure. Screenshots land in qa/frames/.

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

const probe = () => {
  const grid = document.querySelector(".projects-grid"), col = document.querySelector(".projects-body").getBoundingClientRect();
  const g = grid.getBoundingClientRect();
  const cards = [...document.querySelectorAll(".project-item")].map((li) => {
    const m = li.querySelector(".project-media").getBoundingClientRect(), img = li.querySelector("img");
    return {
      title: li.querySelector(".project-title")?.textContent, tag: li.querySelector(".project-tag")?.textContent,
      aspect: +(m.width / m.height).toFixed(3), top: Math.round(m.top), left: Math.round(m.left), w: Math.round(m.width),
      loaded: !!img && img.complete && img.naturalWidth > 0, opacity: +(+getComputedStyle(li).opacity).toFixed(2),
    };
  });
  const body = document.querySelector(".projects-body");
  return {
    label: [...document.querySelectorAll(".projects-label > span")].map((s) => s.textContent.trim()).join(" "),
    heading: !!document.querySelector(".projects-heading"),
    bodyH: body.offsetHeight, vh: innerHeight,
    contentBottom: Math.round(Math.max(...[...document.querySelectorAll(".project-tag")].map((t) => t.getBoundingClientRect().bottom)) - body.getBoundingClientRect().top),
    gridTop: Math.round(g.top + scrollY), grid: { l: Math.round(g.left), r: Math.round(g.right), w: Math.round(g.width) }, col: { l: Math.round(col.left), r: Math.round(col.right) },
    cards, overflow: document.documentElement.scrollWidth - innerWidth,
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
  ok("label reads 02 / Selected projects, no heading", s.label === "02 Selected projects" && !s.heading, `${s.label}`);
  ok("before it scrolls in: cards hidden", s.cards.every((c) => c.opacity === 0), JSON.stringify(s.cards.map((c) => c.opacity)));

  await page.evaluate((y) => scrollTo(0, y), s.gridTop - 300);
  // Part-way through: the cards open left to right, each a step behind the last.
  await page.waitForTimeout(450);
  const mid = await page.evaluate(probe);
  ok("cards open one after another (left ahead of middle ahead of right)", mid.cards[0].opacity > mid.cards[1].opacity && mid.cards[1].opacity > mid.cards[2].opacity, JSON.stringify(mid.cards.map((c) => c.opacity)));
  await page.waitForTimeout(1400);
  s = await page.evaluate(probe);
  ok("scrolled in: all three cards revealed", s.cards.length === 3 && s.cards.every((c) => c.opacity === 1), JSON.stringify(s.cards.map((c) => c.opacity)));
  ok("three across, same row, 2:3 images", s.cards.every((c) => c.top === s.cards[0].top) && s.cards.every((c) => Math.abs(c.aspect - 0.667) < 0.01), JSON.stringify(s.cards.map((c) => [c.top, c.aspect])));
  ok("titles and tags present", s.cards.every((c) => c.title && c.tag), JSON.stringify(s.cards.map((c) => [c.title, c.tag])));
  ok("images loaded", s.cards.every((c) => c.loaded), JSON.stringify(s.cards.map((c) => c.loaded)));
  const centred = Math.abs((s.grid.l - s.col.l) - (s.col.r - s.grid.r)) <= 2;
  ok("grid centred in the column, capped at 1150px", centred && s.grid.w <= 1150 && s.grid.l >= s.col.l && s.grid.r <= s.col.r, `grid ${s.grid.l}..${s.grid.r} (${s.grid.w}) in ${s.col.l}..${s.col.r}`);
  ok("hairline gutter between cards (8px)", s.cards[1].left - (s.cards[0].left + s.cards[0].w) === 8, `${s.cards[1].left - (s.cards[0].left + s.cards[0].w)}px`);
  ok("cards at the frame's size (~376px), captions inside the section", Math.abs(s.cards[0].w - 376) <= 4 && s.contentBottom < s.bodyH, `card ${s.cards[0].w}px, body ${s.bodyH}, content bottom ${s.contentBottom}`);
  ok("desktop: no overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await page.screenshot({ path: OUT + "projects-desktop.png" });
  await ctx.close();
}

/* ---------- widths ---------- */
for (const [w, h, mobile, cols] of [[1366, 768, false, 3], [1280, 720, false, 3], [1024, 768, false, 3], [768, 1024, true, 3], [390, 844, true, 1]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  let s = await page.evaluate(probe);
  await page.evaluate((y) => scrollTo(0, y), s.gridTop - 200);
  await page.waitForTimeout(1600);
  s = await page.evaluate(probe);
  const rows = new Set(s.cards.map((c) => c.top)).size;
  const expectRows = cols === 1 ? 3 : 1;
  ok(`${w}px: ${cols} column(s), revealed, inside the column, no overflow`, rows === expectRows && s.cards.every((c) => c.opacity === 1 || cols === 1) && s.grid.l >= s.col.l && s.grid.r <= s.col.r && s.overflow === 0, `rows ${rows}, grid ${s.grid.l}..${s.grid.r} in ${s.col.l}..${s.col.r}, overflow ${s.overflow}`);
  if (cols === 3) ok(`${w}x${h}: captions inside the section`, s.contentBottom < s.bodyH, `body ${s.bodyH}, content bottom ${s.contentBottom}, card ${s.cards[0].w}px wide`);
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
  ok("reduced motion: cards simply there", s.cards.every((c) => c.opacity === 1), JSON.stringify(s.cards.map((c) => c.opacity)));
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
