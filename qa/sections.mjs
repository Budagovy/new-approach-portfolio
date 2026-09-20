/* QA gate for the fixed section heights: from 860px up the hero block,
   "My approach" and "Selected projects" are each exactly --section-h
   (500px) tall, their content fits inside them, the approach lands
   directly under the hero when the splash pin releases, and it does not
   enter the screen before the push is over. Exits non-zero on failure.
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
const SECTION_H = 500;

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(62)} ${d}`); if (!p) fails.push(n); };

const probe = () => {
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
  const track = document.querySelector(".splash-track");
  return {
    vh: innerHeight, scrollY: Math.round(scrollY),
    trackTop: track.offsetTop, trackH: track.offsetHeight,
    hero: box(".hero"), heroBody: box(".hero-body"), strip: box(".hero-strip"), header: box(".site-header"),
    approach: box(".approach"), approachLast: box(".approach-copy"),
    projects: box(".projects-body"),
    projectsLast: Math.round(Math.max(...[...document.querySelectorAll(".project-tag")].map((t) => t.getBoundingClientRect().bottom))),
    stageScale: (() => { const t = getComputedStyle(document.querySelector(".splash-hero-stage")).transform; return t === "none" ? 1 : +t.match(/matrix\(([^,]+)/)[1]; })(),
    overflow: document.documentElement.scrollWidth - innerWidth,
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const [w, h] of [[1440, 900], [1366, 768], [1920, 1080], [1024, 768]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const tag = `${w}x${h}:`;

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
  ok(`${tag} hero block is ${SECTION_H}px, at the top, at native scale`, s.hero.h === SECTION_H && s.hero.top === 0 && Math.abs(s.stageScale - 1) < 0.01, `h ${s.hero.h} top ${s.hero.top} scale ${s.stageScale}`);
  ok(`${tag} hero copy clears the header and the city strip`, s.heroBody.top >= s.header.bottom && s.heroBody.bottom <= s.strip.top && s.strip.bottom <= SECTION_H, `copy ${s.heroBody.top}..${s.heroBody.bottom}, header ${s.header.bottom}, strip ${s.strip.top}..${s.strip.bottom}`);
  ok(`${tag} approach sits directly under the hero at release`, s.approach.top === SECTION_H, `approach top ${s.approach.top}`);
  await page.screenshot({ path: `${OUT}sections-${w}-release.png` });

  ok(`${tag} approach is ${SECTION_H}px, content inside it`, s.approach.h === SECTION_H && s.approachLast.bottom <= s.approach.bottom, `h ${s.approach.h}, copy bottom ${s.approachLast.bottom} of ${s.approach.bottom}`);
  ok(`${tag} projects follow the approach with no gap`, s.projects.top === s.approach.bottom, `${s.projects.top} vs ${s.approach.bottom}`);

  await page.evaluate(() => document.querySelector(".projects-body").scrollIntoView({ block: "end" }));
  await page.waitForTimeout(2200);
  s = await page.evaluate(probe);
  ok(`${tag} projects is ${SECTION_H}px, captions inside it`, s.projects.h === SECTION_H && s.projectsLast <= s.projects.bottom, `h ${s.projects.h}, captions bottom ${s.projectsLast} of ${s.projects.bottom}`);
  await page.screenshot({ path: `${OUT}sections-${w}-end.png` });
  ok(`${tag} no overflow, no errors`, s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
