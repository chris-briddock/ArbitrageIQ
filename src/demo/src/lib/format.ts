/**
 * Formatting helpers for GBP money strings (TDD §6.1 wire format) and
 * relative timestamps used across the deal surfaces.
 */

const GBP_FORMATTER = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const GBP_WHOLE_FORMATTER = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats a GBP numeric string as "£1,240.50". Falls back to "—" when null. */
export function gbp(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? "—" : GBP_FORMATTER.format(parsed);
}

/** Formats a GBP numeric string as a whole amount, e.g. "£1,240". */
export function gbpWhole(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? "—" : GBP_WHOLE_FORMATTER.format(parsed);
}

/** Formats a percentage string as "30.9%". Falls back to "—" when null. */
export function pct(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? "—" : `${parsed.toFixed(1)}%`;
}

export type MarginTone = "positive" | "caution";

/** Margin badge tone: green at or above the 20% default threshold, amber below. */
export function marginTone(netMarginPct: string): MarginTone {
  return Number(netMarginPct) >= 20 ? "positive" : "caution";
}

export type Staleness = "fresh" | "drifting" | "stale";

/** Approval queue staleness: drifting after 15 minutes, stale after 45 (per screen designs). */
export function staleness(queuedAtIso: string, now: Date = new Date()): Staleness {
  const ageMinutes = (now.getTime() - new Date(queuedAtIso).getTime()) / 60_000;
  if (ageMinutes > 45) {
    return "stale";
  }

  return ageMinutes > 15 ? "drifting" : "fresh";
}

/** Relative time like "2 min ago", "3 hours ago", "12 May 2026". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) {
    return `${Math.floor(seconds)} sec ago`;
  }

  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${Math.floor(minutes)} min ago`;
  }

  const hours = minutes / 60;
  if (hours < 24) {
    const wholeHours = Math.floor(hours);
    return wholeHours === 1 ? "1 hour ago" : `${wholeHours} hours ago`;
  }

  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Short date like "02 Jun". */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

/** Clock time like "09:42". */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
