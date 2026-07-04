/**
 * Parse a "N songs" track count out of a header subtitle, tolerating a
 * thousands separator ("5,000 songs" → 5000, not 0 — the old /(\d+)/ only
 * matched the digits after the last comma). Returns undefined when absent.
 *
 * Pure + dependency-free so it's shared by playlist.ts and album.ts and is
 * unit-testable.
 */
export function parseTrackCount(text: string): number | undefined {
  const m = text.match(/([\d,]+)\s+songs?/i);
  if (!m) return undefined;
  return parseInt(m[1].replace(/,/g, ""), 10) || undefined;
}
