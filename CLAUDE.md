# Yonatan Budagov portfolio - project rules

A homepage that opens with the splash (the desk video, the greeting on
its monitor, the scroll that walks into the screen) and arrives on the
page built to match the owner's Figma frame; plus case-study pages under
`/work/<slug>` (see "Case studies"). Next.js 16 (Turbopack),
React 19, Motion (`motion/react`), Lenis, Tailwind v4 (imported, barely
used; the stylesheet is hand-written in `src/app/globals.css`).

## The source of truth is the Figma frame

A single 1440 x 2568 frame, which the owner sent as a PDF export and asked
to have treated as "the visual source of truth". Order: header, then
inside a thin grey bordered frame with an orange mark in each corner: hero
with the city strip, My approach, Selected Projects, About Me, footer. Each
section after the hero opens with a thin charcoal bar ("01 HOW I DO IT",
"02 WHAT I DO", "03 WHO DOING IT"). Plain cream inside the frame, a faint
horizontal grain outside it.

`src/app/page.tsx` is the composition and reads in that order, wrapped in
the splash (see "The splash"). Other routes use `PageFrame`: the header,
the bordered frame with its corner marks and the footer.

**Geometry scales; type sizes do not.** Two systems in `globals.css`,
deliberately separate:

- *Geometry* follows the frame. `--u` is one frame pixel, the column's
  width / 840, and every box, gap and offset is the number read off the
  frame times `--u`.
- *Type sizes* are the owner's fixed scale, in rem: **14** small / labels /
  metadata / nav / footer, **17** body and descriptions, **26** section and
  project titles, **36** headlines (defined; for case-study pages), and a
  hero display of **48-56 maximum** (`--fs-display`, a clamp: 56 on
  desktop, 32 on a phone), used on the hero headline only. No other font
  size may appear anywhere, including inside the city strip's shadow DOM:
  `npm run qa:type` reads every visible text run at five widths and fails
  on any other size.

**Sizes ONLY. The typeface, weights, letter-spacing and colours are the
owner's and are not to be "improved".** The first pass at this scale also
retuned weights, tracking, text colours (for WCAG contrast) and rendering
settings; the owner's reaction was "you changed all website font ... i
asked you to change only the Sizes", and it was all reverted: the
stylesheet was rebuilt from the live one with nothing but size values (and
the room they need) changed, and a diff proved no weight, tracking, colour
or family line differed. Several of the owner's colours are under WCAG
contrast (orange as text 1.9:1, the faint grey 3.5:1); `qa:type` measures
and REPORTS these as NOTE lines and does not fail on them. Raise it with
the owner; do not fix it unasked.

Where fixed type meets proportional geometry: 17px body in the frame's
840px column gave the four approach columns ~23 characters a line, so the
column is `clamp(1120px, 58.333vw, 1540px)`: never under 1120, the
frame's 58.33% again from 1920px up (the owner's own screen is ~2544px,
where nothing about the layout changed). Below 1184px that column no
longer fits and everything stacks (a vertical timeline, photo over
biography; cards three across from 700px, one per row below). Sections
keep the frame's 553-unit minimum height and grow where 17px copy needs
it. A few fixed-height boxes became minimums so 14px text fits them (the
section bar, the Contact button, the badge, the approach circles).

**Measuring the frame.** The PDF's text is outlined (no extractable text
runs), so sizes and positions were read from a 1:1 render (pdf.js in
Chrome via Playwright; no PDF tools are installed on the owner's machine).
That render substitutes some faces, so typefaces were NOT taken from it:
the site keeps Google Sans Flex. Where that face sets narrower than the
frame's, measures were tightened until lines break on the same words (the
approach descriptions, the biography). The PDF's embedded images ARE the
originals and were extracted from it: the three project images
(941 x 1672), the about photo, and the footer character (with alpha), now
under `public/projects`, `public/about`, `public/footer`. The Second
Office image is enlarged 1.41x inside its crop in the frame, Travelito
1.02x; that is `zoom` in `content/projects.json`. (An older Second Office
image sits hidden beneath the visible one in the file. Ignore it.)

**Comparing.** `QA_REF=<reference.png> npm run qa:compare` screenshots the
full page at 1440 and tiles it beside the reference at the same scale
(`qa/frames/compare-N.png`). Since the type scale replaced the frame's
proportional type, expect the text to differ from the reference by
design; the comparison is for structure and spacing. The reference is not in the repo (11MB, the
owner's file). Fix layout and spacing first, then type, colour, borders,
artwork: the owner's stated order.

## Rules

- No copy in component files. Strings live in `content/`.
- No em-dash in visible copy.
- Animate transform and opacity only. No scroll event listeners. (Lenis,
  in `SmoothScroll.tsx`, handles wheel input: it drives the scroll
  position rather than reading it.)
- Timings live in `src/lib/motion.ts`. Tokens live in `globals.css`.
- **Nothing that differs between server and client may reach the first
  render**: no `Date.now()`, `Math.random()`, `window.*`, and no
  `useReducedMotion()`, in a render's output or a `useState` initial
  value. The server cannot know any of them. `Reveal.tsx` learned this
  twice in one day: first by choosing its initial variant from
  `useReducedMotion()`, then, with that fixed, by giving the hidden
  variant a different `y` under reduced motion. Motion writes the hidden
  state into the server-rendered style, so both were hydration mismatches.
  Only the *transition* may depend on the preference.
- A link whose address is not known yet is rendered as plain text, never
  as a dead `href="#"` (`SiteFooter`'s `href: null`).

## The pieces

- **`SiteHeader`**: fixed; only its 840 column is painted, so the grain
  shows either side as it does beside the frame. Name left; nav and the
  Contact button grouped right; Contact is a compact square-cornered
  rectangle; small orange dot under the active item.
- **`Hero`**: static. Role badge, the two-line headline ("I design
  products that" / "make life easier.", the second line orange and bold),
  one line of subtitle, the city strip on the foot. It is what the page
  opens on: the frame has no introductory sequence.
- **`CityStrip`** wraps `<portfolio-city-strip>`, an approved web component
  (plain JS plus a `.d.ts`; `allowJs` is off) with assets in
  `public/city-strip/`. It is imported inside an effect because the module
  touches `document` at import time. Its stylesheet lives in its shadow
  root, so every size the page needs to set is exposed as a custom
  property whose fallback is the approved value (`--strip-scene-h`,
  `--strip-walker-h`, `--strip-company`, `--strip-next`, ...): untouched,
  it looks as delivered. The page sets them to the frame's numbers, hides
  the "next" control (not in the frame) and makes the walker 38% of the
  scene (the default, 82%, towered over the skyline). The headings still
  cycle every 1.5s, an approved behaviour; the first is the frame's
  "01 Playtika - Product Designer", which is why it leads
  `content/experience.json`.
- **`SectionBar`**: the charcoal bar. Decorative (`aria-hidden`); the
  section's real heading is its `h2`.
- **`Approach`**: small centred heading; a rule across the whole frame
  through four evenly spaced numbered circles, the first orange and the
  rest charcoal; all four titles and descriptions shown together.
- **`Projects`**: small centred heading; three equal 2:3 crops, 5-unit
  gaps, small left-aligned title and tag.
- **`About`**: photo left, biography right, opening with an orange
  "Nice to meet you!". A newline inside a paragraph in `about.json` is a
  line break, as set in the frame.
- **`SiteFooter`**, `id="contact"`: Contact, Sitemap, Elsewhere,
  copyright, and the illustrated character standing on the frame's bottom
  edge at the right.
- **`Reveal`** (`RevealGroup`, `RevealItem`): the site's one animation. A
  fade with a small rise, once, as the element enters; items in a group a
  beat apart. Under reduced motion it is a cut.

## Case studies

`/work/<slug>`, currently Second Office. Built from a design handoff the
owner supplied (a one-page PDF as visual reference, an approved-copy
file, phone cutouts and research boards). Travelito and Joyn are meant to
follow on the same system.

**How it is put together.** A case study is a hero plus an ordered list of
typed blocks: `section` (label, heading, optional intro; nests its own
blocks), `columns`, `stats`, `note`, `quote`, `mediaText` (an image or
phones beside text), `callout` (the dark panel), `steps`, `flow` (phone,
title, detail crop, text per step), `gallery`, `aside`, `rule`, `band`.
The vocabulary is `src/components/case-study/types.ts`; `Blocks.tsx`
renders it; `CaseStudy.tsx` is the page. **Adding a project is content,
not components:** write `content/work/<slug>.json`, import it in
`src/lib/work.ts`, and point the project's `href` in
`content/projects.json` at `/work/<slug>`. The route
(`src/app/work/[slug]/page.tsx`) generates every registered slug
statically (`dynamicParams = false`), so each URL loads and refreshes
directly and anything else is a 404. A different project can use the
blocks in a different order; add a block type only when a project needs a
layout none of them can express.

**Rules the owner set for it.**
- Live text and separate images: never the PDF embedded or a flattened
  image. The copy is the approved copy verbatim, in the approved order;
  no claims, metrics or content added. `QA_COPY=<One-Pager-copy.md> npm
  run qa:case` checks both directions: every approved line is on the
  page, and every sentence on the page is in the approved copy.
- The site's chrome, once: `PageFrame current="#work"` puts the shared
  header (Projects active), frame and footer round it. The handoff PDF's
  own header and footer lines ("Yonatan Budagov / Product design /
  Selected work", "SecondOffice") are document context and are NOT
  reproduced. Off the homepage, the header's and footer's hash links
  become "/#work" etc. through the router (`src/lib/links.ts`).
  "Back to projects" (top and end) goes to `/#work`.
- Cream ground `#FFF9E5`, ink `#16140E` (`--ink-strong`), accent
  `#F3B44A`, all from the site's tokens. Two colours are the case
  study's own, scoped under `.cs`: the pale research surface `#FBF0D5`
  and a quiet divider `#DAD4C2`.
- Phone mockups are the supplied `*-cutout.svg` files, straight on the
  cream: no white background, tray or container, and the colours inside
  the screens untouched. When they were copied into `public/work/`, each
  SVG's viewBox was trimmed to its own clip rectangle (the device sat
  off-centre in the canvas, with empty margin where a shadow had been),
  which changes nothing inside the device. The three detail crops under
  the booking flow are the same screens enlarged around a focus point
  (`detail.focus` in the content) and fill their panels edge to edge.
- In the research statistics only `78%`, `62%`, `82%` are orange; their
  descriptions are dark. No other orange text on cream (the labels on
  the dark callouts are orange on ink, 9:1).
- Headings and paragraphs left-aligned, THE BRIEF included: its label,
  heading, paragraph, columns and scope note share one left edge.
- Type is the SITE's scale, not the handoff's. The handoff asked for a
  hero up to 76px, 50px headings and 18-22px copy; it predates the
  owner's scale (14 / 17 / 26 / 36 / display), which they asked to hold
  "across all pages and case studies". So: h1 = display, section
  headings = 36 (the first use of that step), subheads and the quote =
  26, copy = 17, labels = 14. Hierarchy from the handoff, sizes from the
  site.
- A heading is a list of lines: one per line from 900px up, run together
  below, so a phone never gets a forced break.
- Natural scrolling: none of the homepage's reveals or guided landings.

**Expanding an image** (`Zoomable.tsx`): a real `<button>` round the image
and a native `<dialog>` opened with `showModal()`. The platform then does
focus trapping, Escape, and returning focus to the trigger; a backdrop
click closes it; `data-lenis-prevent` stops the page scrolling behind. No
library, no hand-rolled focus trap.

**Measure.** `ch` is the width of "0", which in Google Sans Flex is wider
than the average letter: a `66ch` cap set ~85 characters a line. The
caps in use (56-58ch) give 60-75.

**A bug this route exposed, fixed in `CityStrip.tsx`.** Pressing Back from
a case study crashed the homepage ("This page couldn't load"): `Cannot
set property speed of #<PortfolioCityStrip> which has only a getter`.
React 19 writes a JSX prop as a PROPERTY when the custom element is
already defined and has one by that name; on a first load it is not yet
defined, so `speed` went out as an attribute and nothing was wrong. The
second mount in one session (only possible once the site had a second
route) threw. The wrapper now sets `speed` and `asset-base` with
`setAttribute`. Do not pass them as JSX props again.

## The splash

The homepage opens on the desk video with "Nice to meet you." on the
monitor; scrolling pushes into the screen until the hero is the page.
It was removed in the Figma rebuild (`b1d65e8`) on a misreading of the
brief and the owner asked for it back: "why did you cancel the splash
screen with the video we already developed? i didnt ask for it ... keep
the home page as current version i like it, but add the splash screen".
Restored in commit `3d5c...` (see git log) from `9675ac1`, on top of the
current homepage without changing it. Do not remove it again.

**How it sits round the page.** `SplashScreen` takes two slots. The
children are the page's opening: `.splash-slot` (the header's space; the
header itself is fixed and floats above the video, as before), then
`.column.frame.frame--open` (the frame's top edge and side rules, the two
top corner marks) holding `Hero`. `next` is everything after: the rest of
the frame (`frame--rest`: side and bottom rules, bottom marks) with
approach, projects, about and the footer. The splash renders the opening
at viewport size inside the monitor's clip, scales it up with the scroll,
and holds `next` directly beneath the opening for the whole pin (a
sticky box marked `data-hold`), so the page is whole the moment the hero
arrives and reads on with no seam. The two frame halves are one frame to
the eye. The hero's own layout is untouched: it is the Figma frame's.

**Things learned restoring it.**
- The greeting is sized to read AS SEEN on the monitor (the stage is
  shown scaled down onto it, ~0.28 at 1440): `clamp(2.75rem, 12vw,
  11rem)`, about 48px on the screen. It is a picture on a monitor, not
  page text; `qa:type` skips `.splash-screen`.
- `CONTENT_WEIGHT` in `SplashScreen` is 0. The nudge that shrank the
  stage to fit the hero's copy inside the monitor was for a hero visible
  at rest; the monitor now shows the opaque greeting at rest, and on a
  phone the shrink opened a strip of raw footage at each side.
- The splash chooses pinned vs flat (reduced motion) in an EFFECT, never
  in the render: the server cannot know the preference, and choosing in
  the render was a hydration mismatch that had been there since the
  first version.
- `SmoothScroll` has `restingTop()` back: while the splash holds the page
  beneath it, a section's rectangle is not where it rests, so landings
  and anchor links use the resting position. Arriving with a hash (a case
  study's "Back to projects" is a Link to `/#work`) is settled the same
  way, on load and on every route change (`usePathname`), because the
  browser has already jumped to the current rectangle.
- `Hero` has no `id`; the splash section is `#top`.

**Gates.** `npm run qa:splash` (the monitor fit against the bezel, the
push, arrival, the hero content taking the click, the greeting fitting
the monitor on a phone, reduced motion). One check in it, "panel sits
inside the bezel", has failed since long before this work (a calibration
in `content/splash.json` at the video's last frame) and is deliberately
untouched. `qa:page` measures the homepage at the pin's release, where
the hero is at native scale.

## Scrolling

`SmoothScroll.tsx`, mounted in the root layout: Lenis inertia for wheel and
trackpad (touch stays native, keyboard is the browser's; not started under
reduced motion), anchor links that glide to land under the fixed header,
and guided scrolling.

Guided scrolling: the owner asked for "a subtle scroll-snapping /
guided-scroll behavior", "NOT aggressive or rigid". When wheel input has
been quiet for `SNAP.quiet` ms, if the glide in progress would come to
rest just short of a landing (the top, or a `data-snap` section's top
under the header) AHEAD in the direction of travel and within `SNAP.ahead`
of a screen, the glide is redirected onto it. Forward only, close only,
interruptible. It is hand-written because `lenis/snap` was read first and
rejected: its proximity mode snaps to the NEAREST point whichever way the
reader was going, so nudging one tick past a landing and pausing drags you
back, every time.

## QA

Dev server up (`npm run dev`, port 3220), a local Chrome (none is bundled;
path keyed by platform, `QA_CHROME` overrides), then:

- `npm run qa:type`: the type scale (above).
- `npm run qa` (= `qa:page`): the frame's geometry in column units; exact hero copy; all four approach steps at once with only the
  first circle orange; headings; about; footer; every in-page link has a
  target and the header nav lands on it; the column rule at 2544;
  stacked and overflow-free at 390 and 768; no console errors or hydration
  mismatches in either motion mode.
- `npm run qa:splash`: the splash (above).
- `npm run qa:case`: the case study (above): the card as one same-tab
  link, direct load and refresh, 404 for unknown slugs, the shared chrome,
  the approved copy both ways, section order, heading levels, colours,
  cutouts with nothing behind them, left alignment, measure, image
  proportions, the type scale, keyboard and zoom behaviour, and overflow
  at 1440 / 1024 / 768 / 390 / 320 and at 200% zoom.
- `npm run qa:scroll`: Lenis glides, settles exactly, native `scrollTo`
  still lands exactly, a nav anchor lands under the header, not started
  under reduced motion.
- `npm run qa:compare`: the visual side-by-side (above).

Tooling quirks on the owner's Windows machine: the Bash tool strips
backslashes from heredocs and `node -e`, so scripts containing Windows
paths must be written to a file; Python and poppler are not installed;
Playwright cannot load `file://` images from a blank page (use data URLs
or `page.route`).

## Open items, waiting on the owner

- LinkedIn and Instagram addresses (`content/footer.json`, `href: null`).
- Travelito and Joyn case studies (`href: null` in `content/projects.json`
  until they exist).
- Original Figma exports of the Second Office screens, if available: the
  supplied images are PDF-derived and fine UI text in them is soft when
  expanded.
- `src/app/icon.svg` is still a placeholder mark.

## What was here before, and where it went

Until the "match the Figma frame" commit the hero's second line rotated
through seven phrases; "My approach" was held in place while scroll revealed its
steps one by one, the next section kept in view beneath it. The frame has
none of that ("show all four step titles and descriptions
simultaneously", "replace the rotating phrases"), so those were removed.
(The splash was removed then too, wrongly, and has been restored: see
"The splash".) It was careful work and is all in git: the last commit
with it is `9675ac1`, where the old CLAUDE.md also documents the hard
parts (the monitor calibration, the single continuous hero, sticky holds
and resting positions, the cover that must never clear before the room has
gone).
