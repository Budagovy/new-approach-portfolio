import type { CSSProperties } from "react";
import { Zoomable } from "./Zoomable";
import type { CaseBlock, CaseDetail, CaseImage, CasePhone, CasePrototype, CaseText } from "./types";

type ZoomLabels = { open: string; close: string };

/** A heading's lines: one per line where there is room, run together where not. */
export function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span key={line} className="cs-line">
          {line}
          {i < lines.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

/** A phone mockup, straight on the page's ground: no tray, no container. */
export function Phone({ phone, labels, captionClass = "cs-caption" }: { phone: CasePhone; labels: ZoomLabels; captionClass?: string }) {
  return (
    <figure className={phone.lead ? "cs-phone cs-phone--lead" : "cs-phone"}>
      <Zoomable image={phone} labels={labels} />
      {phone.caption && <figcaption className={captionClass}>{phone.caption}</figcaption>}
    </figure>
  );
}

function Figure({ image, labels }: { image: CaseImage; labels: ZoomLabels }) {
  return (
    <figure className="cs-figure">
      <Zoomable image={image} labels={labels} className="cs-figure-frame" />
      {image.caption && <figcaption className="cs-label">{image.caption}</figcaption>}
    </figure>
  );
}

/**
 * The same screen, enlarged around a point of interest. The image is
 * `zoom` times the panel's width and placed so its focus point sits at the
 * panel's centre; the caption beside it says what it shows, so the image
 * itself is decorative (empty alt).
 */
function Detail({ detail }: { detail: CaseDetail }) {
  const PANEL = 2.15; // the panel's width / height
  const { x, y, zoom } = detail.focus;
  const heightOverPanel = zoom * (detail.height / detail.width) * PANEL; // image height in panel heights
  const style: CSSProperties = {
    width: `${zoom * 100}%`,
    left: `${50 - x * zoom}%`,
    top: `${50 - y * heightOverPanel}%`,
  };
  return (
    <div className="cs-detail" aria-hidden="true">
      <img src={detail.src} alt="" width={detail.width} height={detail.height} loading="lazy" decoding="async" style={style} />
    </div>
  );
}

/**
 * A phone whose screen is a link: the empty frame image with the label set
 * on its display as live text. Opens in a new tab (it leaves the site).
 */
function PrototypePhone({ prototype }: { prototype: CasePrototype }) {
  return (
    <a className="cs-prototype" href={prototype.href} target="_blank" rel="noopener noreferrer" title={prototype.title}>
      <img src="/work/second-office/frame.png" alt="" width={890} height={1800} loading="lazy" decoding="async" />
      <span className="cs-prototype-screen">
        <span className="cs-prototype-label">{prototype.label}</span>
      </span>
    </a>
  );
}

function Text({ items }: { items: CaseText[] }) {
  return (
    <div className="cs-text">
      {items.map((item) => {
        if (item.kind === "label") return <p key={item.text} className={item.tone === "accent" ? "cs-label cs-label--accent" : "cs-label"}>{item.text}</p>;
        if (item.kind === "title") return <h3 key={item.text[0]} className="cs-h3"><Lines lines={item.text} /></h3>;
        return <p key={item.text.slice(0, 32)} className={item.tone === "ink" ? "cs-p cs-p--ink" : "cs-p"}>{item.text}</p>;
      })}
    </div>
  );
}

function Block({ block, labels }: { block: CaseBlock; labels: ZoomLabels }) {
  switch (block.type) {
    case "rule":
      return <hr className="cs-rule" />;

    case "bar":
      return <div className="cs-bar" aria-hidden="true" />;

    case "band":
      return <div className="cs-band" aria-hidden="true" />;

    case "section":
      return (
        <section id={block.id} className={block.tone === "surface" ? "cs-section cs-section--surface" : "cs-section"} aria-labelledby={`${block.id}-heading`}>
          <header className={block.layout === "split" ? "cs-head cs-head--split" : "cs-head"}>
            <p className="cs-label">{block.label}</p>
            <h2 id={`${block.id}-heading`} className="cs-h2"><Lines lines={block.heading} /></h2>
            {block.intro && <p className="cs-intro">{block.intro}</p>}
          </header>
          <Blocks blocks={block.blocks} labels={labels} />
        </section>
      );

    case "columns":
      return (
        <div className="cs-columns">
          {block.items.map((item) => (
            <div key={item.label} className="cs-column">
              <p className={item.labelTone === "accent" ? "cs-label cs-label--accent" : "cs-label"}>{item.label}</p>
              {item.title && <h3 className="cs-h3">{item.title}</h3>}
              <p className="cs-p">{item.text}</p>
            </div>
          ))}
        </div>
      );

    case "note":
      return (
        <div className="cs-note-block">
          {block.label && <p className="cs-label">{block.label}</p>}
          <p className="cs-note">{block.text}</p>
        </div>
      );

    case "stats":
      return (
        <ul className="cs-stats">
          {block.items.map((item) => (
            <li key={item.value} className="cs-stat">
              {/* Only the figure is orange; what it measures stays dark. */}
              <span className="cs-stat-value">{item.value}</span>
              <span className="cs-stat-text">{item.text}</span>
            </li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <figure className="cs-quote">
          <blockquote><p>{block.text}</p></blockquote>
          <figcaption className="cs-label">{block.source}</figcaption>
        </figure>
      );

    case "mediaText":
      return (
        <div className={`cs-media-text cs-media-text--${block.side}${block.phones ? " cs-media-text--phones" : ""}`}>
          <div className="cs-media">
            {block.figure && <Figure image={block.figure} labels={labels} />}
            {block.phones && (
              <div className="cs-phone-pair">
                {block.phones.map((phone) => <Phone key={phone.src} phone={phone} labels={labels} captionClass="cs-label" />)}
              </div>
            )}
          </div>
          <Text items={block.text} />
        </div>
      );

    case "callout":
      return (
        <aside className="cs-callout">
          <p className="cs-label">{block.label}</p>
          <h3 className="cs-h3"><Lines lines={block.heading} /></h3>
          {block.text && <p className="cs-p">{block.text}</p>}
        </aside>
      );

    case "steps":
      return (
        <div className="cs-steps-block">
          {block.label && <p className="cs-label">{block.label}</p>}
          <ol className="cs-steps">
            {block.items.map((item, i) => (
              <li key={item} className="cs-step">
                <span className="cs-step-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "flow":
      return (
        <ol className="cs-flow">
          {block.items.map((item, i) => (
            <li key={item.title} className="cs-flow-step">
              <div className="cs-flow-phone">
                <Phone phone={item.phone} labels={labels} />
                <h3 className="cs-flow-title">
                  <span className="cs-step-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <span>{item.title}</span>
                </h3>
              </div>
              <Detail detail={item.detail} />
              <p className="cs-label">{item.label}</p>
              <p className="cs-p">{item.text}</p>
            </li>
          ))}
        </ol>
      );

    case "gallery":
      return (
        <div className={block.prototype ? "cs-gallery-row" : undefined}>
          <ul className="cs-gallery" style={{ "--cols": block.columns ?? 6 } as CSSProperties}>
            {block.items.map((phone) => (
              <li key={phone.src}><Phone key={phone.src} phone={phone} labels={labels} /></li>
            ))}
          </ul>
          {block.prototype && <PrototypePhone prototype={block.prototype} />}
        </div>
      );

    case "aside":
      return (
        <div className="cs-aside">
          <p className="cs-label">{block.label}</p>
          <p className="cs-p">{block.text}</p>
        </div>
      );
  }
}

/** Renders a list of blocks in order. Sections nest their own list. */
export function Blocks({ blocks, labels }: { blocks: CaseBlock[]; labels: ZoomLabels }) {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={"id" in block ? block.id : `${block.type}-${i}`} block={block} labels={labels} />
      ))}
    </>
  );
}
