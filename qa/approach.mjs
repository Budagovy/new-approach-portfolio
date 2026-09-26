/* QA gate for the held "My approach" sequence (Approach.tsx).

   The section is pinned in view when it is reached, and continued scrolling fills the four
   milestone bars strictly in order: 01 Understand & focus, 02 Explore & design, 03 Prototype
   & refine, 04 Ship & improve. A bar starts only once the one before it is full, filled bars
   stay filled, and the section only lets go once 04 is at 100%. Scrolling back up empties
   them 04 -> 03 -> 02 -> 01.

   Each milestone's circle lights in the accent as the bar before it completes — 01 is lit
   from the start, as it always was — so all four are lit before the reader carries on, and
   they go out again in reverse on the way back up.

   It is scroll-linked, not timed: standing still leaves the bars exactly where they are, and
   the page is never locked (an ordinary scrollTo moves it as far as it is asked to). Entry
   and exit do not move anything: the bars lie along the existing rule, the steps keep their
   places, and the only length added to the document is this section's own.

   Checked at 1440 / 1024 / 768 / 390, and under reduced motion, where there is no hold at
   all. Exits non-zero on failure. Dev server must be up.
*/
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const BASE = process.env.QA_URL || "http://localhost:3220";
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(68)} ${d}`); if (!p) fails.push(n); };
const TITLES = ["Understand & focus", "Explore & design", "Prototype & refine", "Ship & improve"];
const ACCENT = "rgb(243, 180, 74)";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/** The section's geometry, once the splash has let go. */
const geometry = (page) => page.evaluate(() => {
  const section = document.querySelector("#approach");
  const pin = document.querySelector(".approach-pin");
  const top = parseFloat(getComputedStyle(pin).top) || 0;
  return {
    absTop: Math.round(section.getBoundingClientRect().top + scrollY),
    pinTop: Math.round(top),
    pinH: pin.offsetHeight,
    run: Math.round(section.getBoundingClientRect().height - pin.offsetHeight),
    vh: innerHeight,
  };
});

/** What the reader sees at this scroll position. */
const sample = (page) => page.evaluate(() => {
  const pin = document.querySelector(".approach-pin");
  const bars = [...document.querySelectorAll(".approach-bar")];
  const markers = [...document.querySelectorAll(".approach-marker")];
  return {
    /* Four decimals: the precision the section itself works in, so a bar rounded here
       cannot look full while its circle is not yet lit. */
    bars: bars.map((b) => +(+b.style.getPropertyValue("--p") || 0).toFixed(4)),
    lit: markers.map((m) => m.classList.contains("approach-marker--active")),
    colours: markers.map((m) => getComputedStyle(m).backgroundColor),
    pinScreenTop: Math.round(pin.getBoundingClientRect().top),
    pinScreenBottom: Math.round(pin.getBoundingClientRect().bottom),
    stepTops: [...document.querySelectorAll(".approach-step")].map((s) => Math.round(s.getBoundingClientRect().top)),
    y: Math.round(scrollY),
  };
});

const at = async (page, y, wait = 90) => { await page.evaluate((v) => scrollTo(0, v), Math.round(y)); await page.waitForTimeout(wait); return sample(page); };

/* ---------- the sequence at 1440 ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 140)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  /* Past the splash first: everything below it is held until its pin lets go. */
  await page.evaluate(() => scrollTo(0, document.querySelector(".splash-track").offsetHeight - innerHeight));
  await page.waitForTimeout(1500);

  const g = await geometry(page);
  const start = g.absTop - g.pinTop;
  ok("one bar per milestone, in the brief's order", (await page.evaluate(() => [...document.querySelectorAll(".approach-step")].map((s) => ({ title: s.querySelector("h3").textContent.trim(), bar: !!s.querySelector(".approach-bar"), first: s.firstElementChild.className })))).every((s, i) => s.title === ["Understand & focus", "Explore & design", "Prototype & refine", "Ship & improve"][i] && s.bar), TITLES.join(" / "));
  ok("the sequence's scroll length is this section's own, about 1.6 screens", Math.abs(g.run - 1.6 * g.vh) <= 2, `${g.run}px of a ${g.vh}px screen`);

  const before = await at(page, start - 300);
  ok("before the section: every bar empty, only the first circle lit", before.bars.every((b) => b === 0) && before.lit.join(",") === "true,false,false,false", `${before.bars.join(", ")} / lit ${before.lit.join(",")}`);

  /* Let the section's own reveal (the steps' fade and rise) finish first: it runs once, on
     entry, and is not what this gate is measuring. */
  await at(page, start + 40, 1400);
  /* Walk the held range and watch the bars. */
  const walk = [];
  for (let i = 0; i <= 40; i++) walk.push(await at(page, start + (g.run * i) / 40));

  const ordered = walk.every((s) => s.bars.every((b, i) => i === 0 || b === 0 || walk[0].bars.length === 0 || s.bars[i - 1] === 1));
  ok("strictly in order: a bar is above 0 only once the one before it is full", ordered, walk.filter((s) => !s.bars.every((b, i) => i === 0 || b === 0 || s.bars[i - 1] === 1)).slice(0, 2).map((s) => s.bars.join(",")).join(" | ") || "all 41 samples");
  const monotonic = walk.every((s, i) => i === 0 || s.bars.every((b, j) => b >= walk[i - 1].bars[j] - 0.001));
  ok("filled bars stay filled as the reader goes on (no bar empties on the way down)", monotonic, "");
  const smooth = [0, 1, 2, 3].map((i) => new Set(walk.map((s) => s.bars[i])).size);
  ok("each bar fills smoothly from 0 to 100%, not in steps", smooth.every((n) => n >= 8) && walk.at(-1).bars.every((b) => b === 1), `${smooth.join("/")} distinct values; ends ${walk.at(-1).bars.join(",")}`);
  const quarters = [0.25, 0.5, 0.75].map((f) => walk[Math.round(f * 40)].bars);
  ok("the four share the run equally: 01 full at a quarter, 02 at a half, 03 at three quarters", quarters[0][0] === 1 && quarters[0][1] <= 0.02 && quarters[1][1] === 1 && quarters[1][2] <= 0.02 && quarters[2][2] === 1 && quarters[2][3] <= 0.02, quarters.map((q) => q.join(",")).join(" | "));

  /* The circles light as the bars before them finish. */
  const litInStep = walk.every((s) => s.lit.every((on, i) => on === (i === 0 || s.bars[i - 1] === 1)));
  ok("each circle lights exactly as the bar before it completes", litInStep, walk.filter((s) => !s.lit.every((on, i) => on === (i === 0 || s.bars[i - 1] === 1))).slice(0, 2).map((s) => `${s.bars.join(",")} -> ${s.lit.join(",")}`).join(" | ") || "all samples");
  const litOrder = [1, 2, 3].map((i) => walk.findIndex((s) => s.lit[i]));
  ok("they light in order, 02 then 03 then 04, none of them early", litOrder.every((n, i) => n > 0 && (i === 0 || n > litOrder[i - 1])) && walk[0].lit.join(",") === "true,false,false,false", `first lit at samples ${litOrder.join(", ")} of 40`);
  ok("all four circles are lit in the accent by the end of the sequence", walk.at(-1).lit.every(Boolean) && walk.at(-1).colours.every((c) => c === ACCENT), `${walk.at(-1).lit.join(",")} / ${[...new Set(walk.at(-1).colours)].join(" ")}`);

  /* Pinned throughout, and only then let go. */
  const pinned = walk.every((s) => Math.abs(s.pinScreenTop - g.pinTop) <= 1);
  ok("the section stays pinned for the whole sequence", pinned, `tops ${[...new Set(walk.map((s) => s.pinScreenTop))].join(",")} (rests at ${g.pinTop})`);
  const stepsStill = walk.every((s) => s.stepTops.every((t, i) => t === walk[0].stepTops[i]) && new Set(s.stepTops).size === 1);
  ok("nothing inside it moves while it is held, and the four steps stay level", stepsStill, "");
  const after = await at(page, start + g.run + 400);
  ok("only once 04 is full does it let go and the page carry on", after.bars.every((b) => b === 1) && after.pinScreenTop < g.pinTop - 380, `bars ${after.bars.join(",")}, top ${after.pinScreenTop}`);
  ok("past it, all four milestones stay lit", after.lit.every(Boolean), after.lit.join(","));
  const justBefore = await at(page, start + g.run - 8);
  ok("a hair before the end it is still pinned and 04 is not yet full", Math.abs(justBefore.pinScreenTop - g.pinTop) <= 1 && justBefore.bars[3] < 1 && justBefore.bars[3] > 0.9, `top ${justBefore.pinScreenTop}, 04 at ${justBefore.bars[3]}`);

  /* Back up: the same sequence in reverse. */
  const back = [];
  for (let i = 40; i >= 0; i--) back.push(await at(page, start + (g.run * i) / 40));
  const emptiesInReverse = back.every((s, i) => i === 0 || s.bars.every((b, j) => b <= back[i - 1].bars[j] + 0.001));
  const emptyOrder = [3, 2, 1, 0].every((j, k) => {
    const gone = back.findIndex((s) => s.bars[j] === 0);
    const next = k === 3 ? Infinity : back.findIndex((s) => s.bars[[3, 2, 1, 0][k + 1]] === 0);
    return gone > 0 && gone < next;
  });
  ok("scrolling up reverses it: 04 empties, then 03, 02, 01", emptiesInReverse && emptyOrder && back.at(-1).bars.every((b) => b === 0), back.at(-1).bars.join(","));
  const outOrder = [3, 2, 1].map((i) => back.findIndex((s) => !s.lit[i]));
  ok("the circles go out in reverse too, and 01 stays lit", outOrder.every((n, i) => n > 0 && (i === 0 || n > outOrder[i - 1])) && back.at(-1).lit.join(",") === "true,false,false,false", `out at samples ${outOrder.join(", ")}; ends ${back.at(-1).lit.join(",")}`);

  /* Scroll-linked, not timed. */
  const held = await at(page, start + g.run * 0.4, 120);
  await page.waitForTimeout(1500);
  const still = await sample(page);
  ok("progress stops the instant the reader does (no clock running)", still.bars.join(",") === held.bars.join(",") && still.y === held.y, `${held.bars.join(",")} -> ${still.bars.join(",")}`);

  /* Not a scroll lock: the page goes exactly where it is sent, in and out of the sequence. */
  const sent = await at(page, start + g.run * 0.55, 200);
  ok("the page is never locked: it lands exactly where it is scrolled", Math.abs(sent.y - Math.round(start + g.run * 0.55)) <= 1, `asked ${Math.round(start + g.run * 0.55)}, at ${sent.y}`);

  /* Entry and exit leave the rest of the page alone. */
  const page_ = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("#approach, #work, #about")].map((e) => e.id);
    const approach = document.querySelector("#approach").getBoundingClientRect();
    const work = document.querySelector("#work").getBoundingClientRect();
    return { ids, gap: Math.round(work.top - approach.bottom), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  ok("Selected Projects still follows it directly, with no gap", page_.ids.join(",") === "approach,work,about" && page_.gap === 0, `gap ${page_.gap}px`);
  ok("no horizontal overflow, no console errors", page_.overflow === 0 && errors.length === 0, `${page_.overflow}px ${errors.join(" | ")}`);

  await at(page, start + g.run * 0.5);
  await page.screenshot({ path: `${OUT}approach-mid.png` });
  await ctx.close();
}

/* ---------- widths ---------- */
for (const [w, h, mobile] of [[1024, 768, false], [768, 1024, true], [390, 844, true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate(() => scrollTo(0, document.querySelector(".splash-track").offsetHeight - innerHeight));
  await page.waitForTimeout(1500);
  const g = await geometry(page);
  const start = g.absTop - g.pinTop;
  const tag = `${w}px:`;
  const walk = [];
  for (let i = 0; i <= 16; i++) walk.push(await at(page, start + (g.run * i) / 16));
  ok(`${tag} pinned throughout, bars fill in order and finish full`, walk.every((s) => Math.abs(s.pinScreenTop - g.pinTop) <= 1) && walk.every((s) => s.bars.every((b, i) => i === 0 || b === 0 || s.bars[i - 1] === 1)) && walk.at(-1).bars.every((b) => b === 1), `top ${g.pinTop}, ends ${walk.at(-1).bars.join(",")}`);
  ok(`${tag} the circles light with them and all four end lit`, walk.every((s) => s.lit.every((on, i) => on === (i === 0 || s.bars[i - 1] === 1))) && walk.at(-1).lit.every(Boolean), walk.at(-1).lit.join(","));
  /* Where the block is taller than the screen it rests against its foot, so the last
     milestone is on screen while it fills. */
  ok(`${tag} all four milestones are on screen while they fill`, walk.every((s) => s.pinScreenTop >= -1 || s.pinScreenBottom <= g.vh + 1), `pin ${g.pinH}px in a ${g.vh}px screen, rests at ${g.pinTop}`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${tag} no horizontal overflow, no page errors`, over === 0 && errors.length === 0, `${over}px ${errors.join(" | ")}`);
  await page.screenshot({ path: `${OUT}approach-${w}.png` });
  await ctx.close();
}

/* ---------- reduced motion: no hold at all ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const s = await page.evaluate(() => {
    const section = document.querySelector("#approach"), pin = document.querySelector(".approach-pin");
    return { spacers: document.querySelectorAll(".approach-run").length, run: Math.round(section.getBoundingClientRect().height - pin.offsetHeight), bars: [...document.querySelectorAll(".approach-bar")].map((b) => +(+b.style.getPropertyValue("--p") || 0)), lit: [...document.querySelectorAll(".approach-marker")].map((m) => m.classList.contains("approach-marker--active")) };
  });
  ok("reduced motion: no added scroll length, every milestone complete and lit", s.run === 0 && s.spacers === 0 && s.bars.every((b) => b === 1) && s.lit.every(Boolean), `${s.spacers} spacers, run ${s.run}px, bars ${s.bars.join(",")}, lit ${s.lit.join(",")}`);
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
