/**
 * Pure text-matching helpers used to verify a lyrics search hit actually
 * corresponds to the requested track. Genius search is fuzzy and almost
 * always returns *something*, so without a similarity check the first hit
 * for a track Genius lacks is a confidently-wrong different song.
 *
 * Kept dependency-free (no Tauri imports) so it's unit-testable.
 */

/** Normalize a title/artist for fuzzy comparison: drop parentheticals,
 *  featurings, and punctuation; lowercase; collapse whitespace. */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/\bfeat\.?\b.*$/i, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Ratio of shared tokens over the smaller token set (0..1). */
export function tokenOverlap(a: string, b: string): number {
  const A = new Set(a.split(/\s+/).filter(Boolean));
  const B = new Set(b.split(/\s+/).filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / Math.min(A.size, B.size);
}

/** Does a search hit plausibly match the requested track? Title must match;
 *  artist agreement is enforced only when both sides are known. */
export function hitMatches(
  reqTitle: string,
  reqArtist: string,
  hitTitle: string,
  hitArtist: string,
): boolean {
  if (!hitTitle) return false;
  const titleOk =
    hitTitle.includes(reqTitle) ||
    reqTitle.includes(hitTitle) ||
    tokenOverlap(reqTitle, hitTitle) >= 0.6;
  if (!titleOk) return false;
  if (!reqArtist || !hitArtist) return true;
  return (
    hitArtist.includes(reqArtist) ||
    reqArtist.includes(hitArtist) ||
    tokenOverlap(reqArtist, hitArtist) >= 0.5
  );
}
