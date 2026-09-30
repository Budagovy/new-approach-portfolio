import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";

export interface AboutAction {
  label: string;
  href: string;
  /** "primary": the orange button; "secondary": its outline. */
  kind: "primary" | "secondary";
  /** Said after the label to a screen reader: where the link goes. */
  note: string;
}

export interface AboutData {
  label: SectionLabel;
  heading: string;
  photo: { src: string; alt: string };
  intro: { emphasis: string; rest: string };
  /** A newline inside a paragraph is a line break, as set in the Figma frame. */
  paragraphs: string[];
  /** Calls to action under the biography, primary first. */
  actions?: AboutAction[];
}

/**
 * "About Me", per the Figma frame: a small centred heading, the photo on
 * the left and the biography on the right, opening with an orange
 * "Nice to meet you!", and under it two calls to action: a primary one in
 * the header's Contact button treatment and a secondary in its outline.
 * Both leave the site, so both open in a new tab and say so to a screen
 * reader.
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
            {data.actions && (
              <div className="about-actions">
                {data.actions.map((action) => (
                  <a
                    key={action.label}
                    className={action.kind === "primary" ? "about-cta" : "about-cta about-cta--secondary"}
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {action.label}
                    <span className="visually-hidden"> {action.note}</span>
                  </a>
                ))}
              </div>
            )}
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}
