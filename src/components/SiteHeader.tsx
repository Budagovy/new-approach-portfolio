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
 */
export function SiteHeader({ data }: { data: SiteHeaderData }) {
  return (
    <header className="site-header">
      <div className="column site-header-row">
        <a className="site-header-name" href="#top">
          {data.name}
        </a>

        <div className="site-header-group">
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
      </div>
    </header>
  );
}
