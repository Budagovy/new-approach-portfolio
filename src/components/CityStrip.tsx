"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { CityStripExperience, PortfolioCityStrip } from "./city-strip/city-strip";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "portfolio-city-strip": React.DetailedHTMLProps<React.HTMLAttributes<PortfolioCityStrip>, PortfolioCityStrip>;
    }
  }
}

export type { CityStripExperience };

/**
 * React wrapper for the <portfolio-city-strip> web component. The element
 * is server-rendered as an unknown tag (globals.css gives it a min-height
 * so nothing shifts) and upgraded on the client: the component module
 * touches `document` at import time, so it is only ever imported from
 * inside the effect. Headings are handed over as a property once the
 * element has been defined, since attributes can't carry an array.
 *
 * `speed` and `asset-base` are set with setAttribute, NOT passed as JSX
 * props. The component reads them as attributes (and re-lays out when
 * they change), and its `speed` is a getter with no setter. React 19
 * writes a JSX prop as a PROPERTY whenever the custom element is already
 * defined and has one by that name. On a first page load it is not
 * defined yet, so `speed` went out as an attribute and all was well; but
 * the moment the homepage was mounted a second time in one session
 * (browser Back from a case study), React assigned `element.speed = "22"`,
 * which throws, and the whole page fell over to "This page couldn't
 * load". Nothing surfaced it while the site had a single route.
 */
export function CityStrip({
  experiences,
  speed,
  assetBase = "/city-strip/",
  style,
}: {
  experiences: CityStripExperience[];
  speed: number;
  assetBase?: string;
  style?: CSSProperties;
}) {
  const element = useRef<PortfolioCityStrip>(null);

  useEffect(() => {
    element.current?.setAttribute("speed", String(speed));
    element.current?.setAttribute("asset-base", assetBase);
  }, [speed, assetBase]);

  useEffect(() => {
    let cancelled = false;
    import("./city-strip/city-strip").then(() => {
      if (!cancelled && element.current) element.current.experiences = experiences;
    });
    return () => {
      cancelled = true;
    };
  }, [experiences]);

  return <portfolio-city-strip ref={element} style={style} />;
}
