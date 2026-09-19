/* QA gate for the "My approach" section: exactly one screen tall, the
   timed sequence (entrance, then the line running 01 to 04 lighting each
   step in order, the finished state held), layout stability, and the
   flowing narrow / short / reduced-motion layouts. Exits non-zero on
   failure. Screenshots land in qa/frames/.

   Run with the dev server up:  npm run qa:approach
*/
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { APPROACH } from "../src/lib/motion.ts";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.QA_URL || "http://localhost:3220";
/* The same numbers the component animates by, so the gate can't drift
   from the implementation. */
const { fillDelay: FILL_DELAY, fillDuration: FILL_DURATION } = APPROACH;
const SEQUENCE_MS = (FILL_DELAY + FILL_DURATION) * 1000;

const fails = [];
const ok = (name, pass, detail = "") => { console.log(`${pass ? "PASS" : "FAIL"}  ${name.padEnd(56)} ${detail}`); if (!pass) fails.push(name); };

/* Everything the section exposes through computed style. */
const probe = () => {
  const num = (s) => parseFloat(s);
  const mat = (el) => { const t = getComputedStyle(el).transform; if (t === "none") return { a: 1, ty: 0 }; const m = t.match(/matrix\(([^)]+)\)/)[1].split(",").map(Number); return { a: m[0], ty: m[5] }; };
  const sec = document.querySelector(".approach"), stage = document.querySelector(".approach-stage");
  const fill = document.querySelector(".approach-fill");
  const discs = [...document.querySelectorAll(".approach-markers .approach-marker-fill")].map((d) => num(getComputedStyle(d).opacity));
  const titles = [...document.querySelectorAll(".approach-step-title")].map((t) => ({ o: num(getComputedStyle(t).opacity), y: mat(t).ty, r: t.getBoundingClientRect() }));
  const descs = [...document.querySelectorAll(".approach-step-desc")].map((t) => num(getComputedStyle(t).opacity));
  const body = document.querySelector(".approach-body");
  return {
    scrollY: window.scrollY, vh: window.innerHeight,
    secTop: sec.offsetTop, secH: sec.offsetHeight, stageH: stage.offsetHeight, docH: document.documentElement.scrollHeight,
    stageTop: Math.round(stage.getBoundingClientRect().top), stagePos: getComputedStyle(stage).position,
    contentBottom: Math.round(Math.max(...[...body.querySelectorAll(".approach-step-desc")].map((d) => d.getBoundingClientRect().bottom)) - stage.getBoundingClientRect().top),
    fill: fill ? mat(fill).a : null, trackShown: getComputedStyle(document.querySelector(".approach-track")).display !== "none",
    heading: num(getComputedStyle(document.querySelector(".approach-heading")).opacity),
    discs, titles: titles.map((t) => ({ o: +t.o.toFixed(2), y: +t.y.toFixed(1), x: Math.round(t.r.x), w: Math.round(t.r.width), h: Math.round(t.r.height) })), descs: descs.map((d) => +d.toFixed(2)),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
};

async function open(ctxOpts) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { browser, page, errors };
}
const go = async (page, y, wait = 700) => { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(wait); return page.evaluate(probe); };

/* ---------- desktop: one screen, the timed sequence ---------- */
for (const [w, h] of [[1440, 900], [1280, 720]]) {
  const { browser, page, errors } = await open({ viewport: { width: w, height: h } });
  const base = await page.evaluate(probe);
  const { secTop, vh } = base;
  console.log(`${w}x${h}: section top ${secTop}, height ${base.secH}px (= ${(base.secH / vh).toFixed(2)}vh), doc ${base.docH}`);
  ok(`${w}x${h}: section is exactly one screen`, base.secH === vh && base.stageH === vh, `${base.secH} vs ${vh}`);
  ok(`${w}x${h}: not pinned (in flow)`, base.stagePos === "static", base.stagePos);
  const nextTop = await page.evaluate(() => { const a = document.querySelector(".approach"); const next = a.nextElementSibling; return next ? next.offsetTop : document.documentElement.scrollHeight; });
  ok(`${w}x${h}: whatever follows starts exactly at the section end`, nextTop === secTop + base.secH, `${nextTop} vs ${secTop + base.secH}`);

  // Before entering: nothing revealed. Sample title boxes for the layout-shift check.
  let s = await go(page, secTop - 1400, 400);
  const boxesBefore = s.titles.map((t) => [t.x, t.w, t.h].join("x"));
  ok(`${w}x${h}: hidden before entrance`, s.heading === 0 && s.titles.every((t) => t.o === 0) && s.fill < 0.01, `heading ${s.heading} fill ${s.fill}`);

  // Land on the section. Shortly after: entrance done, 01 lit, line not yet moving.
  await page.evaluate((v) => window.scrollTo(0, v), secTop);
  await page.waitForTimeout(Math.min(550, FILL_DELAY * 1000 - 50));
  s = await page.evaluate(probe);
  ok(`${w}x${h}: sits at the top of the screen`, s.stageTop === 0, `top ${s.stageTop}`);
  // Sampled just before the line starts; the heading's last frame may still be landing.
  ok(`${w}x${h}: entrance: heading, step 01 current, 02-04 off`, s.heading >= 0.98 && s.discs[0] === 1 && s.discs.slice(1).every((d) => d === 0), JSON.stringify({ heading: s.heading, discs: s.discs }));
  ok(`${w}x${h}: entrance: line still at zero (beat before it moves)`, s.fill < 0.02, `fill ${s.fill}`);
  await page.screenshot({ path: OUT + `approach-${w}-entered.png` });

  // Watch the sequence: sample every 50ms until it should be complete.
  const order = []; let nonMonotonic = 0, lastFill = 0; const seen = new Set([0]); order.push(1);
  const t0 = Date.now();
  while (Date.now() - t0 < SEQUENCE_MS + 400) {
    const r = await page.evaluate(probe);
    if (r.fill < lastFill - 0.01) nonMonotonic++;
    lastFill = r.fill;
    r.discs.forEach((d, i) => { if (d > 0.5 && !seen.has(i)) { seen.add(i); order.push(i + 1); } });
    if (Date.now() - t0 > SEQUENCE_MS * 0.55 && Date.now() - t0 < SEQUENCE_MS * 0.55 + 60) await page.screenshot({ path: OUT + `approach-${w}-mid.png` });
    await page.waitForTimeout(50);
  }
  ok(`${w}x${h}: steps light in order 1,2,3,4 as the line passes`, order.join(",") === "1,2,3,4", order.join(","));
  ok(`${w}x${h}: line never runs backwards`, nonMonotonic === 0, `${nonMonotonic} reversals`);

  await page.waitForTimeout(600);
  s = await page.evaluate(probe);
  ok(`${w}x${h}: finished: line complete, all four lit, 04 current`, s.fill > 0.995 && s.discs.every((d) => d === 1) && s.titles[3].o === 1 && s.descs[3] === 1, JSON.stringify({ fill: +s.fill.toFixed(3), discs: s.discs, t4: s.titles[3].o }));
  ok(`${w}x${h}: emphasis: 04 at 1, earlier dimmed but readable`, s.titles.slice(0, 3).every((t) => t.o > 0.6 && t.o < 1), JSON.stringify(s.titles.map((t) => t.o)));
  ok(`${w}x${h}: no layout shift: title boxes identical hidden vs revealed`, s.titles.map((t) => [t.x, t.w, t.h].join("x")).join("|") === boxesBefore.join("|"), "");
  ok(`${w}x${h}: revealed text sits at y=0 (no residual offset)`, s.titles.every((t) => t.y === 0), JSON.stringify(s.titles.map((t) => t.y)));
  ok(`${w}x${h}: everything inside the screen`, s.contentBottom <= vh, `content bottom ${s.contentBottom} of ${vh}`);
  await page.screenshot({ path: OUT + `approach-${w}-complete.png` });

  // Leave and come back: the finished state holds (played once).
  await go(page, 0, 500);
  s = await go(page, secTop, 400);
  ok(`${w}x${h}: returning: finished state held, nothing replays`, s.fill > 0.995 && s.discs.every((d) => d === 1), JSON.stringify({ fill: +s.fill.toFixed(3), discs: s.discs }));

  ok(`${w}x${h}: no horizontal overflow`, s.overflow === 0, `${s.overflow}px`);
  ok(`${w}x${h}: no console errors`, errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* ---------- short viewport 1280x650: flowing, four across ---------- */
{
  const { browser, page, errors } = await open({ viewport: { width: 1280, height: 650 } });
  const b = await page.evaluate(probe);
  const s = await go(page, b.secTop - 100, 1200);
  ok("short viewport: flowing (grows to content)", s.stagePos === "static" && s.secH < 1300, `${s.stagePos} ${s.secH}px`);
  ok("short viewport: all four steps readable", s.titles.every((t) => t.o === 1) && s.discs.every((d) => d === 1), JSON.stringify(s.titles.map((t) => t.o)));
  await page.screenshot({ path: OUT + "approach-short.png" });
  ok("short viewport: no console errors", errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* ---------- mobile 390x844: flowing vertical timeline ---------- */
{
  const { browser, page, errors } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const b = await page.evaluate(probe);
  let s = await go(page, b.secTop - 200, 900);
  ok("mobile: vertical layout (track hidden)", s.stagePos === "static" && !s.trackShown, `${s.stagePos} trackShown=${s.trackShown}`);
  await page.screenshot({ path: OUT + "approach-mobile-top.png" });
  s = await go(page, b.secTop + b.secH - 844, 1400);
  ok("mobile: every step revealed once scrolled through", s.titles.every((t) => t.o === 1) && s.descs.every((d) => d === 1), JSON.stringify(s.titles.map((t) => t.o)));
  ok("mobile: no horizontal overflow", s.overflow === 0, `${s.overflow}px`);
  await page.screenshot({ path: OUT + "approach-mobile-end.png" });
  ok("mobile: no console errors", errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* ---------- reduced motion 1440x900 ---------- */
{
  const { browser, page } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const b = await page.evaluate(probe);
  const s = await go(page, b.secTop - 50, 900);
  ok("reduced motion: static, all four shown, fill complete", s.stagePos === "static" && s.titles.every((t) => t.o === 1) && s.discs.every((d) => d === 1) && s.fill === 1, JSON.stringify({ pos: s.stagePos, fill: s.fill }));
  await page.screenshot({ path: OUT + "approach-reduced.png" });
  await browser.close();
}

console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
