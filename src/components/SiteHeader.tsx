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
 * Fixed, always on top of the splash's own video/hero (position:fixed, no
 * spot in document flow) so it never has to share the splash-stage's
 * sticky-positioning math — see SplashScreen.tsx for how carefully that is
 * tuned. `scroll-padding-top` on <html> (globals.css) keeps anchor jumps
 * from landing a section under this bar.
 */
export function SiteHeader({ data }: { data: SiteHeaderData }) {
  return (
    <header className="site-header">
      <div className="container site-header-row">
        <a className="site-header-name" href="#top">
          {data.name}
        </a>

        <nav className="site-header-nav" aria-label="Primary">
          {data.nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="site-header-link"
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
              {item.active && <span className="site-header-dot" aria-hidden="true" />}
            </a>
          ))}
        </nav>

        <a className="site-header-cta" href={data.cta.href}>
          {data.cta.label}
        </a>
      </div>
    </header>
  );
}
