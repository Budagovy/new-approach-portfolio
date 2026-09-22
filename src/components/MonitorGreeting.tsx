export interface MonitorGreetingData {
  lead: string;
  emphasis: string;
  mark: string;
}

/**
 * The picture on the monitor before the reader scrolls: one line, centred
 * on a plain ground. Handed to SplashScreen's `screen` slot, which lays it
 * over the hero and dissolves it as the push begins.
 */
export function MonitorGreeting({ data }: { data: MonitorGreetingData }) {
  return (
    <div className="greeting">
      <p className="greeting-line">
        {data.lead}
        <strong className="greeting-emphasis">{data.emphasis}</strong>
        <span className="greeting-mark">{data.mark}</span>
      </p>
    </div>
  );
}
