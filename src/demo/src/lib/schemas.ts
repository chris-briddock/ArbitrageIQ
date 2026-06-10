import { z } from "zod";

/**
 * Wire-format schemas mirroring the TDD §6 API contracts.
 * Monetary values are GBP numeric strings (e.g. "77.13") per TDD §6.1.
 */

export const sellChannelSchema = z.enum([
  "amazon_fba",
  "amazon_fbm",
  "ebay",
  "shopify",
  "facebook",
  "gumtree",
]);
export type SellChannel = z.infer<typeof sellChannelSchema>;

export const planSchema = z.enum(["starter", "pro", "business"]);
export type Plan = z.infer<typeof planSchema>;

export const scoreConfidenceSchema = z.enum([
  "high",
  "medium",
  "low",
  "insufficient",
]);
export type ScoreConfidence = z.infer<typeof scoreConfidenceSchema>;

export const marginSchema = z.object({
  net_profit_gbp: z.string(),
  net_margin_pct: z.string(),
  referral_fee_gbp: z.string(),
  fulfilment_fee_gbp: z.string(),
  vat_adjustment_gbp: z.string(),
});
export type Margin = z.infer<typeof marginSchema>;

export const dealSchema = z.object({
  deal_id: z.string(),
  sku: z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    composite_score: z.number().nullable(),
    score_confidence: scoreConfidenceSchema,
    high_opportunity: z.boolean(),
    deal_event_count_90d: z.number(),
  }),
  buy: z.object({
    retailer: z.string(),
    price_gbp: z.string(),
    delivery_gbp: z.string(),
    product_url: z.string(),
  }),
  sell: z.object({
    channel: sellChannelSchema,
    channel_label: z.string(),
    price_gbp: z.string(),
  }),
  margin: marginSchema,
  surfaced_at: z.string(),
});
export type Deal = z.infer<typeof dealSchema>;

export const dealListResponseSchema = z.object({
  deals: z.array(dealSchema),
  next_cursor: z.string().nullable(),
  total: z.number(),
  stats: z.object({
    active_deals: z.number(),
    est_profit_gbp: z.string(),
    avg_margin_pct: z.string(),
    pending_approvals: z.number(),
  }),
});
export type DealListResponse = z.infer<typeof dealListResponseSchema>;

export const pricePointSchema = z.object({
  date: z.string(),
  buy_price_gbp: z.string(),
  sell_price_gbp: z.string(),
});
export type PricePoint = z.infer<typeof pricePointSchema>;

export const dealDetailSchema = dealSchema.extend({
  buy_breakdown: z.object({
    price_gbp: z.string(),
    delivery_gbp: z.string(),
    vat_reclaim_gbp: z.string(),
    effective_gbp: z.string(),
  }),
  sell_breakdown: z.object({
    price_gbp: z.string(),
    referral_fee_gbp: z.string(),
    fulfilment_fee_gbp: z.string(),
    fuel_surcharge_gbp: z.string(),
  }),
  price_history: z.array(pricePointSchema),
  demand_signal: z.object({
    bsr_trend: z.string(),
    review_velocity: z.string(),
  }),
  below_90d_average_pct: z.string().nullable(),
});
export type DealDetail = z.infer<typeof dealDetailSchema>;

export const approvalStatusSchema = z.enum([
  "pending",
  "approved",
  "executing",
  "purchased",
  "listed",
  "closed",
  "failed",
  "removed",
]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const approvalItemSchema = z.object({
  approval_id: z.string(),
  deal_id: z.string(),
  sku_title: z.string(),
  buy_retailer: z.string(),
  sell_channel: sellChannelSchema,
  sell_channel_label: z.string(),
  quantity: z.number(),
  buy_price_gbp: z.string(),
  sell_price_gbp: z.string(),
  net_margin_pct: z.string(),
  net_profit_gbp: z.string(),
  status: approvalStatusSchema,
  queued_at: z.string(),
  failure_reason: z.string().nullable(),
});
export type ApprovalItem = z.infer<typeof approvalItemSchema>;

export const executionLogEntrySchema = z.object({
  id: z.string(),
  sku_title: z.string(),
  outcome: z.enum(["purchased_listed", "failed"]),
  detail: z.string(),
  occurred_at: z.string(),
});
export type ExecutionLogEntry = z.infer<typeof executionLogEntrySchema>;

export const approvalQueueResponseSchema = z.object({
  items: z.array(approvalItemSchema),
  caps: z.object({
    daily_spend_cap_gbp: z.string(),
    remaining_today_gbp: z.string(),
    quantity_cap_per_deal: z.number(),
    mfa_verified: z.boolean(),
  }),
  execution_log: z.array(executionLogEntrySchema),
});
export type ApprovalQueueResponse = z.infer<typeof approvalQueueResponseSchema>;

export const catalogueSkuSchema = z.object({
  id: z.string(),
  title: z.string(),
  brand: z.string().nullable(),
  category: z.string(),
  image_url: z.string().nullable(),
  composite_score: z.number().nullable(),
  score_confidence: scoreConfidenceSchema,
  high_opportunity: z.boolean(),
  is_stale: z.boolean(),
  deal_event_count_90d: z.number(),
  cheapest_source: z
    .object({ retailer: z.string(), price_gbp: z.string() })
    .nullable(),
  avg_net_margin_pct: z.string().nullable(),
  watched: z.boolean(),
  /** Live deal for this SKU, when one is currently surfaced. */
  live_deal_id: z.string().nullable(),
});
export type CatalogueSku = z.infer<typeof catalogueSkuSchema>;

export const catalogueResponseSchema = z.object({
  skus: z.array(catalogueSkuSchema),
  next_cursor: z.string().nullable(),
  total: z.number(),
  category_rankings: z.array(
    z.object({ category: z.string(), avg_score: z.number() }),
  ),
});
export type CatalogueResponse = z.infer<typeof catalogueResponseSchema>;

export const dealRecordSchema = z.object({
  id: z.string(),
  sku_title: z.string(),
  buy_retailer: z.string(),
  sell_channel: sellChannelSchema,
  sell_channel_label: z.string(),
  buy_price_gbp: z.string(),
  sell_price_gbp: z.string().nullable(),
  net_profit_gbp: z.string().nullable(),
  net_margin_pct: z.string().nullable(),
  status: z.enum(["sold", "listed", "failed"]),
  closed_at: z.string(),
});
export type DealRecord = z.infer<typeof dealRecordSchema>;

export const analyticsDashboardSchema = z.object({
  stats: z.object({
    net_profit_gbp: z.string(),
    deals_closed: z.number(),
    avg_roi_pct: z.string(),
    best_month_gbp: z.string(),
  }),
  daily: z.array(
    z.object({
      date: z.string(),
      gross_revenue_gbp: z.string(),
      net_profit_gbp: z.string(),
      deal_count: z.number(),
    }),
  ),
  channel_performance: z.array(
    z.object({
      channel_label: z.string(),
      profit_gbp: z.string(),
      deal_count: z.number(),
      avg_margin_pct: z.string(),
    }),
  ),
  retailer_performance: z.array(
    z.object({
      retailer: z.string(),
      profit_gbp: z.string(),
      deal_count: z.number(),
      avg_margin_pct: z.string(),
    }),
  ),
  records: z.array(dealRecordSchema),
});
export type AnalyticsDashboard = z.infer<typeof analyticsDashboardSchema>;

export const apiKeySchema = z.object({
  id: z.string(),
  label: z.string(),
  key_prefix: z.string(),
  created_at: z.string(),
  last_used_at: z.string().nullable(),
  permissions: z.enum(["read", "read_write"]),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

export const webhookEventSchema = z.enum([
  "new_deal",
  "deal_approved",
  "deal_executed",
]);
export type WebhookEvent = z.infer<typeof webhookEventSchema>;

export const webhookEndpointSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(webhookEventSchema),
  status: z.enum(["active", "disabled"]),
  last_delivery_at: z.string().nullable(),
});
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>;

export const webhookDeliverySchema = z.object({
  id: z.string(),
  delivered_at: z.string(),
  event: z.string(),
  url_host: z.string(),
  status_code: z.number(),
  retry_of: z.string().nullable(),
});
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>;

export const apiSettingsResponseSchema = z.object({
  plan: planSchema,
  /** "read" (Pro) or "full" (Business, incl. webhooks) — PRD §8. */
  api_access: z.enum(["read", "full"]),
  quota_per_day: z.number(),
  used_today: z.number(),
  keys: z.array(apiKeySchema),
  webhooks: z.array(webhookEndpointSchema),
  deliveries: z.array(webhookDeliverySchema),
});
export type ApiSettingsResponse = z.infer<typeof apiSettingsResponseSchema>;

export const scanJobStatusSchema = z.enum([
  "active",
  "paused",
  "suspended",
  "over_limit",
]);
export type ScanJobStatus = z.infer<typeof scanJobStatusSchema>;

export const scanJobSchema = z.object({
  id: z.string(),
  retailer: z.string(),
  category: z.string(),
  keywords: z.array(z.string()),
  min_margin_pct: z.string(),
  /** Enforced from plan entitlements (15/60/360 — PRD §8). */
  cadence_minutes: z.number(),
  status: scanJobStatusSchema,
  last_run_at: z.string().nullable(),
  created_at: z.string(),
});
export type ScanJob = z.infer<typeof scanJobSchema>;

export const scanJobsResponseSchema = z.object({
  jobs: z.array(scanJobSchema),
  active_count: z.number(),
  job_limit: z.number().nullable(),
});
export type ScanJobsResponse = z.infer<typeof scanJobsResponseSchema>;

export const createScanJobRequestSchema = z.object({
  retailer: z.string().min(1, "Choose a retailer"),
  category: z.string().min(1, "Choose a category"),
  keywords: z.string().optional(),
  min_margin_pct: z
    .string()
    .regex(/^\d{1,2}(\.\d)?$/, "Enter a margin between 0 and 99"),
});
export type CreateScanJobRequest = z.infer<typeof createScanJobRequestSchema>;

export const notificationTypeSchema = z.enum([
  "deal_surfaced",
  "deal_expired",
  "deal_purchased",
  "deal_listed",
  "deal_closed",
  "deal_failed",
  "scraper_circuit_open",
  "scraper_circuit_closed",
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  /** In-app deep link, e.g. /deals/deal-0101 or /approvals. */
  href: z.string().nullable(),
  created_at: z.string(),
  read: z.boolean(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  unread_count: z.number(),
});
export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

/** Sell-channel OAuth connection state (TDD §5.8.5 token lifecycle). */
export const channelConnectionSchema = z.object({
  channel: sellChannelSchema,
  label: z.string(),
  status: z.enum(["connected", "expired", "disconnected"]),
  connected_at: z.string().nullable(),
});
export type ChannelConnection = z.infer<typeof channelConnectionSchema>;

export const notificationPrefsSchema = z.object({
  email_alerts: z.boolean(),
  push_alerts: z.boolean(),
  daily_digest: z.boolean(),
  quiet_hours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
  }),
});
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

export const userSettingsSchema = z.object({
  email: z.string(),
  plan: planSchema,
  vat_registered: z.boolean(),
  min_margin_pct: z.string(),
  daily_spend_cap_gbp: z.string(),
  quantity_cap_per_deal: z.number(),
  mfa_enrolled: z.boolean(),
  backup_codes_remaining: z.number(),
  notifications: notificationPrefsSchema,
  channels: z.array(channelConnectionSchema),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateProfileRequestSchema = z.object({
  vat_registered: z.boolean().optional(),
  min_margin_pct: z
    .string()
    .regex(/^\d{1,2}(\.\d)?$/, "Enter a margin between 0 and 99")
    .optional(),
  daily_spend_cap_gbp: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount")
    .optional(),
  quantity_cap_per_deal: z.number().int().min(0).optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const sessionUserSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  plan: planSchema,
  vat_registered: z.boolean(),
  mfa_verified: z.boolean(),
  min_margin_pct: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** RFC 7807 Problem Details (TDD §6.1). */
export const problemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Password policy from TDD §7.3.1: min 12 chars, 1 upper, 1 digit, 1 special. */
export const registerRequestSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/\d/, "Password must contain a digit")
      .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const mfaVerifyRequestSchema = z.object({
  code: z
    .string()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});
export type MfaVerifyRequest = z.infer<typeof mfaVerifyRequestSchema>;
