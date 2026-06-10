"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

/**
 * Warns users when a retailer's scraper circuit breaker is open
 * (TDD §5.2.2 — affected scan jobs are suspended until recovery).
 */
export function CircuitBanner() {
  const { data } = useQuery({
    queryKey: ["system-status"],
    queryFn: () =>
      apiFetch<{ open_circuits: string[] }>("/api/v1/system/status"),
    refetchInterval: 10_000,
  });

  if (!data || data.open_circuits.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <span>
        <strong>{data.open_circuits.join(", ")}</strong> price collection is
        paused — the scraper circuit breaker is open. Affected scan jobs are
        suspended and prices for these retailers may be stale. Collection
        resumes automatically on recovery.
      </span>
    </div>
  );
}
