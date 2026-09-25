/* QA gate for the Simply - Share the Moment case study (/work/simply-share-the-moment).

   Navigation: the project card is one same-tab link around image and title, with the phone
   still in its 2:3 crop; the URL loads and refreshes directly; the shared header, nav and
   footer are there once, with Projects active; Back to projects lands on the projects section.
   Content: live text, no embedded PDF; every line of the approved copy (qa/copy/simply-share-
   the-moment.md, from the owner's Content.md) is on the page and nothing beyond it; the seven
   sections in the reference's order; the four motivation steps in their order; one h1, no
   skipped heading levels.
   Look: cream ground, ink text; orange only on The problem / The solution; every heading and
   paragraph left-aligned; captions at their figure's left edge; the site's type scale only;
   the tablet plates keep their proportions and carry their frame's transparent surround
   (nothing white or boxed behind them).
   Rail: one item per section, numbered, hidden over the hero, following the section in view,
   names unfolding on hover without clipping.
   Keyboard: back link and images reachable and focused; Enter opens an image, Escape closes.
   Responsive: no horizontal overflow at 1440 / 1024 / 768 / 390 / 320; the steps and the pair
   of tablets stack in reading order; Second Office is untouched by any of it.

   Exits non-zero on failure. Dev server must be up.
*/
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync, existsSync } from "node:fs";

const CHROME_PATHS = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "/usr/bin/google-chrome",
};
const CHROME = process.env.QA_CHROME || CHROME_PATHS[process.platform] || CHROME_PATHS.darwin;
const BASE = process.env.QA_URL || "http://localhost:3220";
const PATH = "/work/simply-share-the-moment";
const COPY = process.env.QA_COPY || "qa/copy/simply-share-the-moment.md";
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(70)} ${d}`); if (!p) fails.push(n); };
const ACCENT = "rgb(243, 180, 74)", INK = "rgb(22, 20, 14)", CREAM = "rgb(255, 249, 229)";

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
async function open(url, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const res = await page.goto(BASE + url, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  return { ctx, page, errors, status: res.status() };
}

/* ---------- from the homepage: the card ---------- */
{
  const { ctx, page, errors } = await open("/", { viewport: { width: 1440, height: 900 } });
  const card = await page.evaluate(() => {
    const li = [...document.querySelectorAll(".project-item")].find((l) => l.textContent.includes("Share the Moment"));
    if (!li) return null;
    const a = li.querySelector("a"), img = li.querySelector("img"), media = li.querySelector(".project-media");
    const ir = img.getBoundingClientRect(), mr = media.getBoundingClientRect();
    return {
      href: a?.getAttribute("href"), target: a?.getAttribute("target"), links: li.querySelectorAll("a").length,
      wrapsImage: !!a?.querySelector("img"), wrapsTitle: !!a?.querySelector(".project-title"),
      title: li.querySelector(".project-title").textContent.trim(), tag: li.querySelector(".project-tag").textContent.trim(),
      src: img.getAttribute("src"), loaded: img.complete && img.naturalWidth > 0, nat: img.naturalWidth,
      zoom: +getComputedStyle(img).scale || 1, box: +(mr.width / mr.height).toFixed(3), natural: +(img.naturalWidth / img.naturalHeight).toFixed(3),
      /* how much of the cover survives the 2:3 crop: the cover is the wider of the two, so
         the sides are trimmed evenly and the full height is kept */
      keptX: Math.round(100 * (mr.width / mr.height) / (img.naturalWidth / img.naturalHeight)),
      fills: Math.abs(ir.width - mr.width) < 1 && Math.abs(ir.height - mr.height) < 1,
    };
  });
  ok("the second project card is Simply - Share the Moment, from the handoff's cover", !!card && card.title === "Simply — Share the Moment" && card.src === "/projects/simply-share-the-moment.webp" && card.loaded && card.nat >= 1000, JSON.stringify(card && { title: card.title, src: card.src, nat: card.nat }));
  ok("one same-tab link around image and title, to the new case study", card.links === 1 && card.href === PATH && card.target === null && card.wrapsImage && card.wrapsTitle, `${card.href}, ${card.links} link(s)`);
  /* The phone stands in the middle of the cover: the crop takes an even slice off each side
     and none of the height, so it stays whole. */
  ok("the crop keeps the middle of the cover, where the phone is (no zoom, sides trimmed evenly)", card.zoom === 1 && card.fills && card.keptX >= 80 && card.natural > card.box, `${card.keptX}% of the width kept, zoom ${card.zoom}, cover ${card.natural} in a ${card.box} crop`);
  await page.evaluate(() => document.querySelector(".projects").scrollIntoView()); await page.waitForTimeout(1500);
  await page.click(".project-item:nth-child(2) a .project-title");
  await page.waitForURL("**" + PATH, { timeout: 15000 });
  await page.waitForTimeout(800);
  ok("clicking the card opens the case study in the same tab", page.url().endsWith(PATH) && ctx.pages().length === 1 && (await page.locator(".cs-h1").count()) === 1, `${page.url()}, ${ctx.pages().length} tab(s)`);
  ok("homepage and navigation: no console errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ---------- the page at 1440 ---------- */
{
  const { ctx, page, errors, status } = await open(PATH, { viewport: { width: 1440, height: 900 } });
  ok("direct load of the URL", status === 200 && (await page.locator(".cs-h1").count()) === 1, `HTTP ${status}`);
  const re = await page.reload({ waitUntil: "networkidle" });
  ok("refresh on the URL", re.status() === 200, `HTTP ${re.status()}`);
  { const docH = await page.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y <= docH; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); } await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400); }

  const s = await page.evaluate(() => {
    const q = (x) => document.querySelector(x), qa = (x) => [...document.querySelectorAll(x)];
    const cs = (el) => getComputedStyle(el);
    const textEls = qa(".cs *").filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest("dialog"));
    const heads = qa("h1, h2, h3, h4").filter((h) => !h.closest("dialog")).map((h) => ({ level: +h.tagName[1], text: h.textContent.trim(), footer: !!h.closest("footer.footer") }));
    return {
      headers: qa("header.site-header").length, footers: qa("footer.footer").length, mains: qa("main").length,
      nav: qa(".site-header-link").map((a) => ({ label: a.textContent.trim(), href: a.getAttribute("href"), current: a.getAttribute("aria-current") })),
      backs: qa(".cs-back").map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })),
      embeds: qa("embed, object, iframe, [src$='.pdf'], [href$='.pdf']").length,
      text: q(".cs").textContent.replace(/\s+/g, " "),
      heads, h2: qa(".cs h2").map((h) => h.textContent.trim().replace(/\s+/g, " ")),
      headWeights: qa(".cs h1, .cs h2").map((h) => +cs(h).fontWeight),
      bodyBg: cs(document.body).backgroundColor, frameBg: cs(q(".frame")).backgroundColor, csColor: cs(q(".cs")).color, h1Color: cs(q(".cs-h1")).color,
      font: cs(q(".cs-h1")).fontFamily,
      accentText: textEls.filter((el) => cs(el).color === "rgb(243, 180, 74)").map((el) => el.className + (el.closest(".cs-callout") ? " (on dark)" : "")),
      steps: qa(".cs-step").map((li) => ({ n: li.querySelector(".cs-step-number").textContent, title: li.querySelector(".cs-step-title")?.textContent, top: Math.round(li.getBoundingClientRect().top) })),
      /* every plate image stands on the page's own ground: no box, no tray */
      plates: qa(".cs-plate img").filter((i) => !i.closest("dialog")).map((img) => {
        let boxed = null;
        for (let n = img; n && !n.classList.contains("cs"); n = n.parentElement) {
          const c = cs(n);
          if (c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.borderTopWidth !== "0px") boxed = `${n.className}: ${c.backgroundColor} / ${c.borderTopWidth}`;
        }
        const r = img.getBoundingClientRect();
        return { src: img.getAttribute("src").split("/").pop(), boxed, nat: img.naturalWidth, loaded: img.complete && img.naturalWidth > 0, alt: img.getAttribute("alt"), natural: (+img.getAttribute("width")) / (+img.getAttribute("height")), shown: r.width / r.height, width: Math.round(r.width) };
      }),
      captions: qa(".cs-plate figcaption").map((c) => ({ ok: Math.abs(c.getBoundingClientRect().left - c.parentElement.querySelector("img").getBoundingClientRect().left) <= 1, text: c.textContent.slice(0, 30) })),
      aligns: [...new Set(qa(".cs h1, .cs h2, .cs h3, .cs p, .cs dt, .cs dd").map((el) => cs(el).textAlign))],
      sizes: [...new Set(textEls.filter((el) => el.getBoundingClientRect().width > 0).map((el) => Math.round(parseFloat(cs(el).fontSize) * 100) / 100))].sort((a, b) => a - b),
      measures: qa(".cs-p, .cs-intro, .cs-lede, .cs-note, .cs-statement").map((p) => { const lh = parseFloat(cs(p).lineHeight), lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh)); return { cls: p.className, chars: Math.round(p.textContent.trim().length / lines), lines }; }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  ok("one shared header, one footer, one main; Projects active", s.headers === 1 && s.footers === 1 && s.mains === 1 && s.nav.find((n) => n.label === "Projects")?.current === "page", `${s.headers}/${s.footers}/${s.mains}`);
  ok("Back to projects, top and end, pointing at the projects section", s.backs.length === 2 && s.backs.every((b) => b.text === "Back to projects" && b.href === "/#work"), JSON.stringify(s.backs));
  ok("live text and separate images: no embedded PDF, frame or object", s.embeds === 0 && s.text.length > 3000 && s.plates.length === 8, `${s.text.length} chars, ${s.plates.length} plate images`);

  if (existsSync(COPY)) {
    const norm = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();
    const page_ = norm(s.text);
    const lines = readFileSync(COPY, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("# ") && !/^\d\d$/.test(l));
    const absent = lines.filter((l) => !page_.includes(norm(l)));
    ok(`approved copy: all ${lines.length} lines of the owner's copy are on the page`, absent.length === 0, absent.slice(0, 3).map((l) => `"${l.slice(0, 50)}"`).join("; "));
    /* Nothing invented: every sentence on the page comes from that copy (wayfinding chrome aside). */
    const source = norm(readFileSync(COPY, "utf8").replace(/\r?\n/g, " "));
    const sentences = await page.evaluate(() => [...document.querySelectorAll(".cs h1, .cs h2, .cs h3, .cs-p, .cs-intro, .cs-lede .cs-line, .cs-note, .cs-statement, .cs dd, .cs-label, .cs-caption")].filter((e) => !e.closest("dialog") && !e.closest(".cs-rail")).map((e) => [...e.querySelectorAll(".cs-line")].length && !e.classList.contains("cs-line") ? [...e.querySelectorAll(".cs-line")].map((l) => l.textContent.trim()) : [e.textContent.trim()]).flat());
    const invented = [...new Set(sentences)].filter((t) => t && !source.includes(norm(t)));
    ok("nothing invented: every heading, paragraph, label and caption comes from that copy", invented.length === 0, invented.slice(0, 4).map((t) => `"${t.slice(0, 40)}"`).join("; "));
  } else console.log("NOTE  copy file missing: the line-by-line copy check was skipped");

  const expectedH2 = ["Help children keep going when practice gets difficult.", "Why we focused on Course 2.", "Earn three stars. Share a moment worth celebrating.", "A small action for the parent. A meaningful response for the child.", "Turn “keep going” into support during practice.", "Help children recognize and find their parent’s support.", "What we observed. What I learned."];
  ok("the seven sections in the reference's order", s.h2.join("|") === expectedH2.join("|"), `${s.h2.length} sections: ${s.h2.map((h) => h.slice(0, 18)).join(" / ")}`);
  const article = s.heads.filter((h) => !h.footer);
  let skipped = 0; for (let i = 1; i < article.length; i++) if (article[i].level > article[i - 1].level + 1) skipped++;
  ok("one h1; heading levels never skip", s.heads.filter((h) => h.level === 1).length === 1 && skipped === 0, `${article.length} headings, ${skipped} skips`);
  ok("the motivation flow: four numbered steps, in order, on one row", s.steps.length === 4 && s.steps.map((x) => x.n).join(",") === "01,02,03,04" && s.steps.map((x) => x.title).join(" / ") === "Share an achievement / Send encouragement / Support during practice / Keep learning" && new Set(s.steps.map((x) => x.top)).size === 1, s.steps.map((x) => x.n + " " + x.title).join(" | "));

  ok("cream ground, ink text, Google Sans Flex", s.bodyBg === CREAM && s.frameBg === CREAM && s.csColor === INK && s.h1Color === INK && /Google Sans Flex/i.test(s.font), `${s.bodyBg} ${s.csColor}`);
  const strayAccent = s.accentText.filter((c) => !c.includes("(on dark)") && !c.includes("cs-label--accent"));
  ok("orange text on cream: the Problem and Solution labels only", strayAccent.length === 0 && s.accentText.filter((c) => c.includes("cs-label--accent")).length === 2, s.accentText.join("; ") || "none");
  ok("bold section headings", s.headWeights.every((w) => w >= 700), s.headWeights.join(","));
  ok("tablet and phone artwork straight on the cream: nothing white or boxed behind it", s.plates.every((p) => !p.boxed), s.plates.filter((p) => p.boxed).map((p) => `${p.src} ${p.boxed}`).join("; ") || `${s.plates.length} images`);
  const bent = s.plates.filter((p) => !p.loaded || Math.abs(p.shown / p.natural - 1) > 0.012);
  ok("every image loaded, at its natural proportions, with alt text", bent.length === 0 && s.plates.every((p) => p.alt && p.alt.length > 20), bent.map((p) => `${p.src} ${p.shown.toFixed(3)} vs ${p.natural.toFixed(3)}`).join("; ") || `${s.plates.length} images`);
  ok("sharp artwork: every supplied image at least 1500px wide", s.plates.every((p) => p.nat >= 1500), s.plates.filter((p) => p.nat < 1500).map((p) => `${p.src} ${p.nat}px`).join("; ") || "");
  ok("every caption starts at its figure's left edge", s.captions.length === 7 && s.captions.every((c) => c.ok), s.captions.filter((c) => !c.ok).map((c) => c.text).join("; ") || `${s.captions.length} captions`);
  ok("headings and paragraphs left-aligned", s.aligns.every((a) => a === "left" || a === "start"), s.aligns.join(","));
  const wide = s.measures.filter((m) => m.lines > 1 && m.chars > 82);
  ok("comfortable paragraph widths (no multi-line paragraph over ~80 characters a line)", wide.length === 0, wide.map((m) => `${m.cls} ${m.chars}`).join("; ") || `widest ${Math.max(...s.measures.filter((m) => m.lines > 1).map((m) => m.chars))}`);
  const offScale = s.sizes.filter((z) => ![11, 12, 14, 17, 26, 36].includes(z) && !(z >= 48 && z <= 56));
  ok("the site's type scale only (14 / 17 / 26 / 36 / display; rail and bar chrome at 11-12)", offScale.length === 0, `sizes ${s.sizes.join(", ")}`);

  /* section rail */
  {
    const rail = await page.evaluate(() => ({ items: [...document.querySelectorAll(".cs-rail-item")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })), sections: [...document.querySelectorAll(".cs > section[id]")].map((s) => s.id), bars: [...document.querySelectorAll(".cs-bar-label")].map((b) => b.textContent.trim()) }));
    ok("rail: one numbered item per section, in order, each an anchor to it", rail.items.length === 7 && rail.items.every((it, i) => it.href === "#" + rail.sections[i] && it.text.startsWith(String(i + 1).padStart(2, "0"))), rail.items.map((i) => i.text).join(" | "));
    ok("bars: every section's bar carries the rail's number and name", rail.bars.length === rail.items.length && rail.bars.every((b, i) => b === rail.items[i].text), rail.bars.join(" | "));
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    const atTop = await page.evaluate(() => ({ on: document.querySelector(".cs-rail").classList.contains("cs-rail--on"), pe: getComputedStyle(document.querySelector(".cs-rail")).pointerEvents }));
    ok("rail hidden over the hero", !atTop.on && atTop.pe === "none", JSON.stringify(atTop));
    const order = [];
    for (const id of rail.sections) { await page.evaluate((id) => scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY - 200), id); await page.waitForTimeout(220); order.push(await page.evaluate(() => document.querySelector(".cs-rail-item--active")?.getAttribute("href"))); }
    ok("rail: the active item follows the section in view, every section in turn", order.join(",") === rail.sections.map((x) => "#" + x).join(","), order.join(","));
    await page.mouse.move(40, 450); await page.waitForTimeout(700);
    const names = await page.evaluate(() => [...document.querySelectorAll(".cs-rail-name")].map((n) => ({ w: Math.round(n.getBoundingClientRect().width), clipped: n.scrollWidth > n.clientWidth + 1 })));
    ok("rail: the names unfold on hover, none of them clipped", names.every((n) => n.w > 30 && !n.clipped), names.map((n) => n.w + (n.clipped ? "!" : "")).join(","));
    await page.click('.cs-rail-item[href="#booster"]'); await page.waitForTimeout(2200);
    const landed = await page.evaluate(() => ({ top: Math.round(document.querySelector("#booster").getBoundingClientRect().top), pad: Math.round(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)), active: document.querySelector(".cs-rail-item--active")?.getAttribute("href") }));
    ok("rail: a click lands the section under the header and marks it active", Math.abs(landed.top - landed.pad) <= 2 && landed.active === "#booster", `top ${landed.top} (header ${landed.pad}), active ${landed.active}`);
    await page.mouse.move(720, 450);
  }

  /* keyboard */
  await page.evaluate(() => scrollTo(0, 0));
  await page.keyboard.press("Tab");
  let reached = null; const seen = [];
  for (let i = 0; i < 24 && !reached; i++) {
    const f = await page.evaluate(() => { const a = document.activeElement, c = getComputedStyle(a); return { cls: a.className?.toString() || a.tagName, outline: c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0 }; });
    seen.push(f.cls);
    if (f.cls.includes("cs-back")) reached = f; else await page.keyboard.press("Tab");
  }
  ok("keyboard: Tab reaches Back to projects, with a visible focus ring", !!reached && reached.outline, seen.join(" > ").slice(0, 90));
  await page.keyboard.press("Tab");
  const trig = await page.evaluate(() => { const a = document.activeElement; return { isTrigger: a.classList.contains("cs-zoom-trigger"), label: a.getAttribute("aria-label") }; });
  ok("keyboard: the hero artwork is a labelled button in the tab order", trig.isTrigger && /^Expand image: /.test(trig.label), trig.label?.slice(0, 60));
  await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  const opened = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return d && { modal: d.matches(":modal"), focusInside: d.contains(document.activeElement), img: !!d.querySelector("img").naturalWidth }; });
  ok("Enter opens the artwork as a modal dialog, focus inside it", !!opened && opened.modal && opened.focusInside && opened.img, JSON.stringify(opened));
  await page.screenshot({ path: `${OUT}simply-zoom.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  const closed = await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), back: document.activeElement.classList.contains("cs-zoom-trigger") }));
  ok("Escape closes it and focus returns to the image that opened it", !closed.open && closed.back, JSON.stringify(closed));

  await page.locator(".cs-back").first().click();
  await page.waitForURL("**/#work", { timeout: 15000 }); await page.waitForTimeout(3000);
  const back = await page.evaluate(() => ({ top: Math.round(document.querySelector("#work").getBoundingClientRect().top), pad: Math.round(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)) }));
  ok("Back to projects lands on the homepage's projects section", back.top >= 0 && back.top <= back.pad + 4, `projects top ${back.top}, header ${back.pad}`);
  ok("1440: no horizontal overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

/* ---------- widths ---------- */
for (const [w, h, mobile] of [[1024, 768, false], [768, 1024, true], [390, 844, true], [320, 640, true]]) {
  const { ctx, page, errors } = await open(PATH, { viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= docH; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); }
  const s = await page.evaluate(() => {
    const q = (x) => document.querySelector(x), qa = (x) => [...document.querySelectorAll(x)];
    /* the zoom dialog holds a second copy of every image: only the ones on the page count */
    const shown = (sel) => qa(sel).filter((e) => !e.closest("dialog"));
    const rows = (sel) => new Set(shown(sel).map((e) => Math.round(e.getBoundingClientRect().top))).size;
    const vw = document.documentElement.clientWidth;
    const child = q("#child"), cc = getComputedStyle(child);
    return {
      colW: Math.round(child.clientWidth - parseFloat(cc.paddingLeft) - parseFloat(cc.paddingRight)),
      railShown: getComputedStyle(q(".cs-rail")).display !== "none",
      overflow: document.documentElement.scrollWidth - vw,
      spill: qa(".cs *").filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.closest("dialog") && (r.right > vw + 1 || r.left < -1); }).slice(0, 3).map((e) => e.className),
      stepRows: rows(".cs-step"), columnRows: rows("#problem .cs-column"), pairRows: rows("#child .cs-plate:last-of-type .cs-plate-row img"),
      stepOrder: qa(".cs-step-title").map((t) => t.textContent),
      captionsAligned: qa(".cs-plate figcaption").every((c) => Math.abs(c.getBoundingClientRect().left - c.parentElement.querySelector("img").getBoundingClientRect().left) <= 1),
      tablet: Math.round(shown("#child .cs-plate img")[0].getBoundingClientRect().width),
      h1: parseFloat(getComputedStyle(q(".cs-h1")).fontSize), body: parseFloat(getComputedStyle(q(".cs-p")).fontSize),
      clipped: qa(".cs h1, .cs h2, .cs h3, .cs p").filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      loaded: qa(".cs img").filter((i) => !i.closest("dialog")).every((i) => i.complete && i.naturalWidth > 0),
    };
  });
  const tag = `${w}px:`;
  ok(`${tag} no horizontal overflow, nothing outside the screen, no clipped text`, s.overflow === 0 && s.spill.length === 0 && s.clipped === 0, `overflow ${s.overflow}px, spill ${s.spill.join(",") || "none"}, clipped ${s.clipped}`);
  ok(`${tag} rail ${w >= 1184 ? "shown" : "hidden (no margin for it)"}`, s.railShown === (w >= 1184), `shown ${s.railShown}`);
  ok(`${tag} the four steps keep their order`, s.stepOrder.join(",") === "Share an achievement,Send encouragement,Support during practice,Keep learning", s.stepOrder.join(","));
  if (w >= 900) ok(`${tag} steps across, problem and solution side by side, the two tablets in a row`, s.stepRows === 1 && s.columnRows === 1 && s.pairRows === 1, `${s.stepRows}/${s.columnRows}/${s.pairRows}`);
  else ok(`${tag} steps, columns and the pair of tablets stack in reading order`, s.stepRows === 4 && s.columnRows === 2 && s.pairRows === 2, `${s.stepRows}/${s.columnRows}/${s.pairRows}`);
  ok(`${tag} every caption starts at its figure's left edge`, s.captionsAligned, "");
  if (w < 600) ok(`${tag} the tablet screens fill the column; type stays on the scale, not shrunk`, s.tablet >= s.colW - 1 && s.body === 17 && s.h1 >= 32, `tablet ${s.tablet}px of a ${s.colW}px column, h1 ${s.h1}px, body ${s.body}px`);
  ok(`${tag} images loaded, no console errors`, s.loaded && errors.length === 0, errors.join(" | "));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}simply-${w}.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
