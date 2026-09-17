import { SplashScreen, type SplashData } from "@/components/SplashScreen";
import { AnimatedHero, type AnimatedHeroData } from "@/components/AnimatedHero";
import { MonitorGreeting, type MonitorGreetingData } from "@/components/MonitorGreeting";
import { SiteHeader, type SiteHeaderData } from "@/components/SiteHeader";
import { Approach, type ApproachData } from "@/components/Approach";
import type { CityStripExperience } from "@/components/CityStrip";
import splash from "../../content/splash.json";
import hero from "../../content/hero.json";
import greeting from "../../content/greeting.json";
import header from "../../content/header.json";
import experience from "../../content/experience.json";
import approach from "../../content/approach.json";

/* The composition. The splash does not need to know what it is showing:
   the greeting is what the monitor shows at rest, the hero is what the
   scroll arrives at. */
export default function Home() {
  return (
    <>
      <SiteHeader data={header as SiteHeaderData} />
      <main>
        <SplashScreen
          data={splash as SplashData}
          id="top"
          screen={<MonitorGreeting data={greeting as MonitorGreetingData} />}
        >
          <AnimatedHero
            data={hero as AnimatedHeroData}
            experience={experience.items as CityStripExperience[]}
          />
        </SplashScreen>
        <Approach data={approach as ApproachData} />
      </main>
    </>
  );
}
