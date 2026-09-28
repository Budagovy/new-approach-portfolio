import { RevealItem } from "@/components/Reveal";

/**
 * The opening of a homepage section, per the updated homepage frame: a
 * two-line headline, the first line in ink and the second in the site's
 * grey, and a sentence under it, left-aligned. It comes in with the site's
 * one reveal, like every other heading on the page.
 */
export function SectionIntro({ heading, intro }: { heading: string[]; intro?: string }) {
  const [lead, ...rest] = heading;
  return (
    <RevealItem className="section-intro" alone>
      <h2 className="section-title">
        <span className="section-title-lead">{lead}</span>
        {rest.length > 0 && (
          <>
            {" "}
            <span className="section-title-rest">{rest.join(" ")}</span>
          </>
        )}
      </h2>
      {intro && <p className="section-lede">{intro}</p>}
    </RevealItem>
  );
}
