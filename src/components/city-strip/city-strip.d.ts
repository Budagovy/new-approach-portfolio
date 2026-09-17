/* Types for the plain-JS web component beside this file (tsconfig has
   allowJs off, so the .js is described here rather than compiled). */

export interface CityStripExperience {
  company: string;
  role: string;
}

export const DEFAULT_EXPERIENCES: CityStripExperience[];

export class PortfolioCityStrip extends HTMLElement {
  /** Replaces the headings and restarts the 1.5s cycle from the first. */
  experiences: CityStripExperience[];
  /** City scroll, CSS px per second, from the `speed` attribute. */
  readonly speed: number;
  greet(): void;
  next(): void;
}
