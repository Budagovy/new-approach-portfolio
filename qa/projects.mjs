/* QA gate for the "Selected projects" drum: pinning, one-project-per-step
   rounding, the spring settling flat on the active card with neighbours
   tilted back, reverse and mid-spring reversal, the copy crossfade, and
   the unpinned narrow / reduced-motion lists. Exits non-zero on failure.
   Screenshots land in qa/frames/.

   Run with the dev server up:  npm run qa:projects
*/
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { PROJECTS } from "../src/lib/motion.ts";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });
const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(60)} ${d}`); if (!p) fails.push(n); };

const probe = () => {
  const sec = document.querySelector(".projects"), stage = document.querySelector(".projects-stage");
  const cards = [...document.querySelectorAll(".projects-drum .projects-card")].map((c) => {
    const t = getComputedStyle(c).transform; // matrix3d(...)
    const m = t.startsWith("matrix3d") ? t.slice(t.indexOf("(") + 1).match(/[-\d.e]+/g).map(Number) : null;
    // rotateX angle from the 3d matrix: m[5] = cos, m[6] = sin (column-major m22, m23)
    const angle = m ? Math.round(Math.atan2(m[6], m[5]) * 180 / Math.PI) : null;
    const r = c.getBoundingClientRect();
    return { angle, opacity: +(+getComputedStyle(c).opacity).toFixed(2), top: Math.round(r.top), h: Math.round(r.height) };
  });
  const title = document.querySelector(".projects-title")?.textContent;
  const copyOpacity = document.querySelector(".projects-copy > div") ? +(+getComputedStyle(document.querySelector(".projects-copy > div")).opacity).toFixed(2) : null;
  return {
    secTop: sec.offsetTop, secH: sec.offsetHeight, vh: innerHeight, stageTop: Math.round(stage.getBoundingClientRect().top), stagePos: getComputedStyle(stage).position,
    title, copyOpacity, cards, list: !!document.querySelector(".projects-list"),
    labelOpacity: +getComputedStyle(document.querySelector(".projects-label")).opacity,
    overflow: document.documentElement.scrollWidth - innerWidth, docH: document.documentElement.scrollHeight,
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/* Desktop pinned drum. */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(process.env.QA_URL || "http://localhost:3220", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  let s = await page.evaluate(probe);
  const { secTop, secH, vh } = s;
  const len = secH - vh;
  const toP = (f) => Math.round(secTop + f * len);
  console.log(`projects: top ${secTop}, track ${secH}px = ${(secH / vh).toFixed(2)}vh, page ends at ${s.docH} (section end ${secTop + secH})`);
  ok("page ends at the section's track end (no gap)", s.docH === secTop + secH, "");

  const go = async (y, w = 900) => { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(w); return page.evaluate(probe); };

  s = await go(secTop, 1300);
  ok("pinned at track start; project 1 active, copy shown", s.stageTop === 0 && s.stagePos === "sticky" && s.title === "Second Office" && s.copyOpacity === 1, JSON.stringify({ top: s.stageTop, title: s.title, copy: s.copyOpacity }));
  ok("front card flat (rotateX 0), neighbour tilted back at 'step' degrees and dimmer", s.cards[0].angle === 0 && s.cards[0].opacity === 1 && Math.abs(Math.abs(s.cards[1].angle) - PROJECTS.step) <= 1 && s.cards[1].opacity < 1, JSON.stringify(s.cards));
  ok("next card sits below the front card", s.cards[1].top > s.cards[0].top, `card0 top ${s.cards[0].top}, card1 top ${s.cards[1].top}`);
  await page.screenshot({ path: OUT + "proj-1.png" });

  s = await go(toP(0.5), 1300);
  ok("mid-track: project 2 active, drum turned one step (card 1 flat, card 0 above)", s.title === "Project two" && s.cards[1].angle === 0 && Math.abs(Math.abs(s.cards[0].angle) - PROJECTS.step) <= 1 && s.cards[0].top < s.cards[1].top, JSON.stringify({ title: s.title, cards: s.cards }));
  ok("mid-track: copy crossfade finished", s.copyOpacity === 1, `${s.copyOpacity}`);
  await page.screenshot({ path: OUT + "proj-2.png" });

  s = await go(toP(1), 1300);
  ok("track end: project 3 active, still pinned", s.title === "Project three" && s.cards[2].angle === 0 && s.stageTop === 0, JSON.stringify({ title: s.title, a: s.cards.map((c) => c.angle) }));
  await page.screenshot({ path: OUT + "proj-3.png" });

  // Quarter-way: rounding keeps project 1 (no half-positions).
  s = await go(toP(0.2), 1300);
  ok("p=0.2 rounds to project 1 (whole steps only)", s.title === "Second Office" && s.cards[0].angle === 0, `${s.title} ${s.cards[0].angle}`);

  // Fast jump end -> start, then a mid-spring reversal.
  await go(toP(1), 400); s = await go(secTop, 1300);
  ok("fast reverse to start: project 1, drum back flat", s.title === "Second Office" && s.cards[0].angle === 0, JSON.stringify({ title: s.title, a: s.cards.map((c) => c.angle) }));
  await page.evaluate((v) => scrollTo(0, v), toP(0.5)); await page.waitForTimeout(150);
  s = await go(secTop, 1400);
  ok("reversing mid-spring settles cleanly on project 1", s.title === "Second Office" && s.cards[0].angle === 0 && s.copyOpacity === 1, JSON.stringify({ title: s.title, a: s.cards.map((c) => c.angle), copy: s.copyOpacity }));

  ok("desktop: no overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

/* Mobile list. */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  await page.goto(process.env.QA_URL || "http://localhost:3220", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  let s = await page.evaluate(probe);
  await page.evaluate((y) => scrollTo(0, y), s.secTop - 100); await page.waitForTimeout(1200);
  s = await page.evaluate(probe);
  ok("mobile: unpinned list", s.stagePos === "static" && s.list, `${s.stagePos} list=${s.list}`);
  await page.screenshot({ path: OUT + "proj-mobile.png" });
  // Scroll through like a reader would (steps), not one jump that skips the middle item.
  const end = await page.evaluate(() => document.body.scrollHeight);
  for (let y = s.secTop - 100; y < end; y += 300) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.waitForTimeout(1000);
  const shown = await page.evaluate(() => [...document.querySelectorAll(".projects-item")].map((li) => +getComputedStyle(li).opacity));
  ok("mobile: every project revealed once scrolled through", shown.every((o) => o === 1), JSON.stringify(shown));
  s = await page.evaluate(probe);
  ok("mobile: no overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

/* Reduced motion. */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(process.env.QA_URL || "http://localhost:3220", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  let s = await page.evaluate(probe);
  await page.evaluate((y) => scrollTo(0, y), s.secTop - 50); await page.waitForTimeout(900);
  s = await page.evaluate(probe);
  const shown = await page.evaluate(() => [...document.querySelectorAll(".projects-item")].map((li) => +getComputedStyle(li).opacity));
  ok("reduced motion: static list, all projects shown", s.stagePos === "static" && s.list && shown.length === 3 && shown.every((o) => o === 1), JSON.stringify(shown));
  await page.screenshot({ path: OUT + "proj-reduced.png" });
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
