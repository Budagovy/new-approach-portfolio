import { SiteHeader, type SiteHeaderData } from "@/components/SiteHeader";
import { Hero, type HeroData } from "@/components/Hero";
import { Approach, type ApproachData } from "@/components/Approach";
import { Projects, type ProjectsData } from "@/components/Projects";
import { About, type AboutData } from "@/components/About";
import { SiteFooter, type SiteFooterData } from "@/components/SiteFooter";
import type { CityStripExperience } from "@/components/CityStrip";
import header from "../../content/header.json";
import hero from "../../content/hero.json";
import experience from "../../content/experience.json";
import approach from "../../content/approach.json";
import projects from "../../content/projects.json";
import about from "../../content/about.json";
import footer from "../../content/footer.json";

/* The composition, in the Figma frame's order: header, then everything
   else inside the bordered page frame: hero with the city strip, My
   approach, Selected Projects, About Me, footer. The four corner marks
   belong to the frame. */
export default function Home() {
  return (
    <>
      <SiteHeader data={header as SiteHeaderData} />
      <div className="column frame">
        <span className="frame-mark frame-mark--tl" aria-hidden="true" />
        <span className="frame-mark frame-mark--tr" aria-hidden="true" />
        <main>
          <Hero data={hero as HeroData} experience={experience.items as CityStripExperience[]} />
          <Approach data={approach as ApproachData} />
          <Projects data={projects as ProjectsData} />
          <About data={about as AboutData} />
        </main>
        <SiteFooter data={footer as SiteFooterData} />
        <span className="frame-mark frame-mark--bl" aria-hidden="true" />
        <span className="frame-mark frame-mark--br" aria-hidden="true" />
      </div>
    </>
  );
}
