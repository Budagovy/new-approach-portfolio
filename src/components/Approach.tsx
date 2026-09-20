import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";

export interface ApproachStep {
  title: string;
  description: string;
}

export interface ApproachData {
  label: SectionLabel;
  heading: string;
  steps: ApproachStep[];
}

const number = (i: number) => String(i + 1).padStart(2, "0");

/**
 * "My approach", per the Figma frame: a small centred heading, then a
 * thin timeline across the whole frame with four evenly spaced numbered
 * circles, the first orange and the rest charcoal, and all four steps'
 * titles and descriptions shown together under them. The only motion is
 * the steps fading in one after another as the section enters.
 *
 * (Earlier versions revealed the steps one at a time, scrubbed by scroll
 * while the section was held in place. The reference shows them all at
 * once, so that went; it is in git before the "match Figma" commit.)
 */
export function Approach({ data }: { data: ApproachData }) {
  return (
    <section id="approach" className="section approach" data-snap>
      <SectionBar label={data.label} />
      <div className="section-body approach-body">
        <RevealItem as="h2" className="section-heading" alone>
          {data.heading}
        </RevealItem>

        <div className="approach-timeline">
          <span className="approach-line" aria-hidden="true" />
          <RevealGroup as="ol" className="approach-steps">
            {data.steps.map((step, i) => (
              <RevealItem as="li" key={step.title} className="approach-step">
                <span className={i === 0 ? "approach-marker approach-marker--active" : "approach-marker"} aria-hidden="true">
                  {number(i)}
                </span>
                <h3 className="approach-step-title">{step.title}</h3>
                <p className="approach-step-desc">{step.description}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
