import { SplashScreen, type SplashData } from "@/components/SplashScreen";
import { AnimatedHero, type AnimatedHeroData } from "@/components/AnimatedHero";
import { ServiceCards, type ServiceCardsData } from "@/components/ServiceCards";
import { SiteHeader, type SiteHeaderData } from "@/components/SiteHeader";
import splash from "../../content/splash.json";
import hero from "../../content/hero.json";
import cards from "../../content/cards.json";
import header from "../../content/header.json";

/* The composition. The splash does not need to know what it is showing. */
export default function Home() {
  return (
    <>
      <SiteHeader data={header as SiteHeaderData} />
      <main>
        <SplashScreen data={splash as SplashData} id="top">
          <AnimatedHero data={hero as AnimatedHeroData} />
        </SplashScreen>
        <ServiceCards data={cards as ServiceCardsData} />
      </main>
    </>
  );
}
