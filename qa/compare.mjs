/* Side-by-side comparison with the Figma frame, as the user specified: a full-page screenshot
   at the frame's width (1440), next to the reference at the same scale, cut into tiles tall
   enough to read. Left: reference. Right: the site. Output: qa/frames/compare-N.png.

   The reference PNG is not in the repo (it is an 11MB export of the user's Figma frame); pass
   its path:  QA_REF=path/to/full.png npm run qa:compare
*/
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync, existsSync } from "node:fs";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const URL_ = process.env.QA_URL || "http://localhost:3220";
const REF = process.env.QA_REF;
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });
if (!REF || !existsSync(REF)) { console.error("Set QA_REF to the reference PNG (1440 wide)."); process.exit(1); }

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
/* Reduced motion, so reveals are cuts; then walk the page once so every lazy image has loaded
   and every reveal has been seen, and come back to the top. */
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const page = await ctx.newPage();
await page.goto(URL_, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const docH = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y <= docH; y += 500) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(250); }
await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(600);
/* The header is fixed; for a full-page picture it should sit at the top once, as in the frame. */
await page.addStyleTag({ content: ".site-header{position:absolute!important}" });
const shot = (await page.screenshot({ fullPage: true })).toString("base64");
const ref = readFileSync(REF).toString("base64");

const board = await ctx.newPage();
await board.setViewportSize({ width: 2900, height: 1000 });
await board.setContent(`<body style="margin:0;background:#444;display:flex;gap:20px;align-items:flex-start"><img id="a"><img id="b"></body>`);
const dims = await board.evaluate(async ({ ref, shot }) => {
  const a = document.getElementById("a"), b = document.getElementById("b");
  a.src = "data:image/png;base64," + ref; b.src = "data:image/png;base64," + shot;
  await a.decode(); await b.decode();
  return { ref: [a.naturalWidth, a.naturalHeight], site: [b.naturalWidth, b.naturalHeight] };
}, { ref, shot });
console.log(`reference ${dims.ref.join("x")}, site ${dims.site.join("x")}`);
const H = Math.max(dims.ref[1], dims.site[1]), TILE = 900;
for (let y = 0, i = 1; y < H; y += TILE, i++) {
  await board.screenshot({ path: `${OUT}compare-${i}.png`, clip: { x: 0, y, width: 2900, height: Math.min(TILE, H - y) }, fullPage: true });
}
await browser.close();
