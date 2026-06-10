import type { Plan } from "@/lib/schemas";

/**
 * Plan entitlement matrix from PRD §8. Drives UI gating and the mock
 * gateway's plan enforcement; the real Billing Service owns this in
 * production (TDD §3.2 billing.entitlements).
 */
export interface PlanEntitlements {
  /** Maximum simultaneously active scan jobs (null = unlimited). */
  scan_job_limit: number | null;
  /** Scan refresh cadence in minutes (360 / 60 / 15). */
  cadence_minutes: number;
  /** Retailer coverage description. */
  retailers_label: string;
  /** Semi-automated purchasing via the approval queue (Pro+). */
  semi_automated_purchasing: boolean;
  /** Auto-listing to sell channels on purchase (Pro+). */
  auto_listing: boolean;
  /** CSV/XLSX export of history and catalogue (Pro+). */
  csv_export: boolean;
  /** REST API access tier. */
  api_access: "none" | "read" | "full";
  /** Deal history retention. */
  history_retention_label: string;
}

export const PLAN_ENTITLEMENTS: Record<Plan, PlanEntitlements> = {
  starter: {
    scan_job_limit: 3,
    cadence_minutes: 360,
    retailers_label: "3 retailers",
    semi_automated_purchasing: false,
    auto_listing: false,
    csv_export: false,
    api_access: "none",
    history_retention_label: "90 days",
  },
  pro: {
    scan_job_limit: 20,
    cadence_minutes: 60,
    retailers_label: "6 retailers (all supported)",
    semi_automated_purchasing: true,
    auto_listing: true,
    csv_export: true,
    api_access: "read",
    history_retention_label: "1 year",
  },
  business: {
    scan_job_limit: null,
    cadence_minutes: 15,
    retailers_label: "6 retailers + custom scraped",
    semi_automated_purchasing: true,
    auto_listing: true,
    csv_export: true,
    api_access: "full",
    history_retention_label: "7 years",
  },
};

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};
