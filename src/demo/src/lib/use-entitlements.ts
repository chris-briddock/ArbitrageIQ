"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  PLAN_ENTITLEMENTS,
  PLAN_LABELS,
  type PlanEntitlements,
} from "@/lib/entitlements";
import type { SessionUser } from "@/lib/schemas";

/**
 * Session-derived plan entitlements (PRD §8) for client-side feature gating.
 * Server-side enforcement still happens in the gateway — these gates are UX.
 */
export function useEntitlements(): {
  user: SessionUser | undefined;
  planLabel: string | undefined;
  entitlements: PlanEntitlements | undefined;
} {
  const { data } = useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<{ user: SessionUser }>("/api/auth/session"),
    staleTime: 60_000,
  });

  const plan = data?.user.plan;

  return {
    user: data?.user,
    planLabel: plan ? PLAN_LABELS[plan] : undefined,
    entitlements: plan ? PLAN_ENTITLEMENTS[plan] : undefined,
  };
}
