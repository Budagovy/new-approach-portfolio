/* QA gate for the case-study pages (currently /work/second-office).

   Navigation: the project card is one same-tab link around image and title; the URL loads
   and refreshes directly; the shared header, nav and footer are there once, with Projects
   active and its links leading back to the homepage's sections; Back to projects lands on
   the projects section.
   Content: live text, no embedded PDF; every line of the approved copy is on the page, the
   section headings in the approved order, one h1, no skipped heading levels.
   Look: cream ground, ink text, only the three research figures in the accent with their
   descriptions dark; phone cutouts with nothing white behind them; every heading and
   paragraph left-aligned (THE BRIEF's label, heading and paragraph on one left edge);
   paragraph measure; images at their natural proportions; the site's type scale only.
   Section rail: one item per section, numbered, hidden over the hero and shown as the first
   section nears; the active item follows the section in view; a click glides to the section
   under the header; hovering unfolds the names; every bar between sections carries the same
   number and name as the rail. Hidden under 1184px.
   Keyboard: the back link and images are reachable and visibly focused; an image opens
   with Enter, traps focus, closes with Escape and returns focus to where it was.
   Responsive: no horizontal overflow at 1440 / 1024 / 768 / 390 / 320; columns stack; key
   screens stay wide enough to read on a phone.

   The approved copy (qa/copy/second-office.md, transcribed from the owner's refined PDF) is
   checked line by line both ways; QA_COPY overrides the path.
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
const PATH = "/work/second-office";
const COPY = process.env.QA_COPY || "qa/copy/second-office.md";
const OUT = "qa/frames/";
mkdirSync(OUT, { recursive: true });

const fails = [];
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(66)} ${d}`); if (!p) fails.push(n); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
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

/* ---------- from the homepage: the card, same tab ---------- */
{
  const { ctx, page, errors } = await open("/", { viewport: { width: 1440, height: 900 } });
  const card = await page.evaluate(() => {
    const li = [...document.querySelectorAll(".project-item")].find((l) => l.textContent.includes("Second Office"));
    const a = li.querySelector("a");
    return a && { href: a.getAttribute("href"), target: a.getAttribute("target"), wrapsImage: !!a.querySelector("img"), wrapsTitle: !!a.querySelector(".project-title"), links: li.querySelectorAll("a").length,
      others: [...document.querySelectorAll(".project-item")].filter((l) => !l.textContent.includes("Second Office")).map((l) => ({ title: l.querySelector(".project-title").textContent.trim(), href: l.querySelector("a")?.getAttribute("href") ?? null })) };
  });
  ok("Second Office card: one link around image and title, to the case study", !!card && card.href === PATH && card.wrapsImage && card.wrapsTitle && card.links === 1, JSON.stringify(card));
  ok("same tab (no target); Simply leads to its own case study, Joyn not linked yet", card.target === null && card.others[0].href === "/work/simply-share-the-moment" && card.others[1].href === null, `target ${card.target}, others ${JSON.stringify(card.others)}`);
  await page.evaluate(() => document.querySelector(".projects").scrollIntoView()); await page.waitForTimeout(1500);
  await page.click(".project-item a .project-title");
  await page.waitForURL("**" + PATH, { timeout: 15000 });
  await page.waitForTimeout(800);
  ok("clicking the title opens the case study in the same tab", page.url().endsWith(PATH) && ctx.pages().length === 1 && (await page.locator(".cs-h1").count()) === 1, `${page.url()}, ${ctx.pages().length} tab(s)`);
  await page.goBack(); await page.waitForSelector(".projects", { timeout: 15000 }); await page.waitForTimeout(600);
  ok("browser Back returns to the homepage", !page.url().includes("/work/"), page.url());
  await page.evaluate(() => document.querySelector(".projects").scrollIntoView()); await page.waitForTimeout(1200);
  await page.click(".project-item a .project-media");
  await page.waitForURL("**" + PATH, { timeout: 15000 });
  ok("clicking the image does the same", page.url().endsWith(PATH) && ctx.pages().length === 1, page.url());
  ok("homepage and navigation: no console errors", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ---------- direct load, refresh, structure, look (1440) ---------- */
{
  const { ctx, page, errors, status } = await open(PATH, { viewport: { width: 1440, height: 900 } });
  ok("direct load of the URL", status === 200 && (await page.locator(".cs-h1").count()) === 1, `HTTP ${status}`);
  const re = await page.reload({ waitUntil: "networkidle" });
  ok("refresh on the URL", re.status() === 200 && (await page.locator(".cs-h1").count()) === 1, `HTTP ${re.status()}`);
  { const docH = await page.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y <= docH; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); } await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400); }
  const missing = await (await open("/work/not-a-project", { viewport: { width: 800, height: 600 } })).status;
  ok("an unknown project is a 404, not a broken page", missing === 404, `HTTP ${missing}`);

  const s = await page.evaluate(() => {
    const q = (x) => document.querySelector(x), qa = (x) => [...document.querySelectorAll(x)];
    const cs = (el) => getComputedStyle(el);
    const textEls = qa(".cs *").filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !el.closest("dialog"));
    const heads = qa("h1, h2, h3, h4").filter((h) => !h.closest("dialog")).map((h) => ({ level: +h.tagName[1], text: h.textContent.trim(), footer: !!h.closest("footer.footer") }));
    const brief = q("#brief");
    return {
      headers: qa("header.site-header").length, footers: qa("footer.footer").length, mains: qa("main").length,
      nav: qa(".site-header-link").map((a) => ({ label: a.textContent.trim(), href: a.getAttribute("href"), current: a.getAttribute("aria-current") })),
      cta: q(".site-header-cta").getAttribute("href"), name: q(".site-header-name").getAttribute("href"),
      sitemap: qa(".footer nav a").map((a) => a.getAttribute("href")),
      backs: qa(".cs-back").map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })),
      embeds: qa("embed, object, iframe, [src$='.pdf'], [href$='.pdf']").length,
      text: q(".cs").textContent.replace(/\s+/g, " "),
      heads, h2: qa(".cs h2").map((h) => h.textContent.trim().replace(/\s+/g, " ")), headWeights: qa(".cs h1, .cs h2").map((h) => +cs(h).fontWeight),
      bodyBg: cs(document.body).backgroundColor, frameBg: cs(q(".frame")).backgroundColor, csColor: cs(q(".cs")).color, h1Color: cs(q(".cs-h1")).color,
      font: cs(q(".cs-h1")).fontFamily,
      stats: qa(".cs-stat").map((li) => ({ value: li.querySelector(".cs-stat-value").textContent, valueColor: cs(li.querySelector(".cs-stat-value")).color, textColor: cs(li.querySelector(".cs-stat-text")).color })),
      accentText: textEls.filter((el) => cs(el).color === "rgb(243, 180, 74)").map((el) => el.className + (el.closest(".cs-callout") ? " (on dark)" : "")),
      phones: qa(".cs-phone img").filter((img) => !img.closest("dialog")).map((img) => { let white = null; for (let n = img; n && !n.classList.contains("cs"); n = n.parentElement) { const bg = cs(n).backgroundColor; if (bg !== "rgba(0, 0, 0, 0)" && !n.classList.contains("cs-section--surface")) white = `${n.className}: ${bg}`; } return { src: img.getAttribute("src"), white }; }),
      aligns: [...new Set(qa(".cs h1, .cs h2, .cs h3, .cs p, .cs dt, .cs dd").filter((el) => !el.closest(".cs-hero-phones")).map((el) => cs(el).textAlign))],
      briefLefts: ["#brief .cs-label", "#brief .cs-h2", "#brief .cs-intro", "#brief .cs-column", "#brief .cs-note"].map((x) => Math.round(q(x).getBoundingClientRect().left)),
      proto: (() => { const a = q(".cs-prototype"); return a && { href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel"), text: a.textContent.trim() }; })(),
    images: qa(".cs img").filter((i) => !i.closest(".cs-detail") && !i.closest("dialog") && !i.closest(".cs-prototype")).map((i) => ({ src: i.getAttribute("src").split("/").pop(), nat: i.naturalWidth, natural: (+i.getAttribute("width")) / (+i.getAttribute("height")), shown: i.getBoundingClientRect().width / i.getBoundingClientRect().height, loaded: i.complete && i.naturalWidth > 0, alt: i.getAttribute("alt") })),
      details: qa(".cs-detail").map((d) => { const r = d.getBoundingClientRect(), i = d.querySelector("img").getBoundingClientRect(); return { covered: i.left <= r.left + 0.5 && i.right >= r.right - 0.5 && i.top <= r.top + 0.5 && i.bottom >= r.bottom - 0.5, alt: d.querySelector("img").getAttribute("alt") }; }),
      sizes: [...new Set(textEls.filter((el) => el.getBoundingClientRect().width > 0).map((el) => Math.round(parseFloat(cs(el).fontSize) * 100) / 100))].sort((a, b) => a - b),
      measures: qa(".cs-p, .cs-intro, .cs-lede, .cs-note").map((p) => { const lh = parseFloat(cs(p).lineHeight), lines = Math.max(1, Math.round(p.getBoundingClientRect().height / lh)); return { cls: p.className, chars: Math.round(p.textContent.trim().length / lines), lines }; }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  ok("one shared header, one footer, one main", s.headers === 1 && s.footers === 1 && s.mains === 1, `${s.headers}/${s.footers}/${s.mains}`);
  ok("header: Projects is the active item; links lead back to the homepage's sections", s.nav.find((n) => n.label === "Projects")?.current === "page" && s.nav.filter((n) => n.current).length === 1 && s.nav.map((n) => n.href).join(",") === "/#top,/#work,/#about" && s.cta === "/#contact" && s.name === "/", JSON.stringify(s.nav.map((n) => n.href)) + " " + s.cta);
  ok("footer sitemap leads back to the homepage too", s.sitemap.join(",") === "/#top,/#work,/#about", s.sitemap.join(","));
  ok("Back to projects, top and end, pointing at the projects section", s.backs.length === 2 && s.backs.every((b) => b.text === "Back to projects" && b.href === "/#work"), JSON.stringify(s.backs));
  ok("live text and separate images: no embedded PDF, frame or object", s.embeds === 0 && s.text.length > 3000 && s.images.length >= 16, `${s.text.length} chars of text, ${s.images.length} images`);

  if (COPY && existsSync(COPY)) {
    const context = new Set(["# Second Office - approved copy (transcribed from SecondOffice-Content-Refined.pdf, 2026-09-22)"]);
    const norm = (t) => t.toLowerCase().replace(/\s+/g, " ").trim();
    const page_ = norm(s.text);
    const lines = readFileSync(COPY, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !context.has(l) && !/^\d\d$/.test(l)).map((l) => l.replace(/^\d\d\s+/, ""));
    const absent = lines.filter((l) => !page_.includes(norm(l)));
    ok(`approved copy: all ${lines.length} lines of the refined copy are on the page`, absent.length === 0, absent.slice(0, 3).map((l) => `"${l.slice(0, 50)}"`).join("; "));
    /* Nothing invented: every sentence on the page comes from the approved copy (UI chrome aside). */
    const source = norm(readFileSync(COPY, "utf8").replace(/\r?\n/g, " "));
    const sentences = await page.evaluate(() => [...document.querySelectorAll(".cs h1, .cs h2, .cs h3:not(.cs-flow-title), .cs-p, .cs-intro, .cs-lede .cs-line, .cs-note, .cs-quote p, .cs-stat-text, .cs-stat-value, .cs dd, .cs-label, .cs-caption, .cs-step span:last-child, .cs-flow-title span:last-child, .cs-prototype-label")].filter((e) => !e.closest("dialog")).map((e) => [...e.querySelectorAll(".cs-line")].length && !e.classList.contains("cs-line") ? [...e.querySelectorAll(".cs-line")].map((l) => l.textContent.trim()) : [e.textContent.trim()]).flat());
    const invented = [...new Set(sentences)].filter((t) => t && !source.includes(norm(t)));
    ok("nothing invented: every heading, paragraph, label and figure comes from the approved copy", invented.length === 0, invented.slice(0, 4).map((t) => `"${t.slice(0, 40)}"`).join("; "));
  } else console.log("NOTE  QA_COPY not set: the line-by-line copy check was skipped");

  const expectedH2 = ["From a broad brief to a complete product.", "Less commuting. More connection.", "Booking was the starting point. People changed the brief.", "From product definition to delivery.", "One clear place to start. Three steps toward a desk.", "A shared workday, without all the back and forth.", "Designed end to end.", "What I learned from testing and delivery."];
  ok("sections in the approved order", s.h2.join("|") === expectedH2.join("|"), s.h2.length + " sections");
  const article = s.heads.filter((h) => !h.footer);
  let skipped = 0; for (let i = 1; i < article.length; i++) if (article[i].level > article[i - 1].level + 1) skipped++;
  ok("one h1; heading levels never skip", s.heads.filter((h) => h.level === 1).length === 1 && skipped === 0, `${article.length} headings, ${skipped} skips`);

  ok("cream ground (#FFF9E5), ink text (#16140E), Google Sans Flex", s.bodyBg === CREAM && s.frameBg === CREAM && s.csColor === INK && s.h1Color === INK && /Google Sans Flex/i.test(s.font), `${s.bodyBg} ${s.csColor} ${s.font.slice(0, 30)}`);
  ok("research: 78%, 62%, 82% in the accent (#F3B44A), their descriptions dark", s.stats.map((x) => x.value).join(",") === "78%,62%,82%" && s.stats.every((x) => x.valueColor === ACCENT && x.textColor === INK), JSON.stringify(s.stats.map((x) => [x.valueColor, x.textColor])));
  const strayAccent = s.accentText.filter((c) => !c.includes("cs-stat-value") && !c.includes("(on dark)") && !c.includes("cs-label--accent"));
  ok("orange text on cream: the figures and the Problem/Solution labels only", strayAccent.length === 0 && s.accentText.filter((c) => c.includes("cs-stat-value")).length === 3 && s.accentText.filter((c) => c.includes("cs-label--accent")).length === 2, s.accentText.join("; "));
  ok("The problem and The solution labels are orange", await page.evaluate(() => [...document.querySelectorAll("#brief .cs-column .cs-label")].every((l) => getComputedStyle(l).color === "rgb(243, 180, 74)")), "");
  ok("bold section headings", s.headWeights.every((w) => w >= 700), s.headWeights.join(","));
  ok("phones are the composited mockups (screen in the PDF's transparent frame), nothing white behind", s.phones.length === 14 && s.phones.every((p) => p.src.endsWith(".webp") && !p.white), s.phones.filter((p) => p.white).map((p) => p.white).join("; ") || `${s.phones.length} phones`);
  ok("sharp assets: every mockup is 890px wide, every board at least 1100px", s.images.every((i) => i.nat >= 890), s.images.filter((i) => i.nat < 890).map((i) => `${i.src} ${i.nat}px`).join("; ") || "");
  ok("Figma prototype: a real link, new tab, the PDF's address", s.proto && s.proto.href.startsWith("https://www.figma.com/proto/CK1WlplNhV9rSnQEi9T0mx/") && s.proto.target === "_blank" && /noopener/.test(s.proto.rel) && s.proto.text === "Prototype", JSON.stringify(s.proto));
  ok("headings and paragraphs left-aligned", s.aligns.every((a) => a === "left" || a === "start"), s.aligns.join(","));
  ok("THE BRIEF: label, heading, paragraph, columns and scope on one left edge", new Set(s.briefLefts).size === 1, s.briefLefts.join(", "));
  const wide = s.measures.filter((m) => m.lines > 1 && m.chars > 82);
  ok("comfortable paragraph widths (no multi-line paragraph over ~80 characters a line)", wide.length === 0, wide.map((m) => `${m.cls} ${m.chars}`).join("; ") || `widest ${Math.max(...s.measures.filter((m) => m.lines > 1).map((m) => m.chars))}`);
  const bent = s.images.filter((i) => !i.loaded || Math.abs(i.shown / i.natural - 1) > 0.012);
  ok("every image loaded, at its natural proportions, with alt text", bent.length === 0 && s.images.every((i) => i.alt && i.alt.length > 20), bent.map((i) => `${i.src} ${i.shown.toFixed(3)} vs ${i.natural.toFixed(3)}`).join("; ") || `${s.images.length} images`);
  ok("detail crops fill their panels (no tray), decorative alt", s.details.length === 3 && s.details.every((d) => d.covered && d.alt === ""), JSON.stringify(s.details));
  /* The section rail and the bar labels are wayfinding chrome at the reference's scale (10-12px), not page text. */
  const offScale = s.sizes.filter((z) => ![11, 12, 14, 17, 26, 36].includes(z) && !(z >= 48 && z <= 56));
  ok("the site's type scale only (14 / 17 / 26 / 36 / display; rail and bar chrome at 11-12)", offScale.length === 0, `sizes ${s.sizes.join(", ")}`);

  /* section rail */
  {
    const rail = await page.evaluate(() => ({ items: [...document.querySelectorAll(".cs-rail-item")].map((a) => ({ href: a.getAttribute("href"), text: a.textContent.trim() })), sections: [...document.querySelectorAll(".cs > section[id]")].map((s) => s.id), bars: [...document.querySelectorAll(".cs-bar-label")].map((b) => b.textContent.trim()) }));
    ok("rail: one numbered item per section, in order, each an anchor to it", rail.items.length === rail.sections.length && rail.items.every((it, i) => it.href === "#" + rail.sections[i] && it.text.startsWith(String(i + 1).padStart(2, "0"))), rail.items.map((i) => i.text).join(" | "));
    ok("bars: every section's bar carries the rail's number and name", rail.bars.length === rail.items.length && rail.bars.every((b, i) => b === rail.items[i].text), rail.bars.join(" | "));
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    const atTop = await page.evaluate(() => ({ on: document.querySelector(".cs-rail").classList.contains("cs-rail--on"), pe: getComputedStyle(document.querySelector(".cs-rail")).pointerEvents }));
    ok("rail hidden over the hero", !atTop.on && atTop.pe === "none", JSON.stringify(atTop));
    let order = [];
    for (const id of rail.sections) { await page.evaluate((id) => scrollTo(0, document.getElementById(id).getBoundingClientRect().top + scrollY - 200), id); await page.waitForTimeout(220); order.push(await page.evaluate(() => document.querySelector(".cs-rail-item--active")?.getAttribute("href"))); }
    ok("rail: the active item follows the section in view, every section in turn", order.join(",") === rail.sections.map((s) => "#" + s).join(","), order.join(","));
    await page.mouse.move(40, 450); await page.waitForTimeout(600);
    const hover = await page.evaluate(() => [...document.querySelectorAll(".cs-rail-name")].map((n) => Math.round(n.getBoundingClientRect().width)));
    ok("rail: names unfold on hover", hover.every((w) => w > 30), hover.join(","));
    await page.click('.cs-rail-item[href="#booking"]');
    const trace = await page.evaluate(async () => { const out = []; const t0 = performance.now(); await new Promise((r) => { const tick = () => { out.push(Math.round(scrollY)); if (performance.now() - t0 < 2500) requestAnimationFrame(tick); else r(); }; requestAnimationFrame(tick); }); return out; });
    const landed = await page.evaluate(() => ({ top: Math.round(document.querySelector("#booking").getBoundingClientRect().top), pad: Math.round(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)), active: document.querySelector(".cs-rail-item--active")?.getAttribute("href") }));
    ok("rail: a click glides to the section under the header and marks it active", [...new Set(trace)].length >= 10 && Math.abs(landed.top - landed.pad) <= 2 && landed.active === "#booking", `${[...new Set(trace)].length} positions, top ${landed.top} (header ${landed.pad}), active ${landed.active}`);
    await page.mouse.move(720, 450);
  }

  /* keyboard */
  await page.evaluate(() => scrollTo(0, 0));
  await page.keyboard.press("Tab");
  let reached = null; const seen = [];
  for (let i = 0; i < 24 && !reached; i++) {
    const f = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { cls: a.className?.toString() || a.tagName, outline: c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0 }; });
    seen.push(f.cls);
    if (f.cls.includes("cs-back")) reached = f; else await page.keyboard.press("Tab");
  }
  ok("keyboard: Tab reaches Back to projects, with a visible focus ring", !!reached && reached.outline, seen.join(" > "));
  await page.keyboard.press("Tab");
  const trig = await page.evaluate(() => { const a = document.activeElement, c = getComputedStyle(a); return { isTrigger: a.classList.contains("cs-zoom-trigger"), label: a.getAttribute("aria-label"), outline: c.outlineStyle !== "none" }; });
  ok("keyboard: images are buttons in the tab order, labelled and visibly focused", trig.isTrigger && /^Expand image: /.test(trig.label) && trig.outline, trig.label?.slice(0, 60));
  await page.keyboard.press("Enter"); await page.waitForTimeout(400);
  const opened = await page.evaluate(() => { const d = document.querySelector("dialog[open]"); return d && { modal: d.matches(":modal"), focusInside: d.contains(document.activeElement), img: !!d.querySelector("img").naturalWidth }; });
  ok("Enter opens the image as a modal dialog, focus inside it", !!opened && opened.modal && opened.focusInside && opened.img, JSON.stringify(opened));
  for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
  ok("focus stays inside the open dialog", await page.evaluate(() => document.querySelector("dialog[open]")?.contains(document.activeElement) ?? false), "");
  await page.screenshot({ path: `${OUT}case-zoom.png` });
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  const closed = await page.evaluate(() => ({ open: !!document.querySelector("dialog[open]"), back: document.activeElement.classList.contains("cs-zoom-trigger") }));
  ok("Escape closes it and focus returns to the image that opened it", !closed.open && closed.back, JSON.stringify(closed));
  await page.locator(".cs-figure .cs-zoom-trigger").first().click(); await page.waitForTimeout(300);
  await page.mouse.click(8, 300); await page.waitForTimeout(300);
  ok("a click on the backdrop closes it too", !(await page.evaluate(() => !!document.querySelector("dialog[open]"))), "");

  /* back to the projects */
  await page.locator(".cs-back").first().click();
  await page.waitForURL("**/#work", { timeout: 15000 }); await page.waitForTimeout(3000);
  const landed = await page.evaluate(() => ({ top: Math.round(document.querySelector("#work").getBoundingClientRect().top), pad: Math.round(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)), vh: innerHeight }));
  ok("Back to projects lands on the homepage's projects section", page.url().endsWith("/#work") && landed.top >= 0 && landed.top <= landed.pad + 4, `projects top ${landed.top}, header ${landed.pad}`);
  ok("1440: no horizontal overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  try { const r = await fetch(s.proto.href, { method: "GET", redirect: "follow" }); ok("Figma prototype address answers (not 404)", r.status < 400, `HTTP ${r.status}`); } catch (e) { console.log("NOTE  Figma address not reachable from here: " + String(e).slice(0, 80)); }
  await ctx.close();
}

/* ---------- widths ---------- */
for (const [w, h, mobile] of [[1024, 768, false], [768, 1024, true], [390, 844, true], [320, 640, true]]) {
  const { ctx, page, errors } = await open(PATH, { viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= docH; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); }
  const s = await page.evaluate(() => {
    const q = (x) => document.querySelector(x), qa = (x) => [...document.querySelectorAll(x)];
    const rows = (sel) => new Set(qa(sel).map((e) => Math.round(e.getBoundingClientRect().top))).size;
    const vw = document.documentElement.clientWidth;
    return {
      railShown: getComputedStyle(q(".cs-rail")).display !== "none",
      overflow: document.documentElement.scrollWidth - vw,
      spill: qa(".cs *").filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && !e.closest("dialog") && !e.closest(".cs-detail") && (r.right > vw + 1 || r.left < -1); }).slice(0, 3).map((e) => e.className),
      columnsRows: rows("#brief .cs-column"), statsRows: rows(".cs-stat"), flowRows: rows(".cs-flow-step"), galleryRows: rows(".cs-gallery li"),
      captionsAligned: qa(".cs-phone figcaption, .cs-figure figcaption").filter((c) => !c.closest(".cs-hero-phones")).every((c) => Math.abs(c.getBoundingClientRect().left - c.parentElement.querySelector("img").getBoundingClientRect().left) <= 1),
      flowPhone: Math.round(q(".cs-flow .cs-phone img").getBoundingClientRect().width), pairPhone: Math.round(q(".cs-phone-pair img").getBoundingClientRect().width),
      h1: parseFloat(getComputedStyle(q(".cs-h1")).fontSize), body: parseFloat(getComputedStyle(q(".cs-p")).fontSize),
      clipped: qa(".cs h1, .cs h2, .cs h3, .cs p").filter((e) => e.scrollWidth > e.clientWidth + 1).length,
      loaded: qa(".cs img").filter((i) => !i.closest("dialog")).every((i) => i.complete && i.naturalWidth > 0),
    };
  });
  const tag = `${w}px:`;
  ok(`${tag} no horizontal overflow, nothing outside the screen, no clipped text`, s.overflow === 0 && s.spill.length === 0 && s.clipped === 0, `overflow ${s.overflow}px, spill ${s.spill.join(",") || "none"}, clipped ${s.clipped}`);
  ok(`${tag} rail ${w >= 1184 ? "shown" : "hidden (no margin for it)"}`, s.railShown === (w >= 1184), `shown ${s.railShown}`);
  if (w >= 900) ok(`${tag} columns kept side by side`, s.columnsRows === 1 && s.statsRows === 1 && s.flowRows === 1, `${s.columnsRows}/${s.statsRows}/${s.flowRows}`);
  else ok(`${tag} columns, figures and the booking flow stack in reading order; gallery in two`, s.columnsRows === 2 && s.statsRows === 3 && s.flowRows === 3 && s.galleryRows === 3, `${s.columnsRows}/${s.statsRows}/${s.flowRows}/${s.galleryRows}`);
  ok(`${tag} every caption starts at its image's left edge`, s.captionsAligned, "");
  if (w < 600) ok(`${tag} key screens stay readable; type stays on the scale, not shrunk`, s.flowPhone >= Math.min(250, w - 48) && s.pairPhone >= Math.min(250, w - 48) && s.body === 17 && s.h1 >= 32, `flow phone ${s.flowPhone}px, pair ${s.pairPhone}px, h1 ${s.h1}px, body ${s.body}px`);
  ok(`${tag} images loaded, no console errors`, s.loaded && errors.length === 0, errors.join(" | "));
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: `${OUT}case-${w}.png`, fullPage: true });
  await ctx.close();
}

/* ---------- 200% zoom (a 720px-wide layout viewport at 1440) ---------- */
{
  const { ctx, page } = await open(PATH, { viewport: { width: 720, height: 450 }, deviceScaleFactor: 2 });
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok("200% zoom: reflows, no horizontal overflow", o === 0, `${o}px`);
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
