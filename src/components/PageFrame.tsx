import type { ReactNode } from "react";
import { SiteHeader, type SiteHeaderData } from "@/components/SiteHeader";
import { SiteFooter, type SiteFooterData } from "@/components/SiteFooter";
import header from "../../content/header.json";
import footer from "../../content/footer.json";

/**
 * The chrome every page shares, once: the fixed header, then the bordered
 * page frame with an orange mark in each corner, holding the page's own
 * content and the footer. The homepage passes `home`; other routes name
 * the nav item they belong under with `current` (a case study: "#work").
 */
export function PageFrame({ home = false, current, children }: { home?: boolean; current?: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader data={header as SiteHeaderData} home={home} current={current} />
      <div className="column frame">
        <span className="frame-mark frame-mark--tl" aria-hidden="true" />
        <span className="frame-mark frame-mark--tr" aria-hidden="true" />
        <main>{children}</main>
        <SiteFooter data={footer as SiteFooterData} home={home} />
        <span className="frame-mark frame-mark--bl" aria-hidden="true" />
        <span className="frame-mark frame-mark--br" aria-hidden="true" />
      </div>
    </>
  );
}
