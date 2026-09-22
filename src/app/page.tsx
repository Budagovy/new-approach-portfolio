import { SiteHeader, type SiteHeaderData } from "@/components/SiteHeader";
import { SiteFooter, type SiteFooterData } from "@/components/SiteFooter";
import { SplashScreen, type SplashData } from "@/components/SplashScreen";
import { MonitorGreeting, type MonitorGreetingData } from "@/components/MonitorGreeting";
import { Hero, type HeroData } from "@/components/Hero";
import { Approach, type ApproachData } from "@/components/Approach";
import { Projects, type ProjectsData } from "@/components/Projects";
import { About, type AboutData } from "@/components/About";
import type { CityStripExperience } from "@/components/CityStrip";
import header from "../../content/header.json";
import footer from "../../content/footer.json";
import splash from "../../content/splash.json";
import greeting from "../../content/greeting.json";
import hero from "../../content/hero.json";
import experience from "../../content/experience.json";
import approach from "../../content/approach.json";
import projects from "../../content/projects.json";
import about from "../../content/about.json";

/* The homepage: the splash first (the desk video, the greeting on its
   monitor, the scroll that walks into the screen), arriving on the page
   as designed in the Figma frame: header, then the bordered frame with the
   hero and the city strip, My approach, Selected Projects, About Me, the
   footer. The splash takes the page's opening (the header's space, the
   frame's top edge, the hero) as the picture on the monitor, and holds
   everything after it directly beneath, so the page is whole the moment
   the hero arrives. The frame is split in two for that (`frame--open`,
   `frame--rest`); it reads as one. Other routes use PageFrame. */
export default function Home() {
  return (
    <>
      <SplashScreen
        data={splash as SplashData}
        id="top"
        chrome={<SiteHeader data={header as SiteHeaderData} home />}
        screen={<MonitorGreeting data={greeting as MonitorGreetingData} />}
        cue={greeting.cue}
        next={
          <div className="column frame frame--rest">
            <main>
              <Approach data={approach as ApproachData} />
              <Projects data={projects as ProjectsData} />
              <About data={about as AboutData} />
            </main>
            <SiteFooter data={footer as SiteFooterData} home />
            <span className="frame-mark frame-mark--bl" aria-hidden="true" />
            <span className="frame-mark frame-mark--br" aria-hidden="true" />
          </div>
        }
      >
        <div className="splash-slot">
          <div className="column frame frame--open">
            <span className="frame-mark frame-mark--tl" aria-hidden="true" />
            <span className="frame-mark frame-mark--tr" aria-hidden="true" />
            <Hero data={hero as HeroData} experience={experience.items as CityStripExperience[]} />
          </div>
        </div>
      </SplashScreen>
    </>
  );
}
