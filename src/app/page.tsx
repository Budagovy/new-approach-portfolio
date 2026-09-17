import { SplashScreen, type SplashData } from "@/components/SplashScreen";
import { AnimatedHero, type AnimatedHeroData } from "@/components/AnimatedHero";
import { SiteHeader, type SiteHeaderData } from "@/components/SiteHeader";
import type { CityStripExperience } from "@/components/CityStrip";
import splash from "../../content/splash.json";
import hero from "../../content/hero.json";
import header from "../../content/header.json";
import experience from "../../content/experience.json";

/* The composition. The splash does not need to know what it is showing. */
export default function Home() {
  return (
    <>
      <SiteHeader data={header as SiteHeaderData} />
      <main>
        <SplashScreen data={splash as SplashData} id="top">
          <AnimatedHero
            data={hero as AnimatedHeroData}
            experience={experience.items as CityStripExperience[]}
          />
        </SplashScreen>
      </main>
    </>
  );
}
