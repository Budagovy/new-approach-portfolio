/**
 * The site's in-page links are written as hashes ("#work") in content/.
 * On the homepage they are used as they are, so SmoothScroll can glide to
 * them. On any other route the same link has to lead back to the homepage
 * first: "/#work".
 */
export const siteHref = (href: string, home: boolean) => (home || !href.startsWith("#") ? href : `/${href}`);

/** An address inside this site (as opposed to http:, mailto:, tel:). */
export const isInternal = (href: string) => href.startsWith("/") || href.startsWith("#");
