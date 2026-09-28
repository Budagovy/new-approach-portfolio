import type { CSSProperties } from "react";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";
import { SectionIntro } from "@/components/SectionIntro";
import { ExperienceRoute } from "@/components/ExperienceRoute";

export interface Role {
  index: string;
  company: string;
  role: string;
  text: string;
}

export interface CareerData {
  label: SectionLabel;
  heading: string[];
  intro: string;
  items: Role[];
}

/**
 * "Experience", per the updated homepage frame: the section's opening, then
 * one card per role, in order, joined by a dotted path.
 *
 * On a wide screen the cards zig-zag: the first, third and fifth along the
 * top, the second and fourth below, each a step to the right of the one
 * before, so the path reads left to right in the order the roles came. The
 * steps sit on a grid of narrow columns (a card is seven wide and each one
 * starts five further on), which lets a card be wider than a step: its
 * neighbours are on the other row, so they overlap it only in plan, never
 * on the page. Each card draws the stretch of path to the next one itself
 * (globals.css), so the path cannot drift from the cards.
 *
 * Where the site stacks, the cards stand in one column and the path runs
 * straight down between them, like My approach's timeline.
 */
export function Experience({ data }: { data: CareerData }) {
  return (
    <section id="experience" className="section experience" data-snap>
      <SectionBar label={data.label} />
      <div className="section-body experience-body">
        <SectionIntro heading={data.heading} intro={data.intro} />
        {/* The map: the cards, and over their dotted path the arrows travelling it. */}
        <div className="experience-map">
          <RevealGroup as="ol" className="experience-path">
            {data.items.map((role, i) => (
              /* --col: the grid line this card starts on (see the note above). */
              <RevealItem as="li" key={role.company} className={i % 2 ? "role role--low" : "role"} style={{ "--col": i * 5 + 1 } as CSSProperties}>
                <span className="role-index" aria-hidden="true">{role.index}</span>
                <h3 className="role-company">{role.company}</h3>
                <p className="role-title">{role.role}</p>
                <p className="role-text">{role.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
          <ExperienceRoute />
        </div>
      </div>
    </section>
  );
}
