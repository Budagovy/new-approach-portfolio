import Link from "next/link";
import { siteHref } from "@/lib/links";

export interface SiteHeaderNavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface SiteHeaderData {
  name: string;
  nav: SiteHeaderNavItem[];
  cta: { label: string; href: string };
}

/**
 * Fixed across the top, its row laid out in the same centred column as
 * the page frame below it: the name on the left, the nav and the Contact
 * button grouped on the right. `scroll-padding-top` on <html>
 * (globals.css) keeps anchor jumps from landing a section under it.
 *
 * One header for every route. On the homepage (`home`) the links are plain
 * hashes, which SmoothScroll glides to; anywhere else they lead back to
 * the homepage's sections ("/#work") as client-side navigations, and
 * `current` names the nav item that route belongs under (a case study
 * sits under Projects).
 */
export function SiteHeader({ data, home = true, current }: { data: SiteHeaderData; home?: boolean; current?: string }) {
  const isActive = (item: SiteHeaderNavItem) => (current ? item.href === current : !!item.active);
  /* Hash links on the homepage stay native anchors; cross-route links go through the router. */
  const Anchor = home ? "a" : Link;

  return (
    <header className="site-header">
      <div className="column site-header-row">
        <Anchor className="site-header-name" href={home ? "#top" : "/"}>
          {data.name}
        </Anchor>

        <div className="site-header-group">
          <nav className="site-header-nav" aria-label="Primary">
            {data.nav.map((item) => (
              <Anchor
                key={item.label}
                href={siteHref(item.href, home)}
                className="site-header-link"
                aria-current={isActive(item) ? "page" : undefined}
              >
                {item.label}
                {isActive(item) && <span className="site-header-dot" aria-hidden="true" />}
              </Anchor>
            ))}
          </nav>

          <Anchor className="site-header-cta" href={siteHref(data.cta.href, home)}>
            {data.cta.label}
          </Anchor>
        </div>
      </div>
    </header>
  );
}
