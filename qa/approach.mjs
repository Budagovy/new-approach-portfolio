/* QA gate for the "My approach" section: scroll-driven and held.

   - the section is held (stuck under the header) for exactly the hold's
     distance, then releases with the next section meeting it, no gap;
   - 01 lights with the entrance; 02, 03, 04 light in order only as scroll
     advances, never on a clock (sit still and nothing moves);
   - the line tracks the scroll position;
   - a revealed milestone stays revealed when scrolling back up;
   - 04 has landed before the hold releases, and the projects have not
     started their own reveal before 04;
   - revealing copy shifts no layout;
   - the flowing narrow and reduced-motion layouts.

   Its rhythm (paddings, gaps) is gated in qa/sections.mjs. Exits non-zero
   on failure. Screenshots land in qa/frames/.

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
const { holdVh: HOLD_VH, fillStart: FILL_START, fillEnd: FILL_END, latch: LATCH } = APPROACH;

const fails = [];
const ok = (name, pass, detail = "") => { console.log(`${pass ? "PASS" : "FAIL"}  ${name.padEnd(64)} ${detail}`); if (!pass) fails.push(name); };

/* Everything the section exposes through computed style. */
const probe = () => {
  const num = (s) => parseFloat(s);
  const mat = (el) => { const t = getComputedStyle(el).transform; if (t === "none") return { a: 1, ty: 0 }; const m = t.match(/matrix\(([^)]+)\)/)[1].split(",").map(Number); return { a: m[0], ty: m[5] }; };
  const panel = document.querySelector(".approach-panel"), stage = document.querySelector(".approach-stage"), hold = document.querySelector(".approach-hold");
  const fill = document.querySelector(".approach-fill");
  const discs = [...document.querySelectorAll(".approach-markers .approach-marker-fill")].map((d) => num(getComputedStyle(d).opacity));
  const titles = [...document.querySelectorAll(".approach-step-title")].map((t) => ({ o: num(getComputedStyle(t).opacity), y: mat(t).ty, r: t.getBoundingClientRect() }));
  const descs = [...document.querySelectorAll(".approach-step-desc")].map((t) => num(getComputedStyle(t).opacity));
  const next = document.querySelector(".approach").nextElementSibling;
  return {
    scrollY: window.scrollY, vh: window.innerHeight,
    /* The panel is never transformed, so its rect plus the scroll position is its document top. */
    panelTop: Math.round(panel.getBoundingClientRect().top + window.scrollY), panelBorder: panel.clientTop, panelH: panel.offsetHeight, stageH: stage.offsetHeight, holdH: hold.offsetHeight,
    headerH: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")),
    stageTop: Math.round(stage.getBoundingClientRect().top), stageBottom: Math.round(stage.getBoundingClientRect().bottom), stagePos: getComputedStyle(stage).position,
    nextTop: next ? Math.round(next.getBoundingClientRect().top) : null,
    fill: fill ? mat(fill).a : null, trackShown: getComputedStyle(document.querySelector(".approach-track")).display !== "none",
    heading: num(getComputedStyle(document.querySelector(".approach-heading")).opacity),
    discs, titles: titles.map((t) => ({ o: +t.o.toFixed(2), y: +t.y.toFixed(1), x: Math.round(t.r.x), w: Math.round(t.r.width), h: Math.round(t.r.height) })), descs: descs.map((d) => +d.toFixed(2)),
    cards: [...document.querySelectorAll(".project-item")].map((li) => +(+getComputedStyle(li).opacity).toFixed(2)),
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
  await page.waitForTimeout(800);
  return { browser, page, errors };
}
const go = async (page, y, wait = 700) => { await page.evaluate((v) => window.scrollTo(0, v), Math.round(y)); await page.waitForTimeout(wait); return page.evaluate(probe); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ---------- desktop: the held, scroll-driven sequence ---------- */
for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  const { browser, page, errors } = await open({ viewport: { width: w, height: h } });
  const tag = `${w}x${h}:`;
  const base = await page.evaluate(probe);
  const { vh, headerH, holdH } = base;
  const holdStart = base.panelTop + base.panelBorder - headerH;   // scrollY at which the stage sticks (it starts below the panel's top rule)
  const at = (p) => holdStart + p * holdH;             // scrollY for progress p through the hold
  const expectedFill = (y) => clamp01((clamp01((y - holdStart) / holdH) - FILL_START) / (FILL_END - FILL_START));
  console.log(`${tag} panel top ${base.panelTop}, stage ${base.stageH}px, hold ${holdH}px (${(holdH / vh).toFixed(2)} screens), panel ${base.panelH}px`);

  ok(`${tag} hold is ${HOLD_VH} screens; panel = content + hold`, Math.abs(holdH - HOLD_VH * vh) <= 1 && base.panelH === base.stageH + holdH + base.panelBorder, `hold ${holdH}, panel ${base.panelH} vs ${base.stageH + holdH}`);
  ok(`${tag} sticky under the header`, base.stagePos === "sticky", base.stagePos);

  // Before entering: nothing revealed. Sample title boxes for the layout-shift check.
  let s = await go(page, holdStart - 1500, 400);
  const boxesBefore = s.titles.map((t) => [t.x, t.w, t.h].join("x"));
  ok(`${tag} hidden before entrance`, s.heading === 0 && s.titles.every((t) => t.o === 0) && s.fill < 0.01, `heading ${s.heading} fill ${s.fill}`);

  // Entrance, before the hold: heading in, 01 lit, 02-04 off.
  s = await go(page, holdStart - vh * 0.35, 1300);
  ok(`${tag} entrance: heading, step 01 lit, 02-04 off, line at zero`, s.heading >= 0.98 && s.discs[0] === 1 && s.titles[0].o === 1 && s.discs.slice(1).every((d) => d === 0) && s.fill < 0.01, JSON.stringify({ heading: s.heading, discs: s.discs, fill: s.fill }));
  await page.screenshot({ path: `${OUT}approach-${w}-entered.png` });

  // Start of the hold. Then sit still: nothing may advance on a clock.
  s = await go(page, at(0), 600);
  ok(`${tag} held: stage stuck exactly under the header`, s.stageTop === Math.round(headerH), `top ${s.stageTop} vs ${headerH}`);
  await page.waitForTimeout(3500);
  s = await page.evaluate(probe);
  ok(`${tag} not time-based: 3.5s without scrolling, still only 01`, s.discs.join(",") === "1,0,0,0" && s.fill < 0.01, JSON.stringify({ discs: s.discs, fill: s.fill }));

  // Slow scroll through the hold, 30px at a time.
  const order = [1]; const seen = new Set([0]); let reversals = 0, lastFill = 0, maxLag = 0, unstuck = 0, cardsEarly = false, first04 = null, wentOff = 0; let prevDiscs = [1, 0, 0, 0];
  for (let y = at(0); y <= at(1); y += 30) {
    await page.evaluate((v) => window.scrollTo(0, v), Math.round(y));
    await page.waitForTimeout(50);
    const r = await page.evaluate(probe);
    if (r.fill < lastFill - 0.01) reversals++;
    lastFill = r.fill;
    maxLag = Math.max(maxLag, Math.abs(r.fill - expectedFill(r.scrollY)));
    if (r.stageTop !== Math.round(headerH)) unstuck++;
    /* A milestone counts as revealed from the first frame it starts to light: its fade
       is 250ms of clock, which a scripted scroll outruns, so "fully lit" would measure
       the script's speed, not the design. */
    r.discs.forEach((d, i) => { if (d > 0.02 && !seen.has(i)) { seen.add(i); order.push(i + 1); if (i === 3) first04 = (r.scrollY - holdStart) / holdH; } if (d < prevDiscs[i] - 0.02) wentOff++; });
    prevDiscs = r.discs;
    if (!seen.has(3) && r.cards.some((c) => c > 0)) cardsEarly = true;
  }
  ok(`${tag} milestones reveal in order 01,02,03,04 as scroll advances`, order.join(",") === "1,2,3,4", order.join(","));
  ok(`${tag} the line never runs backwards on the way down`, reversals === 0, `${reversals} reversals`);
  ok(`${tag} the line tracks the scroll (max lag while moving < 0.12)`, maxLag < 0.12, `max |fill - target| = ${maxLag.toFixed(3)}`);
  ok(`${tag} held for the whole hold (stage never left the header)`, unstuck === 0, `${unstuck} samples unstuck`);
  ok(`${tag} 04 starts lighting as the line arrives (~${FILL_END}), well before release`, first04 !== null && first04 >= FILL_END - 0.02 && first04 < FILL_END + 0.08, `04 starts at ${first04 === null ? "never" : first04.toFixed(2)} of the hold`);
  ok(`${tag} no milestone ever switches back off on the way down`, wentOff === 0, `${wentOff} drops`);
  ok(`${tag} projects do not start revealing before 04`, !cardsEarly, cardsEarly ? "a card was already fading in" : "");

  s = await go(page, at(1), 900);
  ok(`${tag} end of hold: line complete, all four lit, 04 current and readable`, s.fill > 0.995 && s.discs.every((d) => d === 1) && s.titles[3].o === 1 && s.descs[3] === 1, JSON.stringify({ fill: +s.fill.toFixed(3), discs: s.discs, t4: s.titles[3].o }));
  ok(`${tag} each milestone stays visible (earlier ones dimmed, not hidden)`, s.titles.slice(0, 3).every((t) => t.o > 0.6) && s.descs.slice(0, 3).every((d) => d > 0.5), JSON.stringify({ titles: s.titles.map((t) => t.o), descs: s.descs }));
  ok(`${tag} no layout shift: title boxes identical hidden vs revealed`, s.titles.map((t) => [t.x, t.w, t.h].join("x")).join("|") === boxesBefore.join("|"), "");
  ok(`${tag} revealed text sits at y=0 (no residual offset)`, s.titles.every((t) => t.y === 0), JSON.stringify(s.titles.map((t) => t.y)));
  ok(`${tag} release: the next section meets the held one, no gap, no jump`, s.stageTop === Math.round(headerH) && Math.abs(s.nextTop - s.stageBottom) <= 1, `stage ${s.stageTop}..${s.stageBottom}, next at ${s.nextTop}`);
  await page.screenshot({ path: `${OUT}approach-${w}-complete.png` });

  s = await go(page, at(1) + 200, 600);
  ok(`${tag} released: the section scrolls on with the page (200px past)`, s.stageTop === Math.round(headerH) - 200 && Math.abs(s.nextTop - s.stageBottom) <= 1, `stage top ${s.stageTop}, next ${s.nextTop} vs ${s.stageBottom}`);

  // Back up into the hold: what has been revealed stays revealed.
  s = await go(page, at(0.1), 900);
  if (LATCH) ok(`${tag} scrolling back up: milestones stay revealed`, s.discs.every((d) => d === 1) && s.titles.every((t) => t.o > 0.6) && s.fill > 0.995, JSON.stringify({ discs: s.discs, fill: +s.fill.toFixed(3) }));
  else ok(`${tag} scrolling back up: the sequence rewinds with the scroll`, s.discs[3] === 0 && Math.abs(s.fill - expectedFill(s.scrollY)) < 0.02, JSON.stringify({ discs: s.discs, fill: +s.fill.toFixed(3) }));

  ok(`${tag} no horizontal overflow`, s.overflow === 0, `${s.overflow}px`);
  ok(`${tag} no console errors`, errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* ---------- a fresh page, fast: jump straight past the hold ---------- */
{
  const { browser, page } = await open({ viewport: { width: 1440, height: 900 } });
  const b = await page.evaluate(probe);
  const s = await go(page, b.panelTop + b.panelBorder - b.headerH + b.holdH + 50, 1200);
  ok("fast jump past the hold: every step lit, no stuck states", s.discs.every((d) => d === 1) && s.titles.every((t) => t.o > 0.6) && s.fill > 0.995, JSON.stringify({ discs: s.discs, titles: s.titles.map((t) => t.o) }));
  await browser.close();
}

/* ---------- mid-hold screenshot, for the eye ---------- */
{
  const { browser, page } = await open({ viewport: { width: 1440, height: 900 } });
  const b = await page.evaluate(probe);
  await go(page, b.panelTop - b.headerH - 300, 1200);
  await go(page, b.panelTop - b.headerH + b.holdH * 0.5, 900);
  await page.screenshot({ path: `${OUT}approach-1440-mid.png` });
  await browser.close();
}

/* ---------- mobile 390x844: flowing vertical timeline, no hold ---------- */
{
  const { browser, page, errors } = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const b = await page.evaluate(probe);
  let s = await go(page, b.panelTop - 200, 900);
  ok("mobile: no hold, vertical layout (track hidden)", s.stagePos === "static" && s.holdH === 0 && !s.trackShown, `${s.stagePos} hold ${s.holdH} trackShown=${s.trackShown}`);
  await page.screenshot({ path: OUT + "approach-mobile-top.png" });
  s = await go(page, b.panelTop + b.panelH - 844, 1400);
  ok("mobile: every step revealed once scrolled through", s.titles.every((t) => t.o === 1) && s.descs.every((d) => d === 1), JSON.stringify(s.titles.map((t) => t.o)));
  ok("mobile: no horizontal overflow", s.overflow === 0, `${s.overflow}px`);
  await page.screenshot({ path: OUT + "approach-mobile-end.png" });
  ok("mobile: no console errors", errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* ---------- reduced motion 1440x900: no hold, everything shown ---------- */
{
  const { browser, page } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const b = await page.evaluate(probe);
  const s = await go(page, b.panelTop - 50, 900);
  ok("reduced motion: no hold, all four shown, line complete", s.stagePos === "static" && s.holdH === 0 && s.titles.every((t) => t.o === 1) && s.discs.every((d) => d === 1) && s.fill === 1, JSON.stringify({ pos: s.stagePos, hold: s.holdH, fill: s.fill }));
  await page.screenshot({ path: OUT + "approach-reduced.png" });
  await browser.close();
}

console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
