import Link from "next/link";
import { siteHref } from "@/lib/links";

export interface FooterLink {
  label: string;
  /** null until the real address is known: rendered as plain text, never a dead link. */
  href: string | null;
}

export interface SiteFooterData {
  contact: {
    label: string;
    email: string;
    phone: { display: string; href: string };
    location: string;
  };
  sitemap: { label: string; links: FooterLink[] };
  elsewhere: { label: string; links: FooterLink[] };
  copyright: string;
  character: { src: string; alt: string };
}

function Links({ links, home }: { links: FooterLink[]; home: boolean }) {
  return (
    <ul className="footer-list">
      {links.map((link) => (
        <li key={link.label}>
          {link.href && link.href.startsWith("#") && !home ? (
            /* Off the homepage, a section link leads back to it, through the router. */
            <Link href={siteHref(link.href, home)}>{link.label}</Link>
          ) : link.href ? (
            <a
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {link.label}
            </a>
          ) : (
            <span>{link.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * The footer, which is also the Contact target: contact details, the
 * sitemap, links elsewhere, the copyright line, and the illustrated
 * character standing on the frame's bottom edge at the right.
 */
export function SiteFooter({ data, home = true }: { data: SiteFooterData; home?: boolean }) {
  return (
    <footer id="contact" className="footer">
      <div className="footer-columns">
        <div className="footer-column">
          <h2 className="footer-label">{data.contact.label}</h2>
          <ul className="footer-list footer-list--contact">
            <li>
              <a className="footer-email" href={`mailto:${data.contact.email}`}>
                {data.contact.email}
              </a>
            </li>
            <li>
              <a href={data.contact.phone.href}>{data.contact.phone.display}</a>
            </li>
            <li>
              <span>{data.contact.location}</span>
            </li>
          </ul>
        </div>

        <nav className="footer-column" aria-label={data.sitemap.label}>
          <h2 className="footer-label">{data.sitemap.label}</h2>
          <Links links={data.sitemap.links} home={home} />
        </nav>

        <div className="footer-column">
          <h2 className="footer-label">{data.elsewhere.label}</h2>
          <Links links={data.elsewhere.links} home={home} />
        </div>
      </div>

      <p className="footer-copyright">{data.copyright}</p>

      <img className="footer-character" src={data.character.src} alt={data.character.alt} width={900} height={900} loading="lazy" />
    </footer>
  );
}
