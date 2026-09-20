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

**Built to scale.** `--u` in `globals.css` is one frame pixel, 1/1440 of
the viewport's width, and every dimension is written as the number read
off the frame times `--u`. At a 1440px window the page is the frame (the
gate measures it: section bars within 2px, total height within 3px); at
any other desktop width it is the same picture scaled. This is deliberate,
not a shortcut: the frame's type is small at 1440 (headline 37px, body
11px) because it is a design canvas, and the owner views the site around
2500px wide, where it comes out at 65px and 19px. If something looks small
at 1440, that is the frame, not a bug; change it only if the owner asks.
A few micro sizes (bar labels, tags, 6px in the frame) carry a `max()` px
floor so they stay legible when `--u` is small.

Below 860px the side-by-side layouts cannot fit: `--u` becomes a fixed
1.35px, the column runs nearly edge to edge, and everything stacks (a
vertical timeline, one card per row, photo over biography). The frame has
no mobile design; this is ours, and the rule is only that it reads well
and nothing overflows.

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
(`qa/frames/compare-N.png`). The reference is not in the repo (11MB, the
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

- `npm run qa` (= `qa:page`): the page against the frame's numbers at
  1440; exact hero copy; all four approach steps at once with only the
  first circle orange; headings; about; footer; every in-page link has a
  target and the header nav lands on it; proportional scaling at 1920;
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
