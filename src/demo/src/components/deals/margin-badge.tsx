import { marginTone } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Margin pill — green at/above the 20% threshold, amber below (per designs). */
export function MarginBadge({
  netMarginPct,
  className,
}: {
  netMarginPct: string;
  className?: string;
}) {
  const tone = marginTone(netMarginPct);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-sm font-medium tabular-nums",
        tone === "positive"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
        className,
      )}
    >
      {Number(netMarginPct).toFixed(1)}%
    </span>
  );
}
