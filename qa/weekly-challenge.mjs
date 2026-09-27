/* QA gate for the Simply - Weekly Challenge case study (/work/simply-weekly-challenge).

   Navigation: the middle project card is Weekly Challenge, one same-tab link around image and
   title; the URL loads and refreshes directly; the address the case study it replaced was
   published at redirects here; the shared header, nav and footer are there once with Projects
   active; Back to projects lands on the projects section.
   Content: live text, no embedded PDF; every line of the approved copy (qa/copy/simply-weekly-
   challenge.md, from the owner's Content.md) is on the page and nothing beyond it; the five
   sections in the PDF's order; one h1, no skipped heading levels.
   Mockups: every app screen is in the site's own iPhone frame, held landscape, standing on the
   cream with a soft shadow and nothing white or boxed behind it; the UI keeps its proportions
   and is never upscaled past its source; the hero screen is the PDF's smaller size, not the
   earlier oversized one.
   Pairs: the milestone screens carry the progress-bar detail beneath them, both details at one
   height; the countdown and the certificate, and the two template excerpts, are levelled to a
   shared top and bottom edge though their proportions differ.
   Look: cream ground, ink text, orange on the six paired labels only, everything left-aligned,
   captions at their figure's left edge, the site's type scale only.
   Rail: five numbered items, hidden over the hero, following the section in view.
   Keyboard: back link and images reachable; Enter opens an image, Escape closes it.
   Responsive: no horizontal overflow at 1440 / 1024 / 768 / 390 / 320; pairs stack in reading
   order and the screens stay as wide as the column.

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
const PATH = "/work/simply-weekly-challenge";
const OLD = "/work/simply-share-the-moment";
const COPY = process.env.QA_COPY || "qa/copy/simply-weekly-challenge.md";
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(70)} ${d}`); if (!p) fails.push(n); };
const INK = "rgb(22, 20, 14)", CREAM = "rgb(255, 249, 229)";

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
  await page.evaluate(() => document.querySelector(".projects").scrollIntoView());
  await page.waitForFunction(() => [...document.querySelectorAll(".project-media img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const cards = await page.evaluate(() => [...document.querySelectorAll(".project-item")].map((li) => {
    const a = li.querySelector("a"), img = li.querySelector("img"), media = li.querySelector(".project-media");
    const mr = media.getBoundingClientRect();
    return { title: li.querySelector(".project-title").textContent.trim(), tag: li.querySelector(".project-tag").textContent.trim(),
      href: a ? a.getAttribute("href") : null, target: a ? a.getAttribute("target") : null, links: li.querySelectorAll("a").length,
      wrapsImage: !!(a && a.querySelector("img")), wrapsTitle: !!(a && a.querySelector(".project-title")),
      src: img.getAttribute("src"), nat: img.naturalWidth, loaded: img.complete && img.naturalWidth > 0,
      keptX: Math.round(100 * (mr.width / mr.height) / (img.naturalWidth / img.naturalHeight)),
      zoom: +getComputedStyle(img).scale || 1 };
  }));
  const wc = cards[1];
  ok("the middle project card is Weekly Challenge, on the owner's own photograph", wc.title === "Weekly Challenge" && wc.tag.toLowerCase() === "feature design" && wc.src === "/projects/simply-weekly-challenge.webp" && wc.loaded && wc.nat >= 700, JSON.stringify({ title: wc.title, src: wc.src, nat: wc.nat }));
  ok("one same-tab link around image and title, to the new case study", wc.links === 1 && wc.href === PATH && wc.target === null && wc.wrapsImage && wc.wrapsTitle, `${wc.href}, ${wc.links} link(s)`);
  ok("the photograph is all but exactly the 2:3 crop: nothing zoomed, nothing lost", wc.zoom === 1 && wc.keptX >= 99 && wc.keptX <= 101, `${wc.keptX}% of the width kept, zoom ${wc.zoom}`);
  ok("the other two cards are untouched: Second Office linked, Joyn not", cards[0].title === "Second Office" && cards[0].href === "/work/second-office" && cards[2].title === "Joyn" && cards[2].href === null, cards.map((c) => `${c.title}: ${c.href}`).join(" | "));
  ok("nothing on the homepage still points at the case study it replaced", await page.evaluate((old) => ![...document.querySelectorAll("a[href]")].some((a) => a.getAttribute("href").includes(old)), "share-the-moment"), "");
  await page.click(".project-item:nth-child(2) a .project-title");
  await page.waitForURL("**" + PATH, { timeout: 15000 });
  await page.waitForTimeout(800);
  ok("clicking the card opens the case study in the same tab", page.url().endsWith(PATH) && ctx.pages().length === 1 && (await page.locator(".cs-h1").count()) === 1, `${page.url()}, ${ctx.pages().length} tab(s)`);
  ok("homepage and navigation: no console errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ---------- the address it replaced ---------- */
{
  const { ctx, page, status } = await open(OLD, { viewport: { width: 1024, height: 768 } });
  ok("the replaced case study's address redirects here", status === 200 && page.url().endsWith(PATH) && (await page.locator(".cs-h1").count()) === 1, `HTTP ${status} at ${page.url()}`);
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
    const shown = (sel) => qa(sel).filter((e) => !e.closest("dialog"));
    const textEls = qa(".cs *").filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest("dialog"));
    const heads = qa("h1, h2, h3, h4").filter((h) => !h.closest("dialog")).map((h) => ({ level: +h.tagName[1], text: h.textContent.trim(), footer: !!h.closest("footer.footer") }));
    const rect = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }; };
    const sec = q("#problem"), sc = cs(sec);
    return {
      headers: qa("header.site-header").length, footers: qa("footer.footer").length, mains: qa("main").length,
      nav: qa(".site-header-link").map((a) => ({ label: a.textContent.trim(), current: a.getAttribute("aria-current") })),
      backs: qa(".cs-back").map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })),
      embeds: qa("embed, object, iframe, [src$='.pdf'], [href$='.pdf']").length,
      text: q(".cs").textContent.replace(/\s+/g, " "),
      heads, h2: qa(".cs h2").map((h) => h.textContent.trim().replace(/\s+/g, " ")),
      headWeights: qa(".cs h1, .cs h2").map((h) => +cs(h).fontWeight),
      bodyBg: cs(document.body).backgroundColor, frameBg: cs(q(".frame")).backgroundColor, csColor: cs(q(".cs")).color, h1Color: cs(q(".cs-h1")).color,
      font: cs(q(".cs-h1")).fontFamily,
      accentText: textEls.filter((el) => cs(el).color === "rgb(243, 180, 74)").map((el) => el.className),
      shots: shown(".cs-plate img, .cs-figures img").map((img) => {
        let boxed = null;
        for (let n = img; n && !n.classList.contains("cs"); n = n.parentElement) {
          const c = cs(n);
          if (c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.borderTopWidth !== "0px") boxed = `${n.className}: ${c.backgroundColor} / ${c.borderTopWidth}`;
        }
        const trigger = img.closest(".cs-zoom-trigger");
        return { src: img.getAttribute("src").split("/").pop(), boxed, nat: img.naturalWidth, loaded: img.complete && img.naturalWidth > 0, alt: img.getAttribute("alt"),
          natural: (+img.getAttribute("width")) / (+img.getAttribute("height")), ...rect(img), shadow: trigger ? cs(trigger).filter : "none" };
      }),
      pairs: qa(".cs-figures").map((f) => ({ level: f.classList.contains("cs-figures--level"),
        images: shown(".cs-figures-item > .cs-zoom-trigger:not(.cs-figure-detail) img").filter((i) => f.contains(i)).map(rect),
        details: shown(".cs-figure-detail img").filter((i) => f.contains(i)).map(rect) })),
      captions: qa(".cs-plate figcaption, .cs-figures figcaption").map((c) => ({ ok: Math.abs(c.getBoundingClientRect().left - c.parentElement.querySelector("img").getBoundingClientRect().left) <= 1, text: c.textContent.slice(0, 28) })),
      heroShot: rect(shown(".cs-hero-plate img")[0]),
      column: Math.round(sec.clientWidth - parseFloat(sc.paddingLeft) - parseFloat(sc.paddingRight)),
      aligns: [...new Set(qa(".cs h1, .cs h2, .cs h3, .cs p, .cs dt, .cs dd").map((el) => cs(el).textAlign))],
      sizes: [...new Set(textEls.filter((el) => el.getBoundingClientRect().width > 0).map((el) => Math.round(parseFloat(cs(el).fontSize) * 100) / 100))].sort((a, b) => a - b),
      measures: qa(".cs-p, .cs-intro, .cs-lede, .cs-note, .cs-statement").map((p) => { const lh = parseFloat(cs(p).lineHeight), lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh)); return { cls: p.className, chars: Math.round(p.textContent.trim().length / lines), lines }; }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  ok("one shared header, one footer, one main; Projects active", s.headers === 1 && s.footers === 1 && s.mains === 1 && s.nav.find((n) => n.label === "Projects").current === "page", `${s.headers}/${s.footers}/${s.mains}`);
  ok("Back to projects, top and end, pointing at the projects section", s.backs.length === 2 && s.backs.every((b) => b.text === "Back to projects" && b.href === "/#work"), JSON.stringify(s.backs));
  ok("live text and separate images: no embedded PDF, frame or object", s.embeds === 0 && s.text.length > 3000 && s.shots.length === 10, `${s.text.length} chars, ${s.shots.length} images`);

  if (existsSync(COPY)) {
    const norm = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();
    const page_ = norm(s.text);
    const lines = readFileSync(COPY, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("# "));
    const absent = lines.filter((l) => !page_.includes(norm(l)));
    ok(`approved copy: all ${lines.length} lines of the owner's copy are on the page`, absent.length === 0, absent.slice(0, 3).map((l) => `"${l.slice(0, 50)}"`).join("; "));
    const source = norm(readFileSync(COPY, "utf8").replace(/\r?\n/g, " "));
    const sentences = await page.evaluate(() => [...document.querySelectorAll(".cs h1, .cs h2, .cs h3, .cs-p, .cs-intro, .cs-lede .cs-line, .cs-note, .cs-statement, .cs dd, .cs-label, .cs-caption")].filter((e) => !e.closest("dialog") && !e.closest(".cs-rail")).map((e) => [...e.querySelectorAll(".cs-line")].length && !e.classList.contains("cs-line") ? [...e.querySelectorAll(".cs-line")].map((l) => l.textContent.trim()) : [e.textContent.trim()]).flat());
    const invented = [...new Set(sentences)].filter((t) => t && !source.includes(norm(t)));
    ok("nothing invented: every heading, paragraph, label and caption comes from that copy", invented.length === 0, invented.slice(0, 4).map((t) => `"${t.slice(0, 44)}"`).join("; "));
  } else console.log("NOTE  copy file missing: the line-by-line copy check was skipped");

  const expectedH2 = ["Give practice a reason to happen again.", "Make the music worth earning.", "Make the challenge feel like an event.", "One template, powered by AI. A new theme each week.", "More sessions. Fewer cancellations."];
  ok("the five sections in the PDF's order", s.h2.join("|") === expectedH2.join("|"), `${s.h2.length} sections: ${s.h2.map((h) => h.slice(0, 20)).join(" / ")}`);
  const article = s.heads.filter((h) => !h.footer);
  let skipped = 0; for (let i = 1; i < article.length; i++) if (article[i].level > article[i - 1].level + 1) skipped++;
  ok("one h1; heading levels never skip", s.heads.filter((h) => h.level === 1).length === 1 && skipped === 0, `${article.length} headings, ${skipped} skips`);

  ok("cream ground, ink text, Google Sans Flex", s.bodyBg === CREAM && s.frameBg === CREAM && s.csColor === INK && s.h1Color === INK && /Google Sans Flex/i.test(s.font), `${s.bodyBg} ${s.csColor}`);
  ok("orange text on cream: the six paired labels only", s.accentText.length === 6 && s.accentText.every((c) => c.includes("cs-label--accent")), `${s.accentText.length}: ${[...new Set(s.accentText)].join("; ")}`);
  ok("bold section headings", s.headWeights.every((w) => w >= 700), s.headWeights.join(","));

  const devices = s.shots.filter((x) => x.shadow !== "none");
  ok("every app screen stands on the cream in a device, soft shadow, nothing boxed behind it", devices.length === 5 && devices.every((d) => !d.boxed && /drop-shadow/.test(d.shadow)) && s.shots.every((x) => !x.boxed), devices.map((d) => d.src).join(", "));
  ok("the device is held landscape, at the site's own frame proportions", devices.every((d) => Math.abs(d.natural - 1800 / 890) < 0.01), [...new Set(devices.map((d) => d.natural.toFixed(3)))].join(", "));
  const bent = s.shots.filter((x) => !x.loaded || Math.abs(x.w / x.h / x.natural - 1) > 0.012);
  ok("every image loaded, at its natural proportions, with alt text", bent.length === 0 && s.shots.every((x) => x.alt && x.alt.length > 20), bent.map((x) => `${x.src} ${(x.w / x.h).toFixed(3)} vs ${x.natural.toFixed(3)}`).join("; ") || `${s.shots.length} images`);
  ok("no screen is upscaled past its source", s.shots.every((x) => x.w <= x.nat), s.shots.filter((x) => x.w > x.nat).map((x) => `${x.src} ${x.w} > ${x.nat}`).join("; ") || "");
  const heroShare = s.heroShot.w / s.column;
  ok("the hero screen is the PDF's smaller size, not the earlier oversized one", heroShare > 0.6 && heroShare < 0.78 && s.heroShot.w < 800, `${s.heroShot.w}px of a ${s.column}px column (${Math.round(heroShare * 100)}%)`);

  const [milestones, event, template] = s.pairs;
  ok("three paired blocks: the milestones, the event pair and the template excerpts", s.pairs.length === 3 && s.pairs.every((p) => p.images.length === 2), s.pairs.map((p) => `${p.images.length}${p.level ? " level" : ""}`).join(" | "));
  ok("the milestone screens sit level, each with its progress-bar detail beneath it", milestones.images[0].top === milestones.images[1].top && milestones.details.length === 2 && milestones.details[0].top === milestones.details[1].top, JSON.stringify(milestones.details.map((d) => [d.w, d.h])));
  ok("the two progress-bar details are shown at one height, at their own widths", milestones.details[0].h === milestones.details[1].h && milestones.details[0].w !== milestones.details[1].w, milestones.details.map((d) => `${d.w}x${d.h}`).join(" / "));
  const levelled = (p) => Math.abs(p.images[0].top - p.images[1].top) <= 1 && Math.abs(p.images[0].bottom - p.images[1].bottom) <= 2;
  ok("the countdown and the certificate share a top and a bottom edge, at their own widths", event.level && levelled(event) && Math.abs(event.images[0].w - event.images[1].w) > 8, event.images.map((i) => `${i.w}x${i.h}@${i.top}`).join(" / "));
  ok("the two template excerpts are levelled the same way", template.level && levelled(template), template.images.map((i) => `${i.w}x${i.h}@${i.top}`).join(" / "));

  ok("every caption starts at its figure's left edge", s.captions.length === 8 && s.captions.every((c) => c.ok), s.captions.filter((c) => !c.ok).map((c) => c.text).join("; ") || `${s.captions.length} captions`);
  ok("headings and paragraphs left-aligned", s.aligns.every((a) => a === "left" || a === "start"), s.aligns.join(","));
  /* The hero lede's 66ch cap is the owner's own setting: in the face the site ships it runs
     85-90 characters a line, which is reported to him rather than changed (see the note in
     globals.css). Every other paragraph is still held to a readable measure. */
  const lede = s.measures.filter((m) => m.lines > 1 && m.chars > 82 && m.cls.includes("cs-lede"));
  if (lede.length) console.log(`NOTE  the hero lede runs ${lede.map((m) => m.chars).join("/")} characters a line (its 66ch cap, the owner's)`);
  const wide = s.measures.filter((m) => m.lines > 1 && m.chars > 82 && !m.cls.includes("cs-lede"));
  ok("comfortable paragraph widths (no multi-line paragraph over ~80 characters a line)", wide.length === 0, wide.map((m) => `${m.cls} ${m.chars}`).join("; ") || `widest ${Math.max(...s.measures.filter((m) => m.lines > 1).map((m) => m.chars))}`);
  const offScale = s.sizes.filter((z) => ![11, 12, 14, 17, 26, 36].includes(z) && !(z >= 48 && z <= 56));
  ok("the site's type scale only (14 / 17 / 26 / 36 / display; rail and bar chrome at 11-12)", offScale.length === 0, `sizes ${s.sizes.join(", ")}`);

  {
    const rail = await page.evaluate(() => ({ items: [...document.querySelectorAll(".cs-rail-item")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })), sections: [...document.querySelectorAll(".cs > section[id]")].map((x) => x.id), bars: [...document.querySelectorAll(".cs-bar-label")].map((b) => b.textContent.trim()) }));
    ok("rail: one numbered item per section, in order, each an anchor to it", rail.items.length === 5 && rail.items.every((it, i) => it.href === "#" + rail.sections[i] && it.text.startsWith(String(i + 1).padStart(2, "0"))), rail.items.map((i) => i.text).join(" | "));
    ok("bars: every section's bar carries the rail's number and name", rail.bars.length === 5 && rail.bars.every((b, i) => b === rail.items[i].text), rail.bars.join(" | "));
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    const atTop = await page.evaluate(() => ({ on: document.querySelector(".cs-rail").classList.contains("cs-rail--on"), pe: getComputedStyle(document.querySelector(".cs-rail")).pointerEvents }));
    ok("rail hidden over the hero", !atTop.on && atTop.pe === "none", JSON.stringify(atTop));
    const order = [];
    for (const id of rail.sections) { await page.evaluate((id) => scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY - 200), id); await page.waitForTimeout(220); order.push(await page.evaluate(() => { const a = document.querySelector(".cs-rail-item--active"); return a ? a.getAttribute("href") : null; })); }
    ok("rail: the active item follows the section in view, every section in turn", order.join(",") === rail.sections.map((x) => "#" + x).join(","), order.join(","));
    await page.mouse.move(40, 450); await page.waitForTimeout(700);
    const names = await page.evaluate(() => [...document.querySelectorAll(".cs-rail-name")].map((n) => ({ w: Math.round(n.getBoundingClientRect().width), clipped: n.scrollWidth > n.clientWidth + 1 })));
    ok("rail: the names unfold on hover, none of them clipped", names.every((n) => n.w > 30 && !n.clipped), names.map((n) => n.w + (n.clipped ? "!" : "")).join(","));
    await page.mouse.move(720, 450);
  }

  await page.evaluate(() => scrollTo(0, 0));
  await page.keyboard.press("Tab");
  let reached = null; const seen = [];
  for (let i = 0; i < 24 && !reached; i++) {
    const f = await page.evaluate(() => { const a = document.activeElement, c = getComputedStyle(a); return { cls: a.className ? a.className.toString() : a.tagName, outline: c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0 }; });
    seen.push(f.cls);
    if (f.cls.includes("cs-back")) reached = f; else await page.keyboard.press("Tab");
  }
  ok("keyboard: Tab reaches Back to projects, with a visible focus ring", !!reached && reached.outline, seen.join(" > ").slice(0, 80));
  await page.keyboard.press("Tab");
  const trig = await page.evaluate(() => { const a = document.activeElement; return { isTrigger: a.classList.contains("cs-zoom-trigger"), label: a.getAttribute("aria-label") }; });
  ok("keyboard: the hero mockup is a labelled button in the tab order", trig.isTrigger && /^Expand image: /.test(trig.label), trig.label ? trig.label.slice(0, 56) : "");
  await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  const opened = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return d && { modal: d.matches(":modal"), focusInside: d.contains(document.activeElement), img: !!d.querySelector("img").naturalWidth }; });
  ok("Enter opens the mockup as a modal dialog, focus inside it", !!opened && opened.modal && opened.focusInside && opened.img, JSON.stringify(opened));
  await page.screenshot({ path: `${OUT}wc-zoom.png` });
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
    const shown = (sel) => qa(sel).filter((e) => !e.closest("dialog"));
    const rows = (sel) => new Set(shown(sel).map((e) => Math.round(e.getBoundingClientRect().top))).size;
    const vw = document.documentElement.clientWidth;
    const sec = q("#rewards"), cc = getComputedStyle(sec);
    return {
      colW: Math.round(sec.clientWidth - parseFloat(cc.paddingLeft) - parseFloat(cc.paddingRight)),
      railShown: getComputedStyle(q(".cs-rail")).display !== "none",
      overflow: document.documentElement.scrollWidth - vw,
      spill: qa(".cs *").filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.closest("dialog") && (r.right > vw + 1 || r.left < -1); }).slice(0, 3).map((e) => e.className),
      figureRows: qa(".cs-figures").map((f) => new Set(shown(".cs-figures-item > .cs-zoom-trigger:not(.cs-figure-detail) img").filter((i) => f.contains(i)).map((i) => Math.round(i.getBoundingClientRect().top))).size),
      columnRows: rows("#problem .cs-column"), stepRows: rows(".cs-step"),
      captionsAligned: qa(".cs-plate figcaption, .cs-figures figcaption").every((c) => Math.abs(c.getBoundingClientRect().left - c.parentElement.querySelector("img").getBoundingClientRect().left) <= 1),
      milestone: Math.round(shown("#rewards .cs-figures-item > .cs-zoom-trigger img")[0].getBoundingClientRect().width),
      h1: parseFloat(getComputedStyle(q(".cs-h1")).fontSize), body: parseFloat(getComputedStyle(q(".cs-p")).fontSize),
      clipped: qa(".cs h1, .cs h2, .cs h3, .cs p").filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      loaded: qa(".cs img").filter((i) => !i.closest("dialog")).every((i) => i.complete && i.naturalWidth > 0),
    };
  });
  const tag = `${w}px:`;
  ok(`${tag} no horizontal overflow, nothing outside the screen, no clipped text`, s.overflow === 0 && s.spill.length === 0 && s.clipped === 0, `overflow ${s.overflow}px, spill ${s.spill.join(",") || "none"}, clipped ${s.clipped}`);
  ok(`${tag} rail ${w >= 1184 ? "shown" : "hidden (no margin for it)"}`, s.railShown === (w >= 1184), `shown ${s.railShown}`);
  if (w >= 900) ok(`${tag} paired figures side by side, columns and steps across`, s.figureRows.every((n) => n === 1) && s.columnRows === 1 && s.stepRows === 1, `${s.figureRows.join("/")} | ${s.columnRows} | ${s.stepRows}`);
  else ok(`${tag} paired figures, columns and steps stack in reading order`, s.figureRows.every((n) => n === 2) && s.columnRows === 2 && s.stepRows === 3, `${s.figureRows.join("/")} | ${s.columnRows} | ${s.stepRows}`);
  ok(`${tag} every caption starts at its figure's left edge`, s.captionsAligned, "");
  if (w < 600) ok(`${tag} the screens fill the column; type stays on the scale, not shrunk`, s.milestone >= s.colW - 1 && s.body === 17 && s.h1 >= 32, `screen ${s.milestone}px of a ${s.colW}px column, h1 ${s.h1}px, body ${s.body}px`);
  ok(`${tag} images loaded, no console errors`, s.loaded && errors.length === 0, errors.join(" | "));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}wc-${w}.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
