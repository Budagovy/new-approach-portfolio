import Link from "next/link";
import { Blocks, Lines, Phone, Plate } from "./Blocks";
import { SectionRail } from "./SectionRail";
import type { CaseStudyChrome, CaseStudyData } from "./types";

/**
 * A case-study page: one continuous article of live text and separate
 * images, inside the site's shared frame. A quiet link back to the
 * projects at the top and again at the end; the hero (the page's only h1);
 * then the project's blocks in its own order. It scrolls naturally: none
 * of the homepage's reveals or guided landings are brought in.
 */
export function CaseStudy({ data, chrome }: { data: CaseStudyData; chrome: CaseStudyChrome }) {
  const back = (
    <Link className="cs-back" href={chrome.back.href}>
      {chrome.back.label}
    </Link>
  );

  const sections = data.blocks.filter((b) => b.type === "section").map((b, i) => ({ id: b.id, number: String(i + 1).padStart(2, "0"), name: b.nav }));

  return (
    <article className="cs">
      <SectionRail items={sections} label={chrome.rail.label} />
      <header className="cs-hero">
        <nav className="cs-back-row" aria-label={chrome.back.label}>{back}</nav>

        <p className="cs-label cs-eyebrow">{data.hero.eyebrow}</p>
        <h1 className="cs-h1"><Lines lines={data.hero.heading} /></h1>
        <p className="cs-lede"><Lines lines={data.hero.lede} /></p>

        <dl className="cs-facts">
          {data.hero.facts.map((fact) => (
            <div key={fact.label} className="cs-fact">
              <dt className="cs-label">{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>

        {/* A phone project opens on its screens side by side; a tablet one on
            a single screen in its frame. */}
        {data.hero.phones && (
          <div className={data.hero.phonesLayout === "fan" ? "cs-hero-phones cs-hero-phones--fan" : "cs-hero-phones"}>
            {data.hero.phones.map((phone) => <Phone key={phone.src} phone={phone} labels={chrome.zoom} />)}
          </div>
        )}
        {data.hero.plate && <div className="cs-hero-plate"><Plate plate={data.hero.plate} labels={chrome.zoom} /></div>}
      </header>

      <Blocks blocks={data.blocks} labels={chrome.zoom} />

      <footer className="cs-end">{back}</footer>
    </article>
  );
}
