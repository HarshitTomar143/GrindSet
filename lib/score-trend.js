/**
 * Whether a run of scores is going up or down.
 *
 * Kept free of imports so the account page (server) and the score chart
 * (browser) work it out the same way.
 */

// A change smaller than this is noise between two 30-question papers.
const STEADY_WITHIN = 3;
const SPAN_MAX = 5;

function mean(list) {
  return list.reduce((sum, v) => sum + v, 0) / list.length;
}

/**
 * Compares the latest papers with the same number of papers before them: up
 * to five against five, fewer while the history is short.
 *
 * @param pcts percentages, oldest first
 * @returns null with fewer than two papers, otherwise
 *          { dir: "up" | "down" | "flat", delta, recent, earlier, span }
 */
export function scoreTrend(pcts) {
  const span = Math.min(SPAN_MAX, Math.floor(pcts.length / 2));
  if (span < 1) return null;
  const recent = Math.round(mean(pcts.slice(-span)));
  const earlier = Math.round(mean(pcts.slice(-2 * span, -span)));
  const delta = recent - earlier;
  const dir = delta >= STEADY_WITHIN ? "up" : delta <= -STEADY_WITHIN ? "down" : "flat";
  return { dir, delta, recent, earlier, span };
}

/** "pass" | "fail" against a qualifying mark, "neutral" when the exam has none. */
export function scoreTone(pct, passMark) {
  if (passMark === null || passMark === undefined) return "neutral";
  return pct >= passMark ? "pass" : "fail";
}
