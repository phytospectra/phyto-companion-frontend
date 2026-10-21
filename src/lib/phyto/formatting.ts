import type { CandidateRank } from "./types";

/**
 * Format a token count with thousands separators.
 *   formatTokens(1234) → "1,234 tokens"
 */
export function formatTokens(n: number): string {
  return `${n.toLocaleString("en-US")} token${n === 1 ? "" : "s"}`;
}

/**
 * Format a USD amount.
 *   formatUsd(39) → "$39.00"
 */
export function formatUsd(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usd);
}

/**
 * Format a mass spectrometry m/z value to 4 decimal places.
 *   formatMz(285.0768) → "285.0768"
 */
export function formatMz(mz: number): string {
  return mz.toFixed(4);
}

/**
 * Format an NMR chemical shift in ppm to 2 decimal places.
 *   formatPpm(7.34) → "7.34 ppm"
 */
export function formatPpm(ppm: number): string {
  return `${ppm.toFixed(2)} ppm`;
}

/**
 * Format a percentage in the conventional 0-100 form.
 *   formatPercent(0.83) → "83%"
 */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

/**
 * Format a signed token delta for the transactions table.
 *   formatSignedTokens(-5)  → "-5"
 *   formatSignedTokens(100) → "+100"
 */
export function formatSignedTokens(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "" : "±";
  return `${sign}${n.toLocaleString("en-US")}`;
}

/**
 * Format an ISO-8601 timestamp for display in a table or audit log.
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/**
 * Format a relative time from now ("3s ago", "1m ago", "2h ago").
 */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return iso;
  const deltaSec = Math.round((Date.now() - d) / 1000);
  if (deltaSec < 5) return "just now";
  if (deltaSec < 60) return `${deltaSec}s ago`;
  const m = Math.floor(deltaSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

/**
 * Render a ranking interval as a string.
 *   [1, 1]         → "Rank 1"
 *   [1, 3]         → "Ranks 1–3 (tied)"
 *   [2, 2]         → "Rank 2"
 *   ranking_convention = "lower_is_better" → unchanged (rank 1 = best)
 *   ranking_convention = "higher_is_better" → prepend "↑ " (best = top rank)
 *
 * The rank is an interval, not a point: ties are first-class.
 */
export function formatRankInterval(rank: CandidateRank): string {
  const [best, worst] = rank.ranking_interval;
  const arrow = rank.ranking_convention === "higher_is_better" ? "↑ " : "";
  if (best === worst) {
    if (rank.tied_candidates > 0) {
      return `${arrow}Rank ${best} (tied with ${rank.tied_candidates})`;
    }
    return `${arrow}Rank ${best}`;
  }
  return `${arrow}Ranks ${best}–${worst} (tied)`;
}

/**
 * Compute the absolute rank to display for a candidate (the best-case rank).
 */
export function bestRank(rank: CandidateRank): number {
  return rank.ranking_interval[0];
}

/**
 * Truncate a SMILES string for compact display in a table cell.
 */
export function truncateSmiles(smiles: string, max = 28): string {
  if (smiles.length <= max) return smiles;
  return `${smiles.slice(0, max - 1)}…`;
}
