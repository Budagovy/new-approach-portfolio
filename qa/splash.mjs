/* QA gate for the splash. Ported from the portfolio's audit, so the copy here
   is held to the same fit checks as the original. Exits non-zero on failure.

   Run with the dev server up:  npm run qa
*/
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

/* Local Chrome install, not the Playwright-managed browser (none is
   bundled here). Path is platform-dependent; override with QA_CHROME if
   yours lives somewhere else. */
const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const URL = process.env.QA_URL || "http://localhost:3220/";
const VW = 1470, VH = 920;
mkdirSync("qa/frames", { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const fails = [];
/* Tolerance defaults to zero. A default of 1 once let a single console error
   pass against a target of none: counts must match exactly, and a check that
   wants slack has to ask for it by name. */
const ok = (name, got, want, tol = 0) => {
  const pass =
    typeof want === "number" ? Math.abs(Number(got) - want) <= tol : String(got) === String(want);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name.padEnd(38)} got=${got}  want=${want}`);
  if (!pass) fails.push(name);
};

/* CSS collapses inset() to 1, 2 or 3 values when sides repeat, so expand it
   the way the box-shorthand rules do rather than assuming four. */
const readClip = () => {
  const g = document.querySelector(".splash-hero");
  const n = getComputedStyle(g).clipPath.match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
  if (!n.length) return null;
  const [t, r = t, b = t, l = r] = n;
  return { l, t, r, b, w: innerWidth - l - r, h: innerHeight - t - b };
};

/* ---- desktop: the pinned splash ---------------------------------------- */
{
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = "auto"; });

  console.log("\n== structure ==");
  const s = await page.evaluate(() => ({
    pinned: !!document.querySelector(".splash-track"),
    // The outer clipping layer must never itself carry a transform: moving
    // its own origin away from the viewport's breaks the clip-path math,
    // which reads insets as viewport-absolute pixels. The scale that grows
    // the hero lives one level down, on .splash-hero-stage, specifically so
    // it never has to share an element with this clip.
    heroTransform: getComputedStyle(document.querySelector(".splash-hero")).transform,
    heroW: Math.round(document.querySelector(".splash-hero").getBoundingClientRect().width),
    heroH: Math.round(document.querySelector(".splash-hero").getBoundingClientRect().height),
    slotFilled: !!document.querySelector(".splash-hero-stage > *"),
  }));
  ok("pinned splash used at 1470", s.pinned, true);
  ok("hero clip layer itself has no transform", s.heroTransform, "none");
  ok("hero slot is one screen wide", s.heroW, VW, 1);
  ok("hero slot is one screen tall", s.heroH, VH, 1);
  ok("slot renders the child hero", s.slotFilled, true);

  /* The hero must cover the monitor with no bezel inside it. Sampled from
     rendered pixels at several points in the loop, so camera drift cannot
     hide between two screenshots. */
  const isCream = (px) => Math.abs(px[0] - 255) < 8 && Math.abs(px[1] - 249) < 8 && Math.abs(px[2] - 229) < 10;
  let inside = "ok";
  for (const frac of [0, 0.33, 0.66]) {
    await page.evaluate((f) => { const v = document.querySelector("video"); v.pause(); v.currentTime = v.duration * f; }, frac);
    await page.waitForTimeout(450);
    const box = await page.evaluate(readClip);
    if (!box) { inside = "no clip rect"; break; }
    const shot = await page.screenshot({ clip: { x: box.l, y: box.t, width: box.w, height: box.h } });
    const px = await page.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d"); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const pts = [[2,2],[c.width-3,2],[2,c.height-3],[c.width-3,c.height-3],
                   [c.width>>1,2],[c.width>>1,c.height-3],[2,c.height>>1],[c.width-3,c.height>>1]];
      return pts.map(([a, b]) => { const i = (b * c.width + a) * 4; return [d[i], d[i+1], d[i+2]]; });
    }, shot.toString("base64"));
    const bad = px.filter((p) => !isCream(p)).length;
    if (bad) inside = `${bad}/8 edge samples not cream at t=${frac}`;
  }
  console.log("\n== screen fit ==");
  ok("hero covers the monitor", inside, "ok");

  /* Inside the clip must be the panel; walking outward, the first thing that
     is not cream must be the dark bezel within a few pixels. Bright means
     footage through a gap; dark inside means the panel rode over the bezel. */
  let edge = "ok";
  for (const f of [0, 0.5, 0.95]) {
    await page.evaluate((t) => { const v = document.querySelector("video"); v.pause(); v.currentTime = v.duration * t; }, f);
    await page.waitForTimeout(420);
    const c = await page.evaluate(readClip);
    const box = { l: c.l, t: c.t, r: VW - c.r, b: VH - c.b };
    const pad = 14;
    const shot = await page.screenshot({ clip: {
      x: Math.round(box.l - pad), y: Math.round(box.t - pad),
      width: Math.round(box.r - box.l + pad * 2), height: Math.round(box.b - box.t + pad * 2) } });
    const bad = await page.evaluate(async ({ b64, pad }) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const x = c.getContext("2d"); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const L = (px, py) => { const i = (py * c.width + px) * 4; return (d[i] + d[i+1] + d[i+2]) / 3; };
      const walk = (ix, iy, dx, dy) => {
        if (L(ix, iy) < 140) return "overlap";
        for (let k = 1; k <= 14; k++) {
          const v = L(ix + dx * k, iy + dy * k);
          if (v < 200) return v > 130 ? "footage" : k > 6 ? "gap" : "ok";
        }
        return "footage";
      };
      const mx = c.width >> 1, my = c.height >> 1;
      return [walk(mx, pad + 2, 0, -1), walk(mx, c.height - pad - 3, 0, 1),
              walk(pad + 2, my, -1, 0), walk(c.width - pad - 3, my, 1, 0)].filter((v) => v !== "ok");
    }, { b64: shot.toString("base64"), pad });
    if (bad.length) edge = `${bad.join(",")} at t=${f}`;
  }
  ok("panel sits inside the bezel", edge, "ok");

  /* Through the push the clip must grow in step with the room, and the hero
     layer must never go translucent (it is never faded — it carries the
     page ground). Pause the take to isolate the push. */
  await page.evaluate(() => { const v = document.querySelector("video"); v.pause(); v.currentTime = 0; });
  const span = await page.evaluate(() => document.querySelector(".splash-track").getBoundingClientRect().height - innerHeight);
  let faded = false, drift = 0, baseW = 0;
  for (const f of [0, 0.2, 0.35, 0.5, 0.7, 1]) {
    await page.evaluate((y) => scrollTo(0, y), Math.round(span * f));
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const g = document.querySelector(".splash-hero");
      const n = getComputedStyle(g).clipPath.match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
      const [t, r = t, b = t, l = r] = n;
      const sc = getComputedStyle(document.querySelector(".splash-frame")).transform.match(/matrix\(([^)]+)\)/);
      return { w: innerWidth - l - r, scale: sc ? parseFloat(sc[1].split(",")[0]) : 1,
               op: +getComputedStyle(document.querySelector(".splash-hero")).opacity };
    });
    if (m.op < 0.999) faded = true;
    if (f === 0) baseW = m.w;
    if (m.w < VW - 2) drift = Math.max(drift, Math.abs(m.w - baseW * m.scale));
    await page.screenshot({ path: `qa/frames/push-${String(Math.round(f * 100)).padStart(3, "0")}.png` });
  }
  console.log("\n== the push ==");
  ok("clip grows in step with the room", drift < 3, true);
  ok("hero never translucent", faded, false);

  /* At the end of the track the hero is the page: clip fully open, hero's
     own transform back at native scale/position, room gone. */
  const end = await page.evaluate(() => {
    const c = (() => {
      const n = getComputedStyle(document.querySelector(".splash-hero")).clipPath.match(/-?[\d.]+px/g)?.map(parseFloat) ?? [0];
      return Math.max(...n);
    })();
    const stageScale = (() => {
      const m = getComputedStyle(document.querySelector(".splash-hero-stage")).transform.match(/matrix\(([^)]+)\)/);
      return m ? parseFloat(m[1].split(",")[0]) : 1;
    })();
    const target = document.querySelector(".hero-eyebrow");
    let hit = "no target in hero";
    if (target) {
      const r = target.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      hit = top && (top === target || target.contains(top)) ? "hit" : (top?.className || top?.tagName || "nothing");
    }
    return {
      maxInset: c,
      stageScale,
      roomOpacity: +getComputedStyle(document.querySelector(".splash-frame")).opacity,
      hit,
    };
  });
  console.log("\n== arrival ==");
  ok("hero fills the viewport", end.maxInset, 0, 0.5);
  ok("hero stage back at native scale", end.stageScale, 1, 0.01);
  ok("room has left", end.roomOpacity, 0, 0.01);
  ok("hero content is clickable", end.hit, "hit");

  console.log("\n== console ==");
  if (errors.length) console.log("       " + errors.join("\n       "));
  ok("no errors on desktop", errors.length, 0);
  await page.close();
}

/* ---- narrow: same pinned splash as desktop, just portrait --------------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const heroLayer = document.querySelector(".splash-hero");
    const heroStage = document.querySelector(".splash-hero-stage");
    const cs = getComputedStyle(heroLayer);
    const n = cs.clipPath.match(/-?[\d.]+px/g)?.map(parseFloat) ?? [];
    const [t, r = t, b = t, l = r] = n;
    const monitor = { top: t, bottom: innerHeight - b, left: l, right: innerWidth - r };
    const eyebrow = heroStage?.querySelector(".hero-eyebrow");
    const note = heroStage?.querySelector(".hero-note");
    const eb = eyebrow?.getBoundingClientRect();
    const nb = note?.getBoundingClientRect();
    // On a portrait phone the monitor slice is a different shape than on
    // desktop, and content is only nudged toward fitting it (CONTENT_WEIGHT
    // in SplashScreen), not strictly guaranteed to — a hard guarantee opens
    // a gap on the other axis that shows raw footage through the bezel
    // instead, a worse failure. So this is a slack check, not exact.
    const SLACK = 40;
    const heroFits = !!(eb && nb) &&
      eb.top >= monitor.top - SLACK && nb.bottom <= monitor.bottom + SLACK;
    return {
      pinned: !!document.querySelector(".splash-track"),
      hero: !!document.querySelector(".splash-hero-stage > *"),
      overflow: document.documentElement.scrollWidth > innerWidth,
      heroFits,
    };
  });
  await page.screenshot({ path: "qa/frames/mobile.png", fullPage: true });
  console.log("\n== mobile 390 ==");
  ok("pinned splash used", m.pinned, true);
  ok("slot renders the child hero", m.hero, true);
  ok("no horizontal overflow", m.overflow, false);
  ok("hero content roughly fits the monitor", m.heroFits, true);
  await page.close();
}

/* ---- reduced motion ---------------------------------------------------- */
{
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => ({
    flat: !!document.querySelector(".splash-flat"),
    playing: !document.querySelector("video")?.paused,
  }));
  console.log("\n== reduced motion ==");
  ok("no pinned splash", m.flat, true);
  ok("video does not autoplay", m.playing, false);
  await ctx.close();
}

await browser.close();
console.log(`\n${fails.length ? "FAILED: " + fails.join(", ") : "ALL CHECKS PASSED"}`);
process.exit(fails.length ? 1 : 0);
