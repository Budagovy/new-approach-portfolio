import { SplashScreen, type SplashData } from "@/components/SplashScreen";
import { AnimatedHero, type AnimatedHeroData } from "@/components/AnimatedHero";
import splash from "../../content/splash.json";
import hero from "../../content/hero.json";

/* The composition. The splash does not need to know what it is showing. */
export default function Home() {
  return (
    <main>
      <SplashScreen data={splash as SplashData} id="top">
        <AnimatedHero data={hero as AnimatedHeroData} />
      </SplashScreen>
    </main>
  );
}
