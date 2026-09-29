import { CityStrip, type CityStripExperience } from "@/components/CityStrip";
import { RollingPhrase } from "@/components/RollingPhrase";
import { CITY } from "@/lib/motion";

export interface HeroData {
  badge: string;
  lead: string;
  /** The headline's second line, rolling; the first is the one the page opens on. */
  phrases: string[];
  note: string;
}

/**
 * The hero, the page's opening composition per the Figma frame: the role
 * badge, the two-line headline (second line orange and bold, rolling
 * through its phrases: RollingPhrase), one line of subtitle, and the city
 * strip along the foot with the career label above it. Every string comes
 * from content/.
 */
export function Hero({ data, experience }: { data: HeroData; experience: CityStripExperience[] }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-badge">{data.badge}</span>
        <h1 className="hero-headline">
          <span>{data.lead}</span>
          <RollingPhrase phrases={data.phrases} />
        </h1>
        <p className="hero-note">{data.note}</p>
      </div>

      <div className="hero-strip">
        <CityStrip experiences={experience} speed={CITY.speed} />
      </div>
    </section>
  );
}
