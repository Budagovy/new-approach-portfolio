import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";
import { SectionIntro } from "@/components/SectionIntro";

export interface Tool {
  name: string;
  icon: string;
}

export interface ToolsData {
  label: SectionLabel;
  heading: string[];
  intro: string;
  items: Tool[];
}

/**
 * "Tools & AI", per the updated homepage frame: the section's opening, then
 * a row of square tiles, one per tool, its mark in the middle and its name
 * underneath in the site's mono. The name is the text; the mark beside it
 * is decorative. The tiles fade in one after another, as the project cards
 * do, and wrap onto a second row where the screen is narrow.
 */
export function Tools({ data }: { data: ToolsData }) {
  return (
    <section id="tools" className="section tools" data-snap>
      <SectionBar label={data.label} />
      <div className="section-body tools-body">
        <SectionIntro heading={data.heading} intro={data.intro} />
        <RevealGroup as="ul" className="tools-grid">
          {data.items.map((tool) => (
            <RevealItem as="li" key={tool.name} className="tool">
              <span className="tool-tile">
                <img src={tool.icon} alt="" width={160} height={160} loading="lazy" decoding="async" />
              </span>
              <span className="tool-name">{tool.name}</span>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
