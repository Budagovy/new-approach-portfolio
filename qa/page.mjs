/* QA gate for the page as a whole, against the Figma frame (1440 x 2568) it is built from, and
   the owner's updated homepage frame (2026-09-28): two new sections, Tools & AI and Experience,
   after My approach; a two-line opening for My approach and the new sections; the cards opening
   Selected work with no heading; bars named MY APPROACH to ABOUT ME; sections 451 frame-px tall
   rather than 553 (the hero stays 553, Experience keeps 553).

   Geometry is the frame's, proportional to the column (--u = column / 840): the column's
   width rule, the header, the hero's height, each section's minimum height. Type is NOT
   proportional: it is the owner's fixed scale, gated in qa/type.mjs, so sections may be
   taller than the frame's where 17px copy needs the room, never shorter. Then content (exact hero copy, all four approach steps at once with only the first
   circle orange, the headings, the about block, the footer), navigation (every link has a
   real target and lands on it), proportional scaling at another desktop width, the stacked
   phone layout with no horizontal overflow, and no console errors or hydration mismatches in
   either motion mode.

   For the visual side-by-side, see qa/compare.mjs. Exits non-zero on failure.
   Run with the dev server up:  npm run qa:page
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
const ok = (n, p, d = "") => { console.log(`${p ? "PASS" : "FAIL"}  ${n.padEnd(64)} ${d}`); if (!p) fails.push(n); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const scrollY_ = (s) => s.scrollY;

/* The frame's own numbers (px at 1440). */
const FRAME = { column: [300, 1140], header: 64, bars: [617, 1186, 1756], footerTop: 2326, frameBottom: 2524, height: 2568, heroHeadline: 37, sectionHeading: 20 };

const probe = () => {
  const doc = (el) => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
  const cs = (el) => getComputedStyle(el);
  const accent = cs(document.documentElement).getPropertyValue("--accent").trim();
  const asRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };
  /* Where an element rests once the splash's hold has let go (the same sum SmoothScroll uses). */
  const resting = (el) => { let y = el.getBoundingClientRect().top + scrollY; for (let h = el.closest("[data-hold]"); h; h = h.parentElement ? h.parentElement.closest("[data-hold]") : null) { if (getComputedStyle(h).position !== "sticky") continue; y += h.parentElement.getBoundingClientRect().bottom - h.getBoundingClientRect().bottom; } return y; };
  const docR = (el) => { const r = el.getBoundingClientRect(), top = resting(el); return { top: Math.round(top), bottom: Math.round(top + r.height), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const o = (sel) => { const e = q(sel); return e ? +(+cs(e).opacity).toFixed(2) : null; };
  return {
    scrollY: Math.round(scrollY),
    chrome: q(".splash-chrome") ? +cs(q(".splash-chrome")).opacity : 1,
    splash: { room: o(".splash-frame"), greeting: o(".splash-screen"), scale: (() => { const t = q(".splash-hero-stage") && cs(q(".splash-hero-stage")).transform; return !t || t === "none" ? 1 : +t.match(/matrix\(([^,]+)/)[1]; })() },
    accent: asRgb(accent),
    order: qa("header.site-header, #top, #approach, #tools, #experience, #work, #about, #contact").map((e) => e.id || "header"),
    bodies: Object.fromEntries(qa(".section-body").map((b) => [b.closest("section").id, Math.round(b.getBoundingClientRect().height)])),
    titles: qa(".section-title").map((t) => { const lead = t.querySelector(".section-title-lead"), rest = t.querySelector(".section-title-rest"), lede = t.parentElement.querySelector(".section-lede"); return { section: t.closest("section").id, lead: lead.textContent.trim(), rest: rest ? rest.textContent.trim() : "", leadColor: cs(lead).color, restColor: rest ? cs(rest).color : null, size: parseFloat(cs(t).fontSize), left: Math.round(lead.getBoundingClientRect().left), leadTop: Math.round(lead.getBoundingClientRect().top), restTop: rest ? Math.round(rest.getBoundingClientRect().top) : null, lede: lede ? lede.textContent.trim() : "" }; }),
    faint: cs(document.documentElement).getPropertyValue("--faint").trim(),
    tools: qa(".tool").map((t) => { const r = t.getBoundingClientRect(), img = t.querySelector("img"); return { name: t.querySelector(".tool-name").textContent.trim(), top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), loaded: img.complete && img.naturalWidth > 0, alt: img.getAttribute("alt"), opacity: +cs(t).opacity }; }),
    roles: qa(".role").map((c) => { const r = c.getBoundingClientRect(), a = getComputedStyle(c, "::after"); return { index: c.querySelector(".role-index").textContent.trim(), company: c.querySelector(".role-company").textContent.trim(), role: c.querySelector(".role-title").textContent.trim(), top: Math.round(r.top), left: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), path: a.content !== "none" && a.content !== "normal" && (parseFloat(a.borderRightWidth) > 0 || parseFloat(a.borderLeftWidth) > 0), opacity: +cs(c).opacity }; }),
    workHeading: (() => { const h = q("#work h2"); return h ? { text: h.textContent.trim(), hidden: h.getBoundingClientRect().width <= 1 } : null; })(),
    frame: docR(q(".frame--rest")), header: doc(q(".site-header")), headerRow: doc(q(".site-header-row")),
    bars: qa(".section-bar").map((b) => ({ ...docR(b), text: [...b.children].map((c) => c.textContent.trim()).join(" "), bg: cs(b).backgroundColor })),
    hero: doc(q(".hero")), footer: docR(q(".footer")), docH: document.documentElement.scrollHeight,
    marks: qa(".frame-mark").length,
    name: doc(q(".site-header-name")), group: doc(q(".site-header-group")),
    navVisible: cs(q(".site-header-nav")).display !== "none",
    cta: { radius: cs(q(".site-header-cta")).borderRadius, bg: cs(q(".site-header-cta")).backgroundColor, text: q(".site-header-cta").textContent.trim() },
    dot: !!q(".site-header-link[aria-current] .site-header-dot"),
    badge: q(".hero-badge").textContent.trim(),
    headline: [q(".hero-headline > span:first-child"), q(".hero-roll")].map((s) => ({ text: s === q(".hero-roll") ? (qa(".hero-roll-phrase").find((p) => +cs(p).opacity > 0.9) || {}).textContent || "" : s.textContent.trim(), color: cs(s).color, weight: cs(s).fontWeight, h: s.getBoundingClientRect().height })),
    roll: { phrases: qa(".hero-roll-phrase").map((p) => p.textContent.trim()), said: (q(".hero-headline .visually-hidden") || {}).textContent || "", hidden: q(".hero-roll").getAttribute("aria-hidden") },
    headlineSize: parseFloat(cs(q(".hero-headline")).fontSize),
    note: { text: q(".hero-note").textContent.trim(), lines: Math.round(q(".hero-note").getBoundingClientRect().height / parseFloat(cs(q(".hero-note")).lineHeight)) },
    headings: qa(".section-heading").map((h) => ({ text: h.textContent.trim(), size: parseFloat(cs(h).fontSize), centre: Math.round((h.getBoundingClientRect().left + h.getBoundingClientRect().right) / 2) })),
    approachBg: cs(q(".approach-body")).backgroundImage,
    line: doc(q(".approach-line")),
    steps: qa(".approach-step").map((s) => ({ title: s.querySelector("h3").textContent.trim(), desc: s.querySelector("p").textContent.trim().length, opacity: +cs(s).opacity, marker: cs(s.querySelector(".approach-marker")).backgroundColor, cx: Math.round(s.querySelector(".approach-marker").getBoundingClientRect().left + s.querySelector(".approach-marker").getBoundingClientRect().width / 2), top: Math.round(s.getBoundingClientRect().top) })),
    bar: cs(document.documentElement).getPropertyValue("--bar").trim(),
    cards: qa(".project-item").map((li) => { const m = li.querySelector(".project-media").getBoundingClientRect(), img = li.querySelector("img"), t = li.querySelector(".project-title").getBoundingClientRect(); return { title: li.querySelector(".project-title").textContent, tag: li.querySelector(".project-tag").textContent, left: Math.round(m.left), right: Math.round(m.right), top: Math.round(m.top), aspect: +(m.width / m.height).toFixed(3), loaded: img.complete && img.naturalWidth > 0, captionLeft: Math.round(t.left), opacity: +cs(li).opacity }; }),
    about: { photo: docR(q(".about-photo")), bio: docR(q(".about-bio")), hello: { text: q(".about-hello").textContent, color: cs(q(".about-hello")).color }, paragraphs: qa(".about-bio p").length, photoLoaded: q(".about-photo img").complete && q(".about-photo img").naturalWidth > 0 },
    foot: { labels: qa(".footer-label").map((l) => l.textContent.trim()), mail: q(".footer-email").getAttribute("href"), copyright: q(".footer-copyright").textContent.trim(), character: docR(q(".footer-character")), characterLoaded: q(".footer-character").complete && q(".footer-character").naturalWidth > 0, deadLinks: qa(".footer a").filter((a) => !a.getAttribute("href") || a.getAttribute("href") === "#").length },
    links: qa('a[href^="#"]').map((a) => a.getAttribute("href")).filter((h, i, all) => all.indexOf(h) === i).map((h) => ({ href: h, exists: !!document.getElementById(h.slice(1)) })),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
async function open(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}
/* Walk the page once: lazy images load, reveals are seen. */
const walk = async (page) => { const h = await page.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y <= h; y += 450) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(260); } await page.waitForTimeout(1200); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500); };

/* ---------- 1440: the frame itself ---------- */
{
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 } });
  const before = await page.evaluate(probe);
  ok("opens on the splash: the room, the greeting on its monitor", before.splash.room === 1 && before.splash.greeting === 1, JSON.stringify(before.splash));
  ok("no menu bar over the room at rest (it comes in with the hero)", before.chrome === 0, `header opacity ${before.chrome}`);
  ok("below the fold waits to be seen (reveals)", before.cards.every((c) => c.opacity === 0), JSON.stringify(before.cards.map((c) => c.opacity)));
  await walk(page);
  /* The page proper is measured at the pin's release: the hero at native scale at the top and
     everything after it resting where the page goes on. */
  await page.evaluate(() => scrollTo(0, document.querySelector(".splash-track").offsetHeight - innerHeight)); await page.waitForTimeout(1800);
  const s = await page.evaluate(probe);
  ok("hero arrived: room and greeting gone, hero at native scale under the header", s.splash.room === 0 && s.splash.greeting === 0 && near(s.splash.scale, 1, 0.01) && near(s.hero.top - scrollY_(s), s.header.h + 1, 2), JSON.stringify({ ...s.splash, heroTop: s.hero.top - scrollY_(s), header: s.header.h }));

  /* The header is rendered through the splash (it is kept out of the room and brought in with
     the hero), so in DOM order it sits inside the #top section. */
  ok("order: header (in the splash), hero, approach, tools, experience, projects, about, footer", s.order.join(",") === "top,header,approach,tools,experience,work,about,contact", s.order.join(","));

  const u = s.frame.w / 840; // one frame pixel
  ok("column: 1120 at a 1440 window (its floor), centred", near(s.frame.w, 1120, 2) && near(s.frame.left + s.frame.right, 1440 - 15, 18), `${s.frame.left}..${s.frame.right} (${s.frame.w})`);
  ok("header 64 frame-px tall, its row in the same column", near(s.header.h, 64 * u, 2) && near(s.headerRow.left, s.frame.left, 1) && near(s.headerRow.right, s.frame.right, 1), `h ${s.header.h} (64u = ${(64 * u).toFixed(0)})`);
  /* The updated frame: sections 451 tall where their content allows (My approach and Tools &
     AI do exactly), Experience 553, the hero still 553. They are minimums: a section with more
     17px copy than the frame's type grows, never shrinks below. */
  const B = s.bodies, U = (n) => `${n} (${(n / u).toFixed(0)}u)`;
  ok("hero is still the frame's 553 tall", near(s.hero.h, 553 * u, 6), `hero ${U(s.hero.h)}`);
  ok("sections brought down to the updated frame's 451: My approach and Tools & AI exactly", near(B.approach, 451 * u, 3) && near(B.tools, 451 * u, 3), `approach ${U(B.approach)}, tools ${U(B.tools)} (451u = ${(451 * u).toFixed(0)})`);
  ok("the rest at least 451 (Experience at least 553), growing only where their content needs the room", B.work >= 451 * u - 2 && B.about >= 451 * u - 2 && B.experience >= 553 * u - 2, `experience ${U(B.experience)}, work ${U(B.work)}, about ${U(B.about)}`);
  ok("bars span the frame, charcoal, named and numbered as in the updated frame", s.bars.every((b) => near(b.w, s.frame.w - 2, 3)) && s.bars.map((b) => b.text.toUpperCase()).join("|") === "01 MY APPROACH|02 TOOLS & AI|03 EXPERIENCE|04 SELECTED WORK|05 ABOUT ME", s.bars.map((b) => b.text).join(" | "));
  ok("footer closes the frame", near(s.footer.bottom, s.frame.bottom, 3), `footer bottom ${s.footer.bottom}, frame bottom ${s.frame.bottom}`);
  ok("four orange corner marks", s.marks === 4, `${s.marks}`);

  ok("header: name left, nav and Contact grouped right", s.name.left < s.frame.left + 120 * u && s.group.left > 720 && near(s.group.right, s.frame.right - 52 * u, 5), `name ${s.name.left}, group ${s.group.left}..${s.group.right}`);
  ok("Contact: square-cornered orange button; active dot under Welcome", s.cta.radius === "0px" && s.cta.bg === s.accent && s.cta.text === "Contact" && s.dot, JSON.stringify(s.cta));

  ok("hero headline: the frame's lead, and its phrase first of the rolling ones", s.headline[0].text === "I design products that" && s.roll.phrases[0] === "make life easier." && s.roll.phrases.length === 7 && s.roll.said === "make life easier." && s.roll.hidden === "true", `"${s.headline[0].text}" / ${s.roll.phrases.join(" | ")}`);
  /* The second line rolls (RollingPhrase.tsx): watch it change, and that nothing around it moves. */
  {
    const look = () => page.evaluate(() => { const vis = [...document.querySelectorAll(".hero-roll-phrase")].find((p) => +getComputedStyle(p).opacity > 0.9); const box = (sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top); return { phrase: vis ? vis.textContent.trim() : "", lead: box(".hero-headline > span:first-child"), note: box(".hero-note"), roll: box(".hero-roll") }; });
    const seen = [await look()];
    for (let i = 0; i < 6; i++) { await page.waitForTimeout(1100); seen.push(await look()); }
    const phrases = [...new Set(seen.map((x) => x.phrase).filter(Boolean))];
    ok("hero: the orange line rolls on to the next phrase every couple of seconds", phrases.length >= 3 && phrases.every((p) => s.roll.phrases.includes(p)), phrases.join(" -> "));
    ok("hero: nothing around it moves while it rolls (the lead line and the subtitle stay put)", new Set(seen.map((x) => x.lead)).size === 1 && new Set(seen.map((x) => x.note)).size === 1 && new Set(seen.map((x) => x.roll)).size === 1, `lead ${[...new Set(seen.map((x) => x.lead))]}, note ${[...new Set(seen.map((x) => x.note))]}`);
  }
  ok("second line orange and bold; each line on one line", s.headline[1].color === s.accent && +s.headline[1].weight >= 700 && s.headline.every((h) => h.h < s.headlineSize * 1.4), `${s.headline[1].color} ${s.headline[1].weight}`);
  ok("subtitle, exactly, on one line", s.note.text === "6 years of connecting user needs with business goals" && s.note.lines === 1, `${s.note.lines} line(s)`);
  ok("role badge", s.badge.toUpperCase() === "YONATAN BUDAGOV SENIOR PRODUCT DESIGNER", s.badge);
  ok("hero headline at the scale's display size (48-56)", s.headlineSize >= 48 && s.headlineSize <= 56, `${s.headlineSize}px`);

  ok("About Me keeps its small centred heading", s.headings.map((h) => h.text).join("|") === "About Me" && s.headings.every((h) => near(h.centre, (s.frame.left + s.frame.right) / 2, 8)), s.headings.map((h) => `${h.text}@${h.centre}`).join(", "));
  ok("About Me heading about half the hero's size (26 vs 56)", s.headings.every((h) => near(h.size, 26, 0.1)) && s.headings[0].size / s.headlineSize < 0.6, `${s.headings[0].size}px / ${s.headlineSize}px`);
  const faintRgb = (() => { const n = parseInt(s.faint.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; })();
  ok("the updated frame's openings, in its words: My approach, Tools & AI, Experience", s.titles.map((t) => `${t.section}: ${t.lead} / ${t.rest}`).join(" | ") === "approach: My approach to / designing better products | tools: How I use AI & Tools / to bring ideas to life | experience: The experiences / that shaped me" && s.titles.every((t) => t.lede.length > 60), s.titles.map((t) => `${t.lead} / ${t.rest}`).join(" | "));
  ok("openings: two lines, ink then grey, the headline size, left-aligned on one edge", s.titles.every((t) => t.restTop > t.leadTop && t.restColor === faintRgb && t.leadColor !== faintRgb && t.size === 36) && new Set(s.titles.map((t) => t.left)).size === 1 && s.titles[0].left < s.frame.left + 60 * u, `left ${[...new Set(s.titles.map((t) => t.left))].join(",")}, sizes ${[...new Set(s.titles.map((t) => t.size))].join(",")}`);
  ok("Selected work opens on the cards: no visible heading, one for a screen reader", !!s.workHeading && s.workHeading.hidden && s.workHeading.text === "Selected work", JSON.stringify(s.workHeading));

  ok("tools: the seven, in the frame's order, one row, marks loaded, names as the text", s.tools.map((t) => t.name).join(",") === "Cursor,Claude,Figma,OpenAI,Vercel,GitHub,Supabase" && new Set(s.tools.map((t) => t.top)).size === 1 && s.tools.every((t) => t.loaded && t.alt === "" && t.opacity === 1), s.tools.map((t) => t.name).join(", "));
  ok("tools: on the same left edge as the section's opening", near(s.tools[0].left, s.titles.find((t) => t.section === "tools").left, 2), `tiles from ${s.tools[0].left}, heading at ${s.titles.find((t) => t.section === "tools").left}`);
  const R = s.roles;
  ok("experience: the five roles, A1 to A5, in order", R.map((r) => `${r.index} ${r.company}`).join(" | ") === "A1 Military Intelligence | A2 B.Studios | A3 Ministry of Defense | A4 Playtika | A5 Simply" && R.every((r) => r.opacity === 1), R.map((r) => r.company).join(", "));
  ok("experience: a zig-zag reading left to right, A1, A3, A5 on top and A2, A4 below", R.every((r, i) => i === 0 || r.left > R[i - 1].left) && R[0].top === R[2].top && R[2].top === R[4].top && R[1].top === R[3].top && R[1].top > R[0].bottom, R.map((r) => `${r.index}@${r.left},${r.top}`).join(" "));
  ok("experience: a dotted path from each role to the next, none after the last", R.slice(0, 4).every((r) => r.path) && !R[4].path, R.map((r) => r.path ? "path" : "-").join(" "));
  /* The arrows travelling the dotted path (ExperienceRoute.tsx). Bring the section into view
     (they run only while it is on screen), then sample them twice. */
  {
    const y = await page.evaluate(() => { const m = document.querySelector(".experience-map").getBoundingClientRect(); return Math.round(m.top + scrollY - 160); });
    await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(1600);
    const shot = () => page.evaluate(() => {
      const legs = [...document.querySelectorAll(".role")].flatMap((c) => {
        const a = getComputedStyle(c, "::after"); if (a.content === "none" || a.content === "normal") return [];
        const r = c.getBoundingClientRect(), x = r.left + parseFloat(a.left), yy = r.top + parseFloat(a.top);
        const w = parseFloat(a.width) + (parseFloat(a.borderLeftWidth) || 0) + (parseFloat(a.borderRightWidth) || 0), h = parseFloat(a.height) + (parseFloat(a.borderTopWidth) || 0) + (parseFloat(a.borderBottomWidth) || 0);
        const out = [];
        if (parseFloat(a.borderTopWidth)) out.push({ kind: "h", y: yy + 0.5, from: x, to: x + w });
        if (parseFloat(a.borderBottomWidth)) out.push({ kind: "h", y: yy + h - 0.5, from: x, to: x + w });
        if (parseFloat(a.borderRightWidth)) out.push({ kind: "v", x: x + w - 0.5, from: yy, to: yy + h });
        return out;
      });
      return [...document.querySelectorAll(".route-arrow")].map((el) => {
        const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, o = +getComputedStyle(el).opacity;
        const onLine = legs.some((l) => l.kind === "h" ? Math.abs(cy - l.y) <= 2 && cx >= l.from - 2 && cx <= l.to + 2 : Math.abs(cx - l.x) <= 2 && cy >= l.from - 2 && cy <= l.to + 2);
        return { cx: Math.round(cx), cy: Math.round(cy), o, onLine };
      });
    });
    const a1 = await shot(); await page.waitForTimeout(500); const a2 = await shot();
    const seen = a1.filter((x) => x.o > 0.05);
    ok("experience: arrowheads travel the dotted path, several at once, on the dashes", a1.length >= 4 && seen.length >= 3 && seen.every((x) => x.onLine), `${a1.length} arrows, ${seen.length} showing, ${seen.filter((x) => !x.onLine).length} off the line`);
    ok("experience: and they move (a loop, not a picture)", a1.some((x, i) => a2[i] && (Math.abs(x.cx - a2[i].cx) + Math.abs(x.cy - a2[i].cy)) >= 10), a1.map((x, i) => `${Math.abs(x.cx - a2[i].cx) + Math.abs(x.cy - a2[i].cy)}px`).join(" "));
  }
  ok("experience: inside the frame, on the section's left edge", R[0].left >= s.titles.find((t) => t.section === "experience").left - 2 && R[4].right <= s.frame.right - 30 * u, `${R[0].left}..${R[4].right}, frame ..${s.frame.right}`);

  ok("approach: plain ground, no grid", s.approachBg === "none", s.approachBg);
  ok("approach: all four steps shown together, titles and descriptions", s.steps.length === 4 && s.steps.every((st) => st.opacity === 1 && st.title && st.desc > 40) && new Set(s.steps.map((st) => st.top)).size === 1, JSON.stringify(s.steps.map((st) => st.opacity)));
  const barRgb = (() => { const n = parseInt(s.bar.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; })();
  ok("approach: only the first circle orange, the rest charcoal", s.steps[0].marker === s.accent && s.steps.slice(1).every((st) => st.marker === barRgb), s.steps.map((st) => st.marker).join(" | "));
  ok("approach: rule across the whole frame, circles evenly spaced", near(s.line.w, s.frame.w - 2, 3) && near(s.steps[1].cx - s.steps[0].cx, 205 * u, 3) && near(s.steps[3].cx - s.steps[2].cx, 205 * u, 3), `line ${s.line.w}, circles ${s.steps.map((st) => st.cx).join(", ")}`);

  ok("projects: three equal 2:3 crops in a row, 5px gaps, images loaded", s.cards.length === 3 && s.cards.every((c) => near(c.aspect, 0.667, 0.01) && c.loaded && c.top === s.cards[0].top) && near(s.cards[1].left - s.cards[0].right, 5 * u, 1.5), JSON.stringify(s.cards.map((c) => [c.left, c.right])));
  ok("projects: order kept, captions left-aligned under each", s.cards.map((c) => c.title).join(",") === "Second Office,Weekly Challenge,Joyn" && s.cards.every((c) => c.captionLeft === c.left && c.tag), s.cards.map((c) => c.title).join(","));
  ok("projects: group centred, 670 frame-px wide", near(s.cards[2].right - s.cards[0].left, 670 * u, 3) && near((s.cards[0].left + s.cards[2].right) / 2, (s.frame.left + s.frame.right) / 2, 3), `${s.cards[0].left}..${s.cards[2].right}`);

  ok("about: photo left, biography right, orange introduction", s.about.photo.right < s.about.bio.left && s.about.hello.text === "Nice to meet you!" && s.about.hello.color === s.accent && s.about.paragraphs === 4 && s.about.photoLoaded, `photo ..${s.about.photo.right}, bio ${s.about.bio.left}..`);
  ok("footer: Contact, Sitemap, Elsewhere, copyright", s.foot.labels.join("|").toUpperCase() === "CONTACT|SITEMAP|ELSEWHERE" && s.foot.mail === "mailto:Budagovy@gmail.com" && /2026 Yonatan Budagov/i.test(s.foot.copyright), s.foot.labels.join(" | "));
  ok("footer: character at the bottom right, standing on the frame's edge", s.foot.characterLoaded && s.foot.character.left > s.frame.left + s.frame.w * 0.6 && near(s.foot.character.bottom, s.frame.bottom, 3), `x ${s.foot.character.left}, bottom ${s.foot.character.bottom} vs ${s.frame.bottom}`);
  ok("no dead links in the footer (unknown addresses are plain text)", s.foot.deadLinks === 0, `${s.foot.deadLinks}`);
  {
    const links = await page.evaluate(() => ({
      elsewhere: [...document.querySelectorAll(".footer a")].filter((a) => /linkedin|instagram/i.test(a.href)).map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel") })),
      ctas: [...document.querySelectorAll(".about-cta")].map((a) => ({ text: a.childNodes[0].textContent.trim(), said: a.textContent.trim(), href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel"), bg: getComputedStyle(a).backgroundColor, h: Math.round(a.getBoundingClientRect().height) })),
    }));
    const E = Object.fromEntries(links.elsewhere.map((l) => [l.text, l]));
    ok("footer: LinkedIn and Instagram lead to the owner's profiles, in a new tab", E.LinkedIn?.href === "https://www.linkedin.com/in/yonatan-budagov-12245a186/" && E.Instagram?.href === "https://www.instagram.com/budagovy/" && links.elsewhere.every((l) => l.target === "_blank" && /noopener/.test(l.rel)), links.elsewhere.map((l) => `${l.text} ${l.href}`).join(" | "));
    const [p, sec] = links.ctas;
    ok("about: two calls to action, the primary first: Let's Talk! (WhatsApp) and Resume", links.ctas.length === 2 && p.text === "Let\u2019s Talk!" && p.href === "https://wa.me/972502434399" && sec.text === "Resume" && sec.href === "/Yonatan-Budagov-CV-2026.pdf" && links.ctas.every((a) => a.target === "_blank" && /noopener/.test(a.rel)), links.ctas.map((a) => `${a.text} -> ${a.href}`).join(" | "));
    ok("about: the primary in the accent, the secondary an outline; both tall enough to tap, and say where they go", p.bg === s.accent && sec.bg === "rgba(0, 0, 0, 0)" && links.ctas.every((a) => a.h >= 44 && a.said.length > a.text.length), links.ctas.map((a) => `${a.h}px, "${a.said}"`).join(" | "));
    const pdf = await page.evaluate(async () => { const r = await fetch("/Yonatan-Budagov-CV-2026.pdf"); return { status: r.status, type: r.headers.get("content-type"), size: (await r.arrayBuffer()).byteLength }; });
    ok("about: the resume is there, a PDF", pdf.status === 200 && /pdf/.test(pdf.type) && pdf.size > 5000, JSON.stringify(pdf));
  }

  ok("every in-page link has a real target", s.links.length >= 4 && s.links.every((l) => l.exists), s.links.map((l) => `${l.href}${l.exists ? "" : " MISSING"}`).join(" "));
  for (const [label, id] of [["About Me", "about"], ["Contact", "contact"], ["Projects", "work"], ["Welcome", "top"]]) {
    await page.click(`.site-header a:text-is("${label}")`);
    await page.waitForTimeout(2300);
    const r = await page.evaluate((id) => { const el = document.getElementById(id), pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop); const max = document.documentElement.scrollHeight - innerHeight; return { top: Math.round(el.getBoundingClientRect().top), pad: Math.round(pad), atEnd: Math.round(scrollY) >= Math.round(max) - 1, atTop: Math.round(scrollY) === 0, visible: el.getBoundingClientRect().top < innerHeight - 40, hash: location.hash }; }, id);
    ok(`nav "${label}" lands on #${id}`, (id === "top" ? r.atTop : (near(r.top, r.pad, 2) || (r.atEnd && r.visible))) && (id === "top" || r.hash === `#${id}`), `top ${r.top} (header ${r.pad})${r.atEnd ? ", page end" : ""}${r.atTop ? ", page top" : ""}`);
  }
  await page.screenshot({ path: `${OUT}page-1440.png` });
  ok("1440: no horizontal overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

/* ---------- another desktop width: the same picture, scaled ---------- */
{
  const { ctx, page, errors } = await open({ viewport: { width: 2544, height: 1276 } });
  await walk(page);
  await page.evaluate(() => scrollTo(0, document.querySelector(".splash-track").offsetHeight - innerHeight)); await page.waitForTimeout(1800);
  const s = await page.evaluate(probe);
  ok("2544: column is the frame's 58.33% again; geometry scales, type does not", near(s.frame.w, 2544 * 0.58333, 4) && s.headlineSize === 56 && s.headings[0].size === 26 && near(s.hero.h, 553 * (s.frame.w / 840), 6), `column ${s.frame.w}, headline ${s.headlineSize}px, hero ${s.hero.h}px`);
  ok("2544: no overflow, no console errors", s.overflow === 0 && errors.length === 0, `${s.overflow}px ${errors.join(" | ")}`);
  await ctx.close();
}

/* ---------- phone: stacked, nothing wider than the screen ---------- */
for (const [w, h] of [[390, 844], [768, 1024]]) {
  const { ctx, page, errors } = await open({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  await walk(page);
  const s = await page.evaluate(probe);
  ok(`${w}px: no horizontal overflow`, s.overflow === 0, `${s.overflow}px`);
  const cardRows = new Set(s.cards.map((c) => c.top)).size;
  ok(`${w}px: steps stacked, cards ${w < 700 ? "one per row" : "three across"}, all revealed and loaded`, new Set(s.steps.map((st) => st.top)).size === 4 && cardRows === (w < 700 ? 3 : 1) && s.cards.every((c) => c.opacity === 1 && c.loaded) && s.steps.every((st) => st.opacity === 1), `${cardRows} card row(s)`);
  ok(`${w}px: about ${w < 700 ? "stacks photo over biography" : "photo beside biography"}; everything inside the frame`, (w < 700 ? s.about.photo.bottom <= s.about.bio.top : s.about.photo.right <= s.about.bio.left) && s.about.bio.right <= s.frame.right && s.cards.every((c) => c.right <= s.frame.right) && s.foot.character.right <= s.frame.right, `bio ..${s.about.bio.right}, frame ..${s.frame.right}`);
  const toolRows = [...new Set(s.tools.map((t) => t.top))].map((top) => s.tools.filter((t) => t.top === top).length);
  ok(`${w}px: tools ${w < 700 ? "wrap four and three" : "in one row"}, inside the frame`, toolRows.join("+") === (w < 700 ? "4+3" : "7") && s.tools.every((t) => t.right <= s.frame.right), toolRows.join("+"));
  ok(`${w}px: the roles stack in order down one column, joined by the path`, s.roles.every((r, i) => i === 0 || r.top > s.roles[i - 1].bottom) && new Set(s.roles.map((r) => r.left)).size === 1 && s.roles.slice(0, 4).every((r) => r.path) && s.roles.every((r) => r.right <= s.frame.right), `${s.roles.length} roles at x ${[...new Set(s.roles.map((r) => r.left))].join(",")}`);
  ok(`${w}px: the stacked cards' short dotted ticks stay still (no travelling arrows)`, (await page.locator(".route-arrow").count()) === 0, "");
  ok(`${w}px: openings stay two lines, ink then grey`, s.titles.length === 3 && s.titles.every((t) => t.restTop > t.leadTop), s.titles.map((t) => t.section).join(","));
  ok(`${w}px: no console errors`, errors.length === 0, errors.join(" | "));
  await page.screenshot({ path: `${OUT}page-${w}.png`, fullPage: true });
  await ctx.close();
}

/* ---------- reduced motion: everything there, no hydration mismatch ---------- */
{
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await walk(page);
  const s = await page.evaluate(probe);
  ok("reduced motion: flat splash (room above, page below), all content shown, no hydration mismatch", (await page.locator(".splash-flat").count()) === 1 && s.headline[1].text === "make life easier." && s.steps.every((st) => st.opacity === 1) && s.cards.every((c) => c.opacity === 1) && s.tools.every((t) => t.opacity === 1) && s.roles.every((r) => r.opacity === 1) && (await page.locator(".route-arrow").count()) === 0 && !errors.some((e) => /hydrat/i.test(e)), errors.join(" | "));
  await ctx.close();
}

await browser.close();
console.log(fails.length ? `\nFAILED: ${fails.join("; ")}` : "\nALL PASS");
process.exit(fails.length ? 1 : 0);
