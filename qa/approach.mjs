/* QA gate for the "My approach" section: the pinned scroll choreography,
   its reverse, direction changes mid-transition, layout stability, and the
   unpinned narrow / short / reduced-motion layouts. Exits non-zero on
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
const { fillStart: FILL_START, fillEnd: FILL_END, pinVh: PIN_VH } = APPROACH;

const fails = [];
const ok = (name, pass, detail = "") => { console.log(`${pass ? "PASS" : "FAIL"}  ${name.padEnd(52)} ${detail}`); if (!pass) fails.push(name); };

/* Everything the section exposes through computed style. */
const probe = () => {
  const num = (s) => parseFloat(s);
  const mat = (el) => { const t = getComputedStyle(el).transform; if (t === "none") return { a: 1, ty: 0 }; const m = t.match(/matrix\(([^)]+)\)/)[1].split(",").map(Number); return { a: m[0], ty: m[5] }; };
  const sec = document.querySelector(".approach"), stage = document.querySelector(".approach-stage");
  const fill = document.querySelector(".approach-fill");
  const discs = [...document.querySelectorAll(".approach-markers .approach-marker-fill")].map((d) => num(getComputedStyle(d).opacity));
  const titles = [...document.querySelectorAll(".approach-step-title")].map((t) => ({ o: num(getComputedStyle(t).opacity), y: mat(t).ty, r: t.getBoundingClientRect() }));
  const descs = [...document.querySelectorAll(".approach-step-desc")].map((t) => num(getComputedStyle(t).opacity));
  return {
    scrollY: window.scrollY, vh: window.innerHeight,
    secTop: sec.offsetTop, secH: sec.offsetHeight, docH: document.documentElement.scrollHeight,
    stageTop: Math.round(stage.getBoundingClientRect().top), stagePos: getComputedStyle(stage).position,
    fill: fill ? mat(fill).a : null, trackShown: getComputedStyle(document.querySelector(".approach-track")).display !== "none",
    heading: num(getComputedStyle(document.querySelector(".approach-heading")).opacity),
    discs, titles: titles.map((t) => ({ o: +t.o.toFixed(2), y: +t.y.toFixed(1), x: Math.round(t.r.x), w: Math.round(t.r.width), h: Math.round(t.r.height) })), descs: descs.map((d) => +d.toFixed(2)),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
};

const expectedFill = (scrollY, secTop, vh) => { const p = Math.max(0, Math.min(1, (scrollY - secTop) / ((PIN_VH - 1) * vh))); return Math.max(0, Math.min(1, (p - FILL_START) / (FILL_END - FILL_START))); };
const toP = (frac, secTop, vh) => Math.round(secTop + frac * (PIN_VH - 1) * vh);

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

/* ---------- desktop 1440x900: the pinned choreography ---------- */
{
  const { browser, page, errors } = await open({ viewport: { width: 1440, height: 900 } });
  const base = await page.evaluate(probe);
  const { secTop, vh } = base;
  console.log(`section top ${secTop}, track ${base.secH}px (= ${(base.secH / vh).toFixed(2)}vh), doc ${base.docH}`);
  const nextTop = await page.evaluate(() => { const a = document.querySelector(".approach"); const next = a.nextElementSibling; return next ? next.offsetTop : document.documentElement.scrollHeight; });
  ok("whatever follows starts exactly at the track end (no gap)", nextTop === secTop + base.secH, `${nextTop} vs ${secTop + base.secH}`);

  // Before entering: nothing revealed. Sample title boxes for the layout-shift check.
  let s = await go(page, secTop - 1400, 400);
  const boxesBefore = s.titles.map((t) => [t.x, t.w, t.h].join("x"));
  ok("hidden before entrance", s.heading === 0 && s.titles.every((t) => t.o === 0), `heading ${s.heading}`);

  // Entering: section 55% up the viewport, before the pin.
  s = await go(page, secTop - vh * 0.55, 1200);
  await page.screenshot({ path: OUT + "approach-entering.png" });
  ok("entrance: heading revealed, step 01 current, 02-04 off", s.heading === 1 && s.titles[0].o === 1 && s.discs[0] === 1 && s.discs.slice(1).every((d) => d === 0), JSON.stringify({ heading: s.heading, discs: s.discs }));
  ok("entrance: fill still at zero", s.fill < 0.01, `fill ${s.fill}`);

  // Pin start.
  s = await go(page, secTop, 700);
  ok("pinned at track start (stage top = 0, sticky)", s.stageTop === 0 && s.stagePos === "sticky", `top ${s.stageTop} ${s.stagePos}`);
  await page.screenshot({ path: OUT + "approach-pinned-01.png" });

  // Slow scroll through: 40px steps, sampling every step.
  const order = []; let maxLag = 0, nonMonotonic = 0, lastFill = 0; const seen = new Set();
  for (let y = secTop; y <= toP(1, secTop, vh) + 200; y += 40) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(50);
    const r = await page.evaluate(probe);
    if (r.fill < lastFill - 0.01) nonMonotonic++;
    lastFill = r.fill;
    maxLag = Math.max(maxLag, Math.abs(r.fill - expectedFill(y, secTop, vh)));
    r.discs.forEach((d, i) => { if (d > 0.5 && !seen.has(i)) { seen.add(i); order.push(i + 1); } });
  }
  ok("slow scroll: steps light in order 1,2,3,4", order.join(",") === "1,2,3,4", order.join(","));
  ok("slow scroll: fill never runs backwards", nonMonotonic === 0, `${nonMonotonic} reversals`);
  ok("slow scroll: fill tracks scroll (max lag while moving < 0.12)", maxLag < 0.12, `max |fill - target| = ${maxLag.toFixed(3)}`);

  // Settle: after stopping, fill must land on the scroll position.
  s = await go(page, toP(0.5, secTop, vh), 350);
  const target = expectedFill(s.scrollY, secTop, vh);
  ok("stopped: fill settles on target within 350ms (< 0.01)", Math.abs(s.fill - target) < 0.01, `fill ${s.fill.toFixed(3)} target ${target.toFixed(3)}`);
  // The state is set the instant a threshold is crossed; the reveals that
  // dress it take ~0.45s (reveal + stagger), so give those time to finish.
  await page.waitForTimeout(500); s = await page.evaluate(probe);
  ok("mid-track: fill sits between markers 02 and 03 -> 01,02 done/current, 03,04 off", s.discs[0] === 1 && s.discs[1] === 1 && s.discs[2] === 0 && s.discs[3] === 0, JSON.stringify(s.discs));
  ok("emphasis: current step at 1, earlier dimmed but readable, later hidden", s.titles[1].o === 1 && s.titles[0].o > 0.6 && s.titles[0].o < 1 && s.titles[2].o === 0, JSON.stringify(s.titles.map((t) => t.o)));
  ok("no layout shift: title boxes identical hidden vs revealed", s.titles.map((t) => [t.x, t.w, t.h].join("x")).join("|") === boxesBefore.join("|"), "");
  ok("revealed text sits at y=0 (no residual offset)", s.titles[0].y === 0 && s.titles[1].y === 0, JSON.stringify(s.titles.map((t) => t.y)));
  await page.screenshot({ path: OUT + "approach-mid.png" });

  // Step 04 readable before release.
  s = await go(page, toP(0.9, secTop, vh), 700);
  ok("at p=0.9: all four lit, 04 current, still pinned", s.discs.every((d) => d === 1) && s.titles[3].o === 1 && s.descs[3] === 1 && s.stageTop === 0, JSON.stringify({ discs: s.discs, t4: s.titles[3].o, stageTop: s.stageTop }));
  ok("at p=0.9: fill complete", s.fill > 0.995, `fill ${s.fill}`);
  await page.screenshot({ path: OUT + "approach-complete.png" });

  // Release. Nothing follows the section yet, so stand in a 1000px "next
  // section" to be able to scroll past the track end.
  await page.evaluate(() => { const d = document.createElement("div"); d.id = "stand-in"; d.style.height = "1000px"; document.querySelector("main").appendChild(d); });
  s = await go(page, toP(1, secTop, vh) + 300, 500);
  ok("released: stage scrolls away after the track (top = -300)", s.stageTop === -300, `top ${s.stageTop}`);
  s = await go(page, toP(1, secTop, vh) - 1, 300);
  ok("1px before the track end the stage is still pinned (no jump at handoff)", s.stageTop === 0, `top ${s.stageTop}`);
  await page.evaluate(() => document.getElementById("stand-in").remove());

  // Fast scroll: jump from top to the end in one go.
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(400);
  s = await go(page, toP(1, secTop, vh), 900);
  ok("fast jump to end: every step lit, no stuck states", s.discs.every((d) => d === 1) && s.titles.every((t) => t.o > 0.5) && s.titles[3].o === 1, JSON.stringify({ discs: s.discs, titles: s.titles.map((t) => t.o) }));

  // Reverse: back from step 03 to step 02, then to the start.
  await go(page, toP(0.62, secTop, vh), 700);
  s = await go(page, toP(0.40, secTop, vh), 700);
  ok("reverse to p=0.40: 03 back to off, 02 current, fill retracted", s.discs[2] === 0 && s.titles[2].o === 0 && s.discs[1] === 1 && s.titles[1].o === 1 && Math.abs(s.fill - expectedFill(s.scrollY, secTop, vh)) < 0.01, JSON.stringify({ discs: s.discs, fill: +s.fill.toFixed(3), target: +expectedFill(s.scrollY, secTop, vh).toFixed(3) }));
  s = await go(page, toP(0.02, secTop, vh), 700);
  ok("reverse to start: only 01 lit", s.discs.join(",") === "1,0,0,0" && s.titles[0].o === 1 && s.titles[1].o === 0, JSON.stringify(s.discs));

  // Direction change mid-transition: cross threshold 02 then bounce back 120ms later.
  const t2 = FILL_START + (FILL_END - FILL_START) / 3;
  await page.evaluate((v) => window.scrollTo(0, v), toP(t2 + 0.015, secTop, vh)); await page.waitForTimeout(120);
  await page.evaluate((v) => window.scrollTo(0, v), toP(t2 - 0.03, secTop, vh)); await page.waitForTimeout(800);
  s = await page.evaluate(probe);
  ok("bounce across threshold 02 mid-animation: clean 'off', nothing queued", s.discs[1] === 0 && s.titles[1].o === 0 && s.titles[1].y !== 0 || (s.discs[1] === 0 && s.titles[1].o === 0), JSON.stringify({ disc2: s.discs[1], title2: s.titles[1] }));

  ok("desktop: no horizontal overflow", s.overflow === 0, `${s.overflow}px`);
  ok("desktop: no console errors", errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* ---------- short viewport 1280x650: unpinned, four across ---------- */
{
  const { browser, page, errors } = await open({ viewport: { width: 1280, height: 650 } });
  const b = await page.evaluate(probe);
  const s = await go(page, b.secTop - 100, 1200);
  ok("short viewport: unpinned (static), track collapsed to content", s.stagePos === "static" && s.secH < 1300, `${s.stagePos} ${s.secH}px`);
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
  ok("mobile: unpinned, vertical layout (track hidden)", s.stagePos === "static" && !s.trackShown, `${s.stagePos} trackShown=${s.trackShown}`);
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
