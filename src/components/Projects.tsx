import type { CSSProperties } from "react";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";

export interface Project {
  title: string;
  tag: string;
  image: string;
  /** How far the image is enlarged inside its 2:3 crop, as in the Figma frame (1 = cover). */
  zoom?: number;
  href?: string | null;
}

export interface ProjectsData {
  label: SectionLabel;
  heading: string;
  items: Project[];
}

/**
 * "Selected Projects", per the Figma frame: a small centred heading, then
 * three equal 2:3 portrait crops in a row with a narrow gap, a small
 * left-aligned title and tag under each. The cards fade in one after
 * another as the section enters.
 */
export function Projects({ data }: { data: ProjectsData }) {
  return (
    <section id="work" className="section projects" data-snap>
      <SectionBar label={data.label} />
      <div className="section-body projects-body">
        <RevealItem as="h2" className="section-heading" alone>
          {data.heading}
        </RevealItem>

        <RevealGroup as="ol" className="projects-grid">
          {data.items.map((project) => {
            const inner = (
              <>
                <span className="project-media" style={{ "--zoom": project.zoom ?? 1 } as CSSProperties}>
                  <img src={project.image} alt={project.title} width={941} height={1672} loading="lazy" />
                </span>
                <span className="project-title">{project.title}</span>
                <span className="project-tag">{project.tag}</span>
              </>
            );
            return (
              <RevealItem as="li" key={project.title} className="project-item">
                {project.href ? (
                  <a
                    className="project"
                    href={project.href}
                    target={project.href.startsWith("http") ? "_blank" : undefined}
                    rel={project.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="project">{inner}</div>
                )}
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
