import type {
  AnalyticsDashboard,
  ApiKey,
  ApiSettingsResponse,
  ApprovalQueueResponse,
  CatalogueResponse,
  ChannelConnection,
  DealDetail,
  DealListResponse,
  DealRecord,
  NotificationPrefs,
  NotificationsResponse,
  ProblemDetails,
  ScanJob,
  ScanJobsResponse,
  SellChannel,
  SessionUser,
  UserSettings,
  WebhookEndpoint,
  WebhookEvent,
} from "@/lib/schemas";

/**
 * Error carrying an RFC 7807 Problem Details payload and HTTP status,
 * thrown by gateway implementations and translated by the BFF routes.
 */
export class GatewayError extends Error {
  public readonly problem: ProblemDetails;

  public constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "GatewayError";
    this.problem = problem;
  }

  public static marginBelowThreshold(updatedMarginPct: string): GatewayError {
    return new GatewayError({
      type: "/errors/margin-below-threshold",
      title: "Margin below threshold",
      status: 409,
      detail: `Margin has dropped to ${updatedMarginPct}% since the deal was surfaced.`,
    });
  }

  public static spendCapExceeded(remainingGbp: string): GatewayError {
    return new GatewayError({
      type: "/errors/daily-spend-cap",
      title: "Daily spend cap exceeded",
      status: 402,
      detail: `This purchase would exceed your daily spend cap. Remaining today: £${remainingGbp}.`,
    });
  }

  public static mfaRequired(): GatewayError {
    return new GatewayError({
      type: "/errors/mfa-required",
      title: "MFA required",
      status: 403,
      detail: "MFA must be verified before approvals.",
    });
  }

  public static notFound(detail: string): GatewayError {
    return new GatewayError({
      type: "/errors/not-found",
      title: "Not found",
      status: 404,
      detail,
    });
  }

  public static invalidCredentials(): GatewayError {
    return new GatewayError({
      type: "/errors/invalid-credentials",
      title: "Invalid credentials",
      status: 401,
      detail: "Email or password is incorrect.",
    });
  }

  public static conflict(detail: string): GatewayError {
    return new GatewayError({
      type: "/errors/conflict",
      title: "Conflict",
      status: 409,
      detail,
    });
  }

  public static planGated(detail: string): GatewayError {
    return new GatewayError({
      type: "/errors/plan-gated",
      title: "Upgrade required",
      status: 402,
      detail,
    });
  }
}

export interface LoginResult {
  user: SessionUser;
  mfa_required: boolean;
}

export interface DealListFilters {
  min_margin?: number;
  retailer?: string;
  category?: string;
  sort?: "margin" | "profit" | "newest";
  after?: string;
  limit?: number;
  /** "live" (default) or "saved" — the user's saved-for-later bucket. */
  view?: "live" | "saved";
}

export interface CatalogueFilters {
  search?: string;
  category?: string;
  min_score?: number;
  retailer?: string;
  after?: string;
  limit?: number;
  /** Restrict to SKUs on the user's watchlist (PRD §5.2). */
  watched_only?: boolean;
}

export interface AnalyticsFilters {
  period?: 30 | 90 | 365;
  retailer?: string;
  channel?: SellChannel;
}

export interface CreateApprovalRequest {
  deal_id: string;
  quantity: number;
  sell_channel: SellChannel;
}

export interface ApproveResult {
  approval_id: string;
  status: "executing";
  pre_execute_margin_pct: string;
}

export interface CreatedApiKey {
  record: ApiKey;
  /** Full key value — shown exactly once at creation (TDD §6.3 pattern). */
  full_key: string;
}

/**
 * Gateway client contract used by the BFF route handlers. Implemented by the
 * in-memory mock today and the YARP HTTP client when the backend is available.
 */
export interface Gateway {
  login(email: string, password: string): Promise<LoginResult>;
  register(email: string, password: string): Promise<LoginResult>;
  verifyMfa(userId: string, code: string): Promise<SessionUser>;
  getSessionUser(userId: string): Promise<SessionUser>;

  listDeals(userId: string, filters: DealListFilters): Promise<DealListResponse>;
  getDeal(userId: string, dealId: string): Promise<DealDetail>;
  refreshDeal(userId: string, dealId: string): Promise<DealDetail>;
  dismissDeal(userId: string, dealId: string): Promise<void>;
  saveDealForLater(userId: string, dealId: string): Promise<void>;
  unsaveDeal(userId: string, dealId: string): Promise<void>;

  getApprovalQueue(userId: string): Promise<ApprovalQueueResponse>;
  createApproval(
    userId: string,
    request: CreateApprovalRequest,
  ): Promise<{ approval_id: string }>;
  approve(userId: string, approvalId: string): Promise<ApproveResult>;
  refreshApproval(userId: string, approvalId: string): Promise<void>;
  removeApproval(userId: string, approvalId: string): Promise<void>;
  /** listed → closed with the actual sale price (TDD §5.4). */
  closeApproval(
    userId: string,
    approvalId: string,
    actualSellPriceGbp: number,
  ): Promise<void>;
  retryExecutionLogEntry(
    userId: string,
    logEntryId: string,
  ): Promise<{ approval_id: string }>;
  dismissExecutionLogEntry(userId: string, logEntryId: string): Promise<void>;

  listCatalogue(
    userId: string,
    filters: CatalogueFilters,
  ): Promise<CatalogueResponse>;
  toggleWatch(userId: string, skuId: string): Promise<{ watched: boolean }>;
  exportCatalogueCsv(userId: string): Promise<string>;

  getAnalytics(
    userId: string,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsDashboard>;
  exportAnalyticsCsv(userId: string, filters: AnalyticsFilters): Promise<string>;

  listHistory(userId: string): Promise<DealRecord[]>;

  /** Platform health surfaced to users — open scraper circuits (TDD §5.2.2). */
  getSystemStatus(userId: string): Promise<{ open_circuits: string[] }>;

  listScanJobs(userId: string): Promise<ScanJobsResponse>;
  createScanJob(
    userId: string,
    request: {
      retailer: string;
      category: string;
      keywords: string[];
      min_margin_pct: number;
    },
  ): Promise<ScanJob>;
  pauseScanJob(userId: string, jobId: string): Promise<void>;
  resumeScanJob(userId: string, jobId: string): Promise<void>;
  deleteScanJob(userId: string, jobId: string): Promise<void>;

  listNotifications(userId: string): Promise<NotificationsResponse>;
  markNotificationRead(userId: string, notificationId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  dismissNotification(userId: string, notificationId: string): Promise<void>;

  /** Profile, security, sell channels, notification prefs (TDD §5.9.5). */
  getUserSettings(userId: string): Promise<UserSettings>;
  updateProfile(
    userId: string,
    request: {
      vat_registered?: boolean;
      min_margin_pct?: number;
      daily_spend_cap_gbp?: number;
      quantity_cap_per_deal?: number;
    },
  ): Promise<UserSettings>;
  updateNotificationPrefs(
    userId: string,
    prefs: NotificationPrefs,
  ): Promise<UserSettings>;
  connectChannel(
    userId: string,
    channel: SellChannel,
  ): Promise<ChannelConnection>;
  disconnectChannel(userId: string, channel: SellChannel): Promise<void>;
  /** New TOTP backup codes — returned once (TDD §5.6.2). */
  regenerateBackupCodes(userId: string): Promise<{ codes: string[] }>;
  /** GDPR data export (TDD §8.6: GET /api/v1/user/export). */
  exportUserData(userId: string): Promise<string>;
  /** GDPR erasure (TDD §8.6: DELETE /api/v1/user). */
  deleteAccount(userId: string): Promise<void>;

  getApiSettings(userId: string): Promise<ApiSettingsResponse>;
  createApiKey(
    userId: string,
    label: string,
    permissions: "read" | "read_write",
  ): Promise<CreatedApiKey>;
  revokeApiKey(userId: string, keyId: string): Promise<void>;
  registerWebhook(
    userId: string,
    url: string,
    events: WebhookEvent[],
  ): Promise<WebhookEndpoint>;
  deleteWebhook(userId: string, webhookId: string): Promise<void>;
}
