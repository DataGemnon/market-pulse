export type EventKind = 'results' | 'insider' | 'stake' | 'management' | 'inside_info' | 'capital' | 'governance' | 'other';

/** An official publication about one stock of the watchlist (SEC or AMF). */
export type WatchlistEvent = {
    id: string;
    symbol: string;
    source: 'SEC' | 'AMF';
    kind: EventKind;
    important: boolean;
    title: string;        // French label of what was published
    detail?: string;      // deterministic decoding when possible (e.g. insider trade)
    lesson?: string;      // why this kind of publication matters
    publishedAt: string;  // ISO
    url: string;          // human-readable page or document
    docUrl: string;       // document Claude can decode
};
