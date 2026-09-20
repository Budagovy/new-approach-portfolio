/* QA gate for the page's scrolling as a whole, driven by REAL wheel input
   (the other gates script window.scrollTo, which bypasses Lenis's glide
   and the guide entirely).

   Exposure: once the hero has arrived, the splash room must never be
   visible again. Checked on every step of a slow scroll and a fast one,
   down and back up, two ways: by state (the cream cover may only be less
   than whole while the room's opacity is exactly 0) and by reading real
   screen pixels in the band under the hero, outside the page column,
   which must be the page's cream and nothing else.

   Seams: sections never separate or overlap while scrolling.

   Guided scrolling: it carries a scroll that would rest just short of a
   landing onto it; it never drags the reader back (one slow tick at a
   time always makes progress); it leaves a short deliberate scroll where
   the reader put it; it lands each section cleanly under the header; and
   new input takes over from it at once.

   Exits non-zero on failure. Run with the dev server up: npm run qa:flow
*/
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { HERO, SNAP } from "../src/lib/motion.ts";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const URL_ = process.env.QA_URL || "http://localhost:3220";
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });

/* Scroll progress at which the eased push reaches a given value (the inverse of SplashScreen's easeInOut). */
const progressAtPush = (v) => { const t = v < 0.5 ? Math.cbrt(v / 4) : 1 - Math.cbrt((1 - v) * 2) / 2; return HERO.zoomStart + t * (HERO.zoomEnd - HERO.zoomStart); };

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(66)} ${d}`); if (!p) fails.push(n); };

const state = () => {
  const o = (sel) => { const e = document.querySelector(sel); return e ? +getComputedStyle(e).opacity : null; };
  const r = (sel) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; };
  return { y: Math.round(scrollY), vh: innerHeight, room: o(".splash-frame"), foot: o(".splash-foot"), ground: o(".splash-ground"), hero: r(".hero"), approach: r(".approach"), projects: r(".projects"), stage: r(".splash-stage") };
};
const geometry = () => {
  const resting = (el) => { let y = el.getBoundingClientRect().top + scrollY; for (let h = el.closest("[data-hold]"); h; h = h.parentElement ? h.parentElement.closest("[data-hold]") : null) { if (getComputedStyle(h).position !== "sticky") continue; y += h.parentElement.getBoundingClientRect().bottom - h.getBoundingClientRect().bottom; } return Math.round(y); };
  const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const track = document.querySelector(".splash-track");
  return {
    vh: innerHeight, pad, max: document.documentElement.scrollHeight - innerHeight,
    release: track.offsetHeight - innerHeight,
    /* Where the approach first meets the header: the start of its hold. The panel is outside
       the approach's own hold, so only the splash's hold above it is added. */
    approach: resting(document.querySelector(".approach-panel")) - pad,
    hold: document.querySelector(".approach-hold").offsetHeight,
    projects: Math.min(resting(document.querySelector(".projects")) - pad, document.documentElement.scrollHeight - innerHeight),
    heroH: document.querySelector(".hero").offsetHeight,
    column: document.querySelector(".hero-page").getBoundingClientRect().left,
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const reader = await (await browser.newContext()).newPage(); // decodes screenshots
/* Worst (least cream) pixel in a clip: the page ground is #fff9e5; the room is grey/dark. */
const worstPixel = async (page, clip) => {
  const b64 = (await page.screenshot({ clip })).toString("base64");
  return reader.evaluate(async (data) => {
    const img = new Image(); img.src = "data:image/png;base64," + data; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let worst = 0, at = null;
    for (let i = 0; i < d.length; i += 4) { const off = Math.abs(d[i] - 255) + Math.abs(d[i + 1] - 249) + Math.abs(d[i + 2] - 229); if (off > worst) { worst = off; at = [d[i], d[i + 1], d[i + 2]]; } }
    return { worst, at };
  }, b64);
};

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 140)));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.mouse.move(w / 2, h / 2);
  return { ctx, page, errors };
}
const settle = async (page, ms = 1700) => { await page.waitForTimeout(ms); return page.evaluate(() => Math.round(scrollY)); };
/* Bring the page to a scroll position without going through Lenis's glide, then let it sync. */
const place = async (page, y) => { await page.evaluate((v) => scrollTo(0, v), Math.round(y)); await page.waitForTimeout(500); };

/* ---------- exposure and seams: slow and fast, down and back up ---------- */
for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  for (const [label, delta, pause] of [["slow", 40, 110], ["fast", 500, 70]]) {
    const { ctx, page, errors } = await open(w, h);
    const g = await page.evaluate(geometry);
    const tag = `${w}x${h} ${label}:`;
    let exposed = 0, worst = { worst: 0 }, worstAt = null, seams = 0, seamNote = "", samples = 0, pixelChecks = 0, partial = 0;
    const check = async () => {
      const s = await page.evaluate(state);
      samples++;
      const cover = Math.min(s.foot, s.ground);
      if (cover < 0.999) { partial += cover > 0.001 ? 1 : 0; if (s.room > 0.001) exposed++; }
      /* Pixels: the band under the hero, in the margin outside the column, whenever the cream
         is anything less than whole and that band is still part of the pinned stage. */
      const bandTop = Math.max(s.hero.bottom, 0) + 4, bandBottom = Math.min(s.stage.bottom, s.vh) - 4;
      if (cover < 0.999 && g.column > 12 && bandBottom - bandTop > 20 && s.stage.top === 0) {
        const px = await worstPixel(page, { x: 2, y: bandTop, width: Math.min(8, g.column - 4), height: bandBottom - bandTop });
        /* The screenshot lands tens of ms after the state was read, and in the fast run the
           page has moved on by then (scrolling back up, the cover is whole again and the room
           rightly back). Count the frame only if the cover is still part-clear afterwards. */
        const after = await page.evaluate(state);
        if (Math.min(after.foot, after.ground) < 0.999 && after.stage.top === 0) {
          pixelChecks++;
          if (px.worst > worst.worst) { worst = px; worstAt = s.y; }
        }
      }
      /* Seams: consecutive sections meet exactly, wherever both are laid out. */
      if (Math.abs(s.projects.top - s.approach.bottom) > 1) { seams++; seamNote = `approach/projects ${s.approach.bottom} vs ${s.projects.top} at y=${s.y}`; }
      /* Hero and approach travel together from the release until the approach is held under
         the header, where the hero rightly carries on up behind it. */
      if (s.y >= g.release && s.approach.top > g.pad + 1 && Math.abs(s.approach.top - s.hero.bottom) > 1) { seams++; seamNote = `hero/approach ${s.hero.bottom} vs ${s.approach.top} at y=${s.y}`; }
    };
    const total = g.projects + 200;
    for (let moved = 0; moved < total; moved += delta) { await page.mouse.wheel(0, delta); await page.waitForTimeout(pause); await check(); }
    await page.waitForTimeout(1200); await check();
    for (let moved = 0; moved < total + 400; moved += delta) { await page.mouse.wheel(0, -delta); await page.waitForTimeout(pause); await check(); }
    await page.waitForTimeout(1200); await check();
    ok(`${tag} room never shows once the cream starts to clear (state)`, exposed === 0, `${exposed} of ${samples} samples; cover was mid-fade in ${partial}`);
    ok(`${tag} band under the hero is cream on screen, every such frame (pixels)`, (pixelChecks > 0 || label === "fast") && worst.worst <= 6, `${pixelChecks} frames read, worst pixel off by ${worst.worst}${worst.at ? ` rgb(${worst.at}) at y=${worstAt}` : ""}`);
    ok(`${tag} no seams: sections meet exactly throughout`, seams === 0, seams ? `${seams} samples; ${seamNote}` : `${samples} samples`);
    ok(`${tag} no errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}

/* ---------- a slow scroller parked across the push's tail ---------- */
/* Two reported bugs live here. Parked half-way through the cover's clearing, the room must be
   gone and the band under the hero cream (it once showed the room). And the reader must not
   be left with an arrived hero over blank cream: from the moment the hero LOOKS arrived (the
   monitor fills the screen, push ~0.8) the blank stretch before the approach starts to appear
   must be short, and the approach must be fully there by the time the push ends. */
{
  const { ctx, page } = await open(1440, 900);
  const g = await page.evaluate(geometry);
  const park = async (push) => { await place(page, g.release * progressAtPush(push)); await page.waitForTimeout(1500); return page.evaluate(state); };
  const mid = (HERO.coverOut[0] + HERO.coverOut[1]) / 2;
  let s = await park(mid);
  const px = await worstPixel(page, { x: 2, y: s.hero.bottom + 4, width: 8, height: s.vh - s.hero.bottom - 8 });
  ok("parked mid-reveal: room gone, band under the hero is cream", s.room <= 0.001 && s.foot > 0.05 && s.foot < 0.95 && px.worst <= 6, `room ${s.room}, cover ${s.foot.toFixed(2)}, worst pixel off by ${px.worst}`);
  await page.screenshot({ path: `${OUT}flow-mid-reveal.png` });

  const looksArrived = g.release * progressAtPush(0.8), startsToShow = g.release * progressAtPush(HERO.coverOut[0] + 0.02);
  ok("hero looks arrived -> approach starts to appear: under one wheel tick", startsToShow - looksArrived <= 100, `${Math.round(startsToShow - looksArrived)}px of scroll`);
  s = await park(0.97);
  ok("well before the push ends the approach is mostly in", s.foot <= 0.35 && s.room <= 0.001, `cover ${s.foot.toFixed(2)} at push 0.97`);
  s = await park(1);
  ok("push ends: approach fully in view under the hero, pin still holding", s.foot <= 0.01 && s.room <= 0.001 && s.stage.top === 0 && Math.abs(s.approach.top - s.hero.bottom) <= 1 && s.approach.top < s.vh - 60, `cover ${s.foot.toFixed(2)}, approach top ${Math.round(s.approach.top)} of ${s.vh}`);
  const tail = g.release - looksArrived;
  ok("the arrival landing reaches back to where the hero looks arrived", tail <= SNAP.arrival * g.vh, `tail ${Math.round(tail)}px, landing reaches ${Math.round(SNAP.arrival * g.vh)}px`);

  // The user's report, as they would do it: scroll in from the splash and pause as soon as the
  // hero looks arrived. They must end up on the finished picture, approach in view.
  await place(page, looksArrived - 150);
  await page.mouse.move(720, 450);
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(3200);
  s = await page.evaluate(state);
  ok("pause right after the hero looks arrived: carried to the finished picture", s.y === g.release && s.foot <= 0.01 && s.room <= 0.001 && Math.abs(s.approach.top - s.hero.bottom) <= 1, `rests at ${s.y} (release ${g.release}), cover ${s.foot.toFixed(2)}`);
  await page.screenshot({ path: `${OUT}flow-arrived.png` });
  await ctx.close();
}

/* ---------- guided scrolling ---------- */
{
  const { ctx, page } = await open(1440, 900);
  const g = await page.evaluate(geometry);
  console.log(`landings: 0, release ${g.release}, approach ${g.approach}, projects ${g.projects}; reach ${Math.round(SNAP.ahead * g.vh)}px ahead, ${SNAP.behind}px behind`);

  // The splash: a scroll that ends with the hero arrived is carried on to the release point.
  await place(page, g.release - 340);
  await page.mouse.wheel(0, 200);
  let y = await settle(page);
  ok("hero: a scroll resting just short of the release is carried onto it", y === g.release, `rests at ${y}, release ${g.release}`);

  // A short, deliberate scroll far from any landing stays where the reader put it.
  await page.mouse.wheel(0, 100);
  y = await settle(page);
  ok("a short scroll far from a landing is left alone", Math.abs(y - (g.release + 100)) <= 2, `rests at ${y}, asked for ${g.release + 100}`);

  // One slow tick at a time never goes backwards, and gets there.
  let prev = y, backwards = 0, ticks = 0;
  /* Settle fully between ticks: the guide's glide is deliberately soft and takes over a second. */
  while (prev < g.approach && ticks < 20) { await page.mouse.wheel(0, 100); const now = await settle(page, 2300); if (now < prev) backwards++; prev = now; ticks++; }
  ok("slow single ticks: never dragged back, always progress", backwards === 0 && prev >= g.approach, `${ticks} ticks, ${backwards} backward moves, reached ${prev} (approach ${g.approach})`);
  const landed = await page.evaluate(() => Math.round(document.querySelector(".approach").getBoundingClientRect().top));
  ok("approach lands cleanly under the header", prev === g.approach && landed === g.pad, `y ${prev}, section top ${landed}, header ${g.pad}`);
  await page.screenshot({ path: `${OUT}flow-approach-landed.png` });

  // Just past a landing, with a little more to give: not pulled back into it.
  await page.mouse.wheel(0, 100);
  y = await settle(page);
  ok("one tick into the hold is kept, not pulled back to the landing", y >= g.approach + 95, `rests at ${y}, landing ${g.approach}`);

  // Through the hold to the projects: carried onto their landing.
  await place(page, g.projects - 330);
  await page.mouse.wheel(0, 150);
  y = await settle(page);
  const pTop = await page.evaluate(() => Math.round(document.querySelector(".projects").getBoundingClientRect().top));
  ok("projects: carried onto the landing, section clean under the header", y === g.projects && Math.abs(pTop - g.pad) <= 1, `y ${y} (landing ${g.projects}), section top ${pTop}`);
  await page.screenshot({ path: `${OUT}flow-projects-landed.png` });

  // Going back up is guided the same way, forward in the direction of travel.
  await place(page, g.approach + 320);
  await page.mouse.wheel(0, -150);
  y = await settle(page);
  ok("scrolling up: carried onto the landing above", y === g.approach, `rests at ${y}, landing ${g.approach}`);

  // The reader stays in control: input during a guided glide takes over.
  await place(page, g.release - 340);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(SNAP.quiet + 160); // the guide has started carrying it to the release
  const during = await page.evaluate(() => Math.round(scrollY));
  await page.mouse.wheel(0, -500);
  y = await settle(page);
  ok("input during a guided glide takes over at once", during < g.release && y < during, `was ${during} heading to ${g.release}, reader scrolled up, rests at ${y}`);

  // A hard flick is not caught by landings it flies past.
  await place(page, g.release);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(40); }
  y = await settle(page, 2200);
  ok("a hard flick travels its distance (not stopped at the first landing)", y > g.approach + 300, `rests at ${y}; first landing was ${g.approach}`);
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
