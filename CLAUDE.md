# Yonatan Budagov portfolio - project rules

One page, built to match the owner's Figma frame. Next.js 16 (Turbopack),
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

`src/app/page.tsx` is the composition and reads in that order.

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
- Case-study links for the three projects (`href: null`).
- `src/app/icon.svg` is still a placeholder mark.

## What was here before, and where it went

Until the "match the Figma frame" commit the page opened with a splash: a
desk video whose monitor showed a greeting, and scrolling zoomed into the
monitor until the hero was the page; the hero's second line rotated through
seven phrases; "My approach" was held in place while scroll revealed its
steps one by one, the next section kept in view beneath it. The frame has
none of that ("without requiring an introductory scroll sequence", "show
all four step titles and descriptions simultaneously", "replace the
rotating phrases"), so the components, their content, their gates and the
video were removed. It was careful work and is all in git: the last commit
with it is `9675ac1`, where the old CLAUDE.md also documents the hard
parts (the monitor calibration, the single continuous hero, sticky holds
and resting positions, the cover that must never clear before the room has
gone).
