import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";

export interface AboutData {
  label: SectionLabel;
  heading: string;
  photo: { src: string; alt: string };
  intro: { emphasis: string; rest: string };
  /** A newline inside a paragraph is a line break, as set in the Figma frame. */
  paragraphs: string[];
}

/**
 * "About Me", per the Figma frame: a small centred heading, the photo on
 * the left and the biography on the right, opening with an orange
 * "Nice to meet you!".
 */
export function About({ data }: { data: AboutData }) {
  return (
    <section id="about" className="section about" data-snap>
      <SectionBar label={data.label} />
      <div className="section-body about-body">
        <RevealItem as="h2" className="section-heading" alone>
          {data.heading}
        </RevealItem>

        <RevealGroup className="about-row">
          <RevealItem className="about-photo">
            <img src={data.photo.src} alt={data.photo.alt} width={1100} height={1467} loading="lazy" />
          </RevealItem>

          <RevealItem className="about-bio">
            <p>
              <strong className="about-hello">{data.intro.emphasis}</strong> {data.intro.rest}
            </p>
            {data.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}
