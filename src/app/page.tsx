import { PageFrame } from "@/components/PageFrame";
import { Hero, type HeroData } from "@/components/Hero";
import { Approach, type ApproachData } from "@/components/Approach";
import { Projects, type ProjectsData } from "@/components/Projects";
import { About, type AboutData } from "@/components/About";
import type { CityStripExperience } from "@/components/CityStrip";
import hero from "../../content/hero.json";
import experience from "../../content/experience.json";
import approach from "../../content/approach.json";
import projects from "../../content/projects.json";
import about from "../../content/about.json";

/* The homepage, in the Figma frame's order, inside the shared PageFrame
   (header, bordered frame with its corner marks, footer): hero with the
   city strip, My approach, Selected Projects, About Me. */
export default function Home() {
  return (
    <PageFrame home>
      <Hero data={hero as HeroData} experience={experience.items as CityStripExperience[]} />
      <Approach data={approach as ApproachData} />
      <Projects data={projects as ProjectsData} />
      <About data={about as AboutData} />
    </PageFrame>
  );
}
