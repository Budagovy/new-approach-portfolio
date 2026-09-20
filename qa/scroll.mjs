/* QA gate for page scrolling (Lenis, SmoothScroll.tsx): a wheel tick
   glides through many positions, decelerates, and settles on exactly its
   distance; native scrollTo still lands exactly (every other gate relies
   on it); an anchor link glides to its section and lands below the fixed
   header; and under reduced motion Lenis is not started at all. Exits
   non-zero on failure.

   Run with the dev server up:  npm run qa:scroll
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
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(60)} ${d}`); if (!p) fails.push(n); };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/* Samples scrollY every 16ms for a while after one wheel tick. */
const trace = async (page, dy, ms = 1200) => page.evaluate(async ({ dy, ms }) => {
  const out = [];
  const t0 = performance.now();
  window.dispatchEvent(new WheelEvent("wheel", { deltaY: dy, deltaMode: 0, bubbles: true, cancelable: true }));
  await new Promise((r) => { const tick = () => { out.push(Math.round(scrollY)); if (performance.now() - t0 < ms) requestAnimationFrame(tick); else r(); }; requestAnimationFrame(tick); });
  return out;
}, { dy, ms });

{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  ok("Lenis is on the document", await page.evaluate(() => document.documentElement.classList.contains("lenis")), "");

  await page.mouse.move(720, 500);
  /* 200px: far enough from every landing that the guide (SmoothScroll) leaves it alone, so this
     measures Lenis's glide by itself. 600px used to be too, until the splash's arrival landing
     was given a longer reach. The guide has its own gate, qa/flow.mjs. */
  const t = await trace(page, 200, 2000);
  const distinct = [...new Set(t)];
  const final = t[t.length - 1];
  ok("one wheel tick glides: many intermediate positions, not a jump", distinct.length >= 8 && final > 0, `${distinct.length} distinct positions over ${t.length} frames, ends at ${final}`);
  const steps = t.slice(1).map((v, i) => v - t[i]).filter((d) => d > 0);
  ok("glide decelerates (later frames move less than earlier ones)", steps.length > 3 && steps[0] > steps[steps.length - 1], `first step ${steps[0]}px, last ${steps[steps.length - 1]}px`);
  ok("glide settles on the tick's distance (200px), no overshoot or drift", final === 200 && Math.max(...t) === 200, `max ${Math.max(...t)}`);

  // Programmatic scrollTo still lands exactly (what the QA gates rely on).
  // A position inside the page: the document is short now that sections are 500px.
  const maxScroll = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const probeY = Math.min(1500, maxScroll - 100);
  await page.evaluate((y) => scrollTo(0, y), probeY); await page.waitForTimeout(300);
  ok("native scrollTo still lands exactly", (await page.evaluate(() => scrollY)) === probeY, `${probeY}`);

  // Anchor link glides to the projects section, landing below the header.
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
  const workTop = await page.evaluate(() => document.querySelector("#work").getBoundingClientRect().top + scrollY);
  await page.click('a.site-header-link[href="#work"]');
  const a = await page.evaluate(async () => { const out = []; const t0 = performance.now(); await new Promise((r) => { const tick = () => { out.push(Math.round(scrollY)); if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else r(); }; requestAnimationFrame(tick); }); return out; });
  const aFinal = a[a.length - 1], headerH = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop));
  ok("nav 'Projects' glides (many positions) to the section, header offset", [...new Set(a)].length >= 10 && Math.abs(aFinal - Math.min(workTop - headerH, maxScroll)) <= 2, `${[...new Set(a)].length} positions, ends ${aFinal} vs ${Math.min(workTop - headerH, maxScroll)} (page bottom ${maxScroll})`);
  await page.screenshot({ path: OUT + "scroll-projects-anchor.png" });
  ok("no console errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* Reduced motion: Lenis not started, wheel is native. */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  ok("reduced motion: Lenis not started", !(await page.evaluate(() => document.documentElement.classList.contains("lenis"))), "");
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
