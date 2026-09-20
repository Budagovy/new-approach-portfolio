/* Scratch: walk the page and capture each stage of the flow. */
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
const [W, H] = (process.argv[2] || "1440x900").split("x").map(Number);
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
const errors = []; page.on("pageerror", (e) => errors.push(String(e).slice(0, 200))); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
await page.goto("http://localhost:3220", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const read = () => page.evaluate(() => { const t = (s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; }; return { y: Math.round(scrollY), hero: document.querySelector(".hero").offsetHeight, approach: t(".approach"), projects: t(".projects"), docH: document.documentElement.scrollHeight, room: (+getComputedStyle(document.querySelector(".splash-frame")).opacity).toFixed(2), heading: (+getComputedStyle(document.querySelector(".approach-heading")).opacity).toFixed(2), cards: [...document.querySelectorAll(".project-item")].map((e) => (+getComputedStyle(e).opacity).toFixed(1)).join(" ") }; });
const g = await page.evaluate(() => ({ track: document.querySelector(".splash-track").offsetHeight, hero: document.querySelector(".hero").offsetHeight, hold: document.querySelector(".approach-hold").offsetHeight }));
const pinEnd = g.track - H, holdStart = pinEnd + g.hero - 76;
for (const [name, y, wait] of [["00-rest", 0, 800], ["01-mid-push", Math.round(pinEnd * 0.45), 1500], ["02-arrived", Math.round(pinEnd * 0.8), 1800], ["03-release", pinEnd, 1500], ["04-hold-start", holdStart, 1200], ["05-mid-hold", holdStart + g.hold * 0.5, 1200], ["06-hold-end", holdStart + g.hold, 1200], ["07-after", holdStart + g.hold + 300, 1200]]) {
  await page.evaluate((v) => scrollTo(0, v), Math.round(y)); await page.waitForTimeout(wait);
  console.log(name.padEnd(15), JSON.stringify(await read()));
  await page.screenshot({ path: `qa/frames/look-${W}-${name}.png` });
}
console.log("errors:", errors.join(" | ") || "none");
await browser.close();
