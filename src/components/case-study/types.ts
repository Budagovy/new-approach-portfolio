/**
 * The case-study vocabulary. A case study is a hero plus an ordered list of
 * blocks; every project uses the same blocks, in its own order, with its
 * own copy and images (content/work/<slug>.json). Adding a project means
 * writing that file and registering it in src/lib/work.ts, not new
 * components.
 *
 * A heading is a list of lines: set one per line where there is room, run
 * together where there is not, so narrow screens never get a forced break.
 */

export interface CaseImage {
  src: string;
  width: number;
  height: number;
  /** Meaningful for a product screen or a research board; "" for a decorative repeat. */
  alt: string;
  caption?: string;
}

export interface CasePhone extends CaseImage {
  /** Set larger than its neighbours (a hero's middle phone). */
  lead?: boolean;
}

/** A detail view: the same screen enlarged around a point of interest. */
export interface CaseDetail {
  src: string;
  width: number;
  height: number;
  /** x / y in percent of the image; zoom 1 = image as wide as its panel. */
  focus: { x: number; y: number; zoom: number };
}

export type CaseText =
  | { kind: "label"; text: string; tone?: "accent" }
  | { kind: "title"; text: string[] }
  | { kind: "paragraph"; text: string; tone?: "ink" };

/** An outside link shown as a phone with the label on its screen (a Figma prototype). */
export interface CasePrototype {
  label: string;
  href: string;
  /** What the link is for, for assistive technology ("Open the Figma prototype"). */
  title: string;
}

export type CaseBlock =
  | { type: "rule" }
  | { type: "bar" }
  | { type: "band" }
  | {
      type: "section";
      id: string;
      label: string;
      heading: string[];
      intro?: string;
      /** "surface": the pale research ground. */
      tone?: "surface";
      /** "split": heading left, intro right. */
      layout?: "split";
      blocks: CaseBlock[];
    }
  | { type: "columns"; items: { label: string; labelTone?: "accent"; title?: string; text: string }[] }
  | { type: "note"; label?: string; text: string }
  | { type: "stats"; items: { value: string; text: string }[] }
  | { type: "quote"; text: string; source: string }
  | { type: "mediaText"; side: "left" | "right"; figure?: CaseImage; phones?: CasePhone[]; text: CaseText[] }
  | { type: "callout"; label: string; heading: string[]; text?: string }
  | { type: "steps"; label?: string; items: string[] }
  | { type: "flow"; items: { phone: CasePhone; title: string; detail: CaseDetail; label: string; text: string }[] }
  | { type: "gallery"; columns?: number; items: CasePhone[]; prototype?: CasePrototype }
  | { type: "aside"; label: string; text: string };

export interface CaseStudyData {
  slug: string;
  meta: { title: string; description: string };
  hero: {
    eyebrow: string;
    heading: string[];
    lede: string[];
    facts: { label: string; value: string }[];
    phones: CasePhone[];
    /** "fan": the phones overlap in a row, each a step in front of the last. */
    phonesLayout?: "fan";
  };
  blocks: CaseBlock[];
}

export interface CaseStudyChrome {
  back: { label: string; href: string };
  zoom: { open: string; close: string };
}
