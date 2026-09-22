import { CityStrip, type CityStripExperience } from "@/components/CityStrip";
import { CITY } from "@/lib/motion";

export interface HeroData {
  badge: string;
  lead: string;
  emphasis: string;
  note: string;
}

/**
 * The hero, the page's opening composition per the Figma frame: the role
 * badge, the two-line headline (second line orange and bold), one line of
 * subtitle, and the city strip along the foot with the career label above
 * it. Static: it is what the page opens on, with nothing to scroll
 * through first. Every string comes from content/.
 */
export function Hero({ data, experience }: { data: HeroData; experience: CityStripExperience[] }) {
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-badge">{data.badge}</span>
        <h1 className="hero-headline">
          <span>{data.lead}</span>
          <span className="hero-emphasis">{data.emphasis}</span>
        </h1>
        <p className="hero-note">{data.note}</p>
      </div>

      <div className="hero-strip">
        <CityStrip experiences={experience} speed={CITY.speed} />
      </div>
    </section>
  );
}
