export interface SectionLabel {
  index: string;
  text: string;
}

/**
 * The thin charcoal bar that opens a section, spanning the page frame,
 * with the section's number and name in small light type ("01 HOW I DO
 * IT"). Decorative wayfinding: the section's real heading is its h2.
 */
export function SectionBar({ label }: { label: SectionLabel }) {
  return (
    <div className="section-bar" aria-hidden="true">
      <span className="section-bar-index">{label.index}</span>
      <span>{label.text}</span>
    </div>
  );
}
