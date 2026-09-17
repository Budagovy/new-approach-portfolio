"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { CityStripExperience, PortfolioCityStrip } from "./city-strip/city-strip";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "portfolio-city-strip": React.DetailedHTMLProps<
        React.HTMLAttributes<PortfolioCityStrip>,
        PortfolioCityStrip
      > & {
        speed?: string;
        parallax?: string;
        "asset-base"?: string;
      };
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
    let cancelled = false;
    import("./city-strip/city-strip").then(() => {
      if (!cancelled && element.current) element.current.experiences = experiences;
    });
    return () => {
      cancelled = true;
    };
  }, [experiences]);

  return (
    <portfolio-city-strip
      ref={element}
      speed={String(speed)}
      asset-base={assetBase}
      style={style}
    />
  );
}
