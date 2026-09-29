/* Scratch: the city strip's career label sizes, and a look at it. */
import { chromium } from "playwright-core";
const OUT = "C:/Users/budag/AppData/Local/Temp/claude/c--Users-budag-Desktop-Cursor-Folder-Architecture-Website/a431b64c-bf0b-4fa8-a4b6-f523fad8d134/scratchpad/home/";
const BASE = process.env.QA_URL || "http://localhost:3220";
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile })).newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.evaluate(() => scrollTo(0, document.querySelector(".splash-track").offsetHeight - innerHeight));
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const host = document.querySelector("portfolio-city-strip"), root = host.shadowRoot;
    const size = (sel) => { const e = root.querySelector(sel); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
    const head = root.querySelector(".heading").getBoundingClientRect(), scene = root.querySelector(".scene").getBoundingClientRect();
    const hero = document.querySelector(".hero").getBoundingClientRect();
    return { number: size(".number"), company: size(".company"), role: size(".role"), separator: size(".separator"), headH: Math.round(head.height), sceneH: Math.round(scene.height), heroH: Math.round(hero.height), label: root.querySelector(".experience").textContent.replace(/\s+/g, " ").trim(), box: { x: Math.round(head.left), y: Math.round(head.top), w: Math.round(head.width), h: Math.round(head.height + scene.height) } };
  });
  console.log(`${w}px: number ${r.number}px, company ${r.company}px, role ${r.role}px, separator ${r.separator}px | label row ${r.headH}px, scene ${r.sceneH}px, hero ${r.heroH}px | "${r.label}"`);
  if (!process.env.QA_URL) await page.screenshot({ path: `${OUT}strip-${w}.png`, clip: { x: Math.max(0, r.box.x), y: Math.max(0, r.box.y - 10), width: Math.min(w, 560), height: r.box.h + 20 } });
  await page.context().close();
}
await browser.close();
