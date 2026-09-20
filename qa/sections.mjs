/* QA gate for the section rhythm, which is pleurat.com's as authored:
   content-height sections with --sp = clamp(96px, 12vh, 152px) above and
   below (clamp(64px, 8vh, 96px) up to 961px), --sp-head =
   clamp(46px, 6vh, 78px) between head and body (clamp(32px, 4.6vh, 48px)
   up to 961px), and a hero of header + 120px, copy, head gap, strip, no
   bottom padding. Also: the approach lands directly under the hero when
   the splash pin releases and is not on screen before the push is over,
   and sections follow each other with no gaps. Exits non-zero on failure.
   Screenshots land in qa/frames/.

   Run with the dev server up:  npm run qa:sections
*/
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { HERO } from "../src/lib/motion.ts";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const URL_ = process.env.QA_URL || "http://localhost:3220";
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });

const clamp = (lo, v, hi) => Math.max(lo, Math.min(hi, v));
const sp = (w, h) => (w <= 961 ? clamp(64, 0.08 * h, 96) : clamp(96, 0.12 * h, 152));
const spHead = (w, h) => (w <= 961 ? clamp(32, 0.046 * h, 48) : clamp(46, 0.06 * h, 78));

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(64)} ${d}`); if (!p) fails.push(n); };
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol;

const probe = () => {
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1) }; };
  /* Layout box relative to a containing element: offsets, so entrance
     transforms (the heading's 14px rise, the splash's scale) don't move it. */
  const lay = (sel, withinSel) => { const el = document.querySelector(sel), within = document.querySelector(withinSel); let y = 0, n = el; while (n && n !== within) { y += n.offsetTop; n = n.offsetParent; } return { top: y, bottom: y + el.offsetHeight, h: el.offsetHeight }; };
  const pad = (sel) => { const cs = getComputedStyle(document.querySelector(sel)); return { t: parseFloat(cs.paddingTop), b: parseFloat(cs.paddingBottom) }; };
  const track = document.querySelector(".splash-track");
  return {
    vh: innerHeight, trackTop: track.offsetTop, trackH: track.offsetHeight,
    stage: box(".splash-stage"), hero: box(".hero"), heroBody: box(".hero-body"), strip: box(".hero-strip"), header: box(".site-header"),
    approach: box(".approach"), approachPad: pad(".approach-body"), approachH: document.querySelector(".approach-body").offsetHeight,
    heading: lay(".approach-heading", ".approach-body"), steps: lay(".approach-steps", ".approach-body"), copy: lay(".approach-copy", ".approach-body"), approachLabel: lay(".approach-label", ".approach-body"),
    heroLayH: document.querySelector(".hero").offsetHeight, stageLayH: document.querySelector(".splash-stage").offsetHeight,
    projects: box(".projects-body"), projectsPad: pad(".projects-body"), grid: box(".projects-grid"), card: document.querySelector(".project-media").getBoundingClientRect().width,
    stageScale: (() => { const t = getComputedStyle(document.querySelector(".splash-hero-stage")).transform; return t === "none" ? 1 : +t.match(/matrix\(([^,]+)/)[1]; })(),
    docH: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth,
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const [w, h] of [[1440, 900], [1366, 768], [1920, 1080], [1024, 768]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const tag = `${w}x${h}:`, SP = sp(w, h), HEAD = spHead(w, h);

  let s = await page.evaluate(probe);
  const pinEnd = s.trackTop + s.trackH - s.vh;

  // The moment the push is over: the approach must not be on screen yet.
  await page.evaluate((y) => scrollTo(0, y), Math.round(pinEnd * HERO.zoomEnd));
  await page.waitForTimeout(1500);
  s = await page.evaluate(probe);
  ok(`${tag} approach still off screen when the push ends`, s.approach.top >= s.vh - 1, `approach top ${s.approach.top} of ${s.vh}`);

  // Pin release: the hero block is the page, the approach directly under it.
  await page.evaluate((y) => scrollTo(0, y), pinEnd);
  await page.waitForTimeout(1800);
  s = await page.evaluate(probe);
  ok(`${tag} hero at the top, native scale, shorter than the screen`, s.hero.top === 0 && near(s.stageScale, 1, 0.01) && s.hero.h < s.vh, `hero ${s.hero.h}px of ${s.vh} (${(s.hero.h / s.vh).toFixed(2)} screens)`);
  ok(`${tag} hero copy starts header + 120px down`, near(s.heroBody.top, s.header.bottom + 120), `copy top ${s.heroBody.top}, header ${s.header.bottom}`);
  ok(`${tag} strip a head gap (${HEAD.toFixed(0)}px) under the copy, closing the hero`, near(s.strip.top - s.heroBody.bottom, HEAD) && near(s.strip.bottom, s.hero.bottom), `gap ${(s.strip.top - s.heroBody.bottom).toFixed(1)}, strip bottom ${s.strip.bottom} vs hero ${s.hero.bottom}`);
  ok(`${tag} approach sits directly under the hero at release`, near(s.approach.top, s.hero.bottom, 1), `approach top ${s.approach.top} vs hero bottom ${s.hero.bottom}`);
  await page.screenshot({ path: `${OUT}sections-${w}-release.png` });

  ok(`${tag} approach: ${SP.toFixed(0)}px above and below its content`, near(s.approachPad.t, SP) && near(s.approachPad.b, SP) && near(s.heading.top, SP, 2) && near(s.approachH - s.copy.bottom, SP + 1, 2), `pad ${s.approachPad.t}/${s.approachPad.b}, heading ${s.heading.top} down, ${s.approachH - s.copy.bottom} below`);
  ok(`${tag} approach: head gap between heading and timeline`, near(s.steps.top - s.heading.bottom, HEAD), `${(s.steps.top - s.heading.bottom).toFixed(1)}`);
  ok(`${tag} approach: label in the corner, clear of the heading`, s.approachLabel.bottom < s.heading.top && s.approachLabel.top < 30, `label ${s.approachLabel.top}..${s.approachLabel.bottom}`);
  ok(`${tag} projects follow the approach with no gap`, near(s.projects.top, s.approach.bottom, 0.6), `${s.projects.top} vs ${s.approach.bottom}`);
  ok(`${tag} projects: ${SP.toFixed(0)}px above and below the grid`, near(s.projectsPad.t, SP) && near(s.projectsPad.b, SP) && near(s.grid.top - s.projects.top, SP + 1, 2) && near(s.projects.bottom - s.grid.bottom, SP, 2), `pad ${s.projectsPad.t}/${s.projectsPad.b}`);
  console.log(`      heights: hero ${s.hero.h} / approach ${s.approach.h} / projects ${s.projects.h}, card ${s.card.toFixed(0)}px wide, doc ${s.docH}`);

  await page.evaluate(() => document.querySelector(".projects-body").scrollIntoView({ block: "start" }));
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}sections-${w}-projects.png` });
  ok(`${tag} no overflow, no errors`, s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

/* Phones: the narrower rhythm, the hero still one full screen. */
{
  const [w, h] = [390, 844];
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const s = await page.evaluate(probe), SP = sp(w, s.vh);
  ok(`${w}px: hero is the full stage, next section right after the track`, near(s.heroLayH, s.stageLayH, 1) && near(s.approach.top, s.trackTop + s.trackH, 1), `hero ${s.heroLayH} of ${s.stageLayH}`);
  ok(`${w}px: sections use the narrow rhythm (${SP.toFixed(0)}px)`, near(s.approachPad.t, SP) && near(s.projectsPad.b, SP), `approach ${s.approachPad.t}, projects ${s.projectsPad.b}`);
  ok(`${w}px: no overflow`, s.overflow === 0, `${s.overflow}px`);
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
