import type {
  AnalyticsDashboard,
  ApiSettingsResponse,
  ApprovalQueueResponse,
  CatalogueResponse,
  ChannelConnection,
  DealDetail,
  DealListResponse,
  DealRecord,
  NotificationPrefs,
  NotificationsResponse,
  ScanJob,
  ScanJobsResponse,
  SellChannel,
  SessionUser,
  UserSettings,
  WebhookEndpoint,
  WebhookEvent,
} from "@/lib/schemas";
import { problemDetailsSchema } from "@/lib/schemas";
import {
  GatewayError,
  type AnalyticsFilters,
  type ApproveResult,
  type CatalogueFilters,
  type CreateApprovalRequest,
  type CreatedApiKey,
  type DealListFilters,
  type Gateway,
  type LoginResult,
} from "./types";

/**
 * Gateway client for the real YARP API Gateway (TDD §3.4). Used when
 * GATEWAY_MODE=real. The BFF supplies the user's JWT per request via
 * the userId parameter convention (token forwarded as Bearer).
 *
 * Note: endpoint paths follow TDD §6.2. This client is exercised only once
 * the backend services are deployed; the mock gateway is the default.
 */
export class HttpGateway implements Gateway {
  public constructor(private readonly baseUrl: string) {}

  private async request<T>(
    method: string,
    path: string,
    token: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const parsed = problemDetailsSchema.safeParse(payload);
      throw new GatewayError(
        parsed.success
          ? parsed.data
          : {
              type: "/errors/upstream",
              title: "Upstream error",
              status: response.status,
              detail: `Gateway returned HTTP ${response.status}.`,
            },
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  public login(email: string, password: string): Promise<LoginResult> {
    return this.request("POST", "/auth/login", "", { email, password });
  }

  public register(email: string, password: string): Promise<LoginResult> {
    return this.request("POST", "/auth/register", "", { email, password });
  }

  public verifyMfa(token: string, code: string): Promise<SessionUser> {
    return this.request("POST", "/auth/mfa/verify", token, { code });
  }

  public getSessionUser(token: string): Promise<SessionUser> {
    return this.request("GET", "/auth/me", token);
  }

  public listDeals(
    token: string,
    filters: DealListFilters,
  ): Promise<DealListResponse> {
    const params = new URLSearchParams();
    if (filters.min_margin !== undefined) {
      params.set("min_margin", String(filters.min_margin));
    }
    if (filters.retailer) {
      params.set("retailer", filters.retailer);
    }
    if (filters.category) {
      params.set("category", filters.category);
    }
    if (filters.after) {
      params.set("after", filters.after);
    }
    if (filters.limit) {
      params.set("limit", String(filters.limit));
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";
    return this.request("GET", `/api/v1/deals${query}`, token);
  }

  public getDeal(token: string, dealId: string): Promise<DealDetail> {
    return this.request("GET", `/api/v1/deals/${dealId}`, token);
  }

  public refreshDeal(token: string, dealId: string): Promise<DealDetail> {
    return this.request("POST", `/api/v1/deals/${dealId}/refresh`, token);
  }

  public dismissDeal(token: string, dealId: string): Promise<void> {
    return this.request("POST", `/api/v1/deals/${dealId}/dismiss`, token);
  }

  public saveDealForLater(token: string, dealId: string): Promise<void> {
    return this.request("POST", `/api/v1/deals/${dealId}/save`, token);
  }

  public unsaveDeal(token: string, dealId: string): Promise<void> {
    return this.request("POST", `/api/v1/deals/${dealId}/unsave`, token);
  }

  public getApprovalQueue(token: string): Promise<ApprovalQueueResponse> {
    return this.request("GET", "/api/v1/approvals", token);
  }

  public createApproval(
    token: string,
    request: CreateApprovalRequest,
  ): Promise<{ approval_id: string }> {
    return this.request("POST", "/api/v1/approvals", token, request);
  }

  public approve(token: string, approvalId: string): Promise<ApproveResult> {
    return this.request(
      "POST",
      `/api/v1/approvals/${approvalId}/approve`,
      token,
    );
  }

  public refreshApproval(token: string, approvalId: string): Promise<void> {
    return this.request(
      "POST",
      `/api/v1/approvals/${approvalId}/refresh`,
      token,
    );
  }

  public removeApproval(token: string, approvalId: string): Promise<void> {
    return this.request("DELETE", `/api/v1/approvals/${approvalId}`, token);
  }

  public closeApproval(
    token: string,
    approvalId: string,
    actualSellPriceGbp: number,
  ): Promise<void> {
    return this.request("POST", `/api/v1/approvals/${approvalId}/close`, token, {
      sell_price_gbp: actualSellPriceGbp.toFixed(2),
    });
  }

  public retryExecutionLogEntry(
    token: string,
    logEntryId: string,
  ): Promise<{ approval_id: string }> {
    return this.request(
      "POST",
      `/api/v1/execution-log/${logEntryId}/retry`,
      token,
    );
  }

  public dismissExecutionLogEntry(
    token: string,
    logEntryId: string,
  ): Promise<void> {
    return this.request("DELETE", `/api/v1/execution-log/${logEntryId}`, token);
  }

  public listCatalogue(
    token: string,
    filters: CatalogueFilters,
  ): Promise<CatalogueResponse> {
    const params = new URLSearchParams();
    if (filters.search) {
      params.set("search", filters.search);
    }
    if (filters.category) {
      params.set("category", filters.category);
    }
    if (filters.min_score !== undefined) {
      params.set("min_score", String(filters.min_score));
    }
    if (filters.retailer) {
      params.set("retailer", filters.retailer);
    }
    if (filters.after) {
      params.set("after", filters.after);
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";
    return this.request("GET", `/api/v1/catalogue${query}`, token);
  }

  public toggleWatch(
    token: string,
    skuId: string,
  ): Promise<{ watched: boolean }> {
    return this.request("POST", `/api/v1/catalogue/${skuId}/watch`, token);
  }

  public exportCatalogueCsv(token: string): Promise<string> {
    return this.request("GET", "/api/v1/catalogue/export?format=csv", token);
  }

  public getAnalytics(
    token: string,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsDashboard> {
    const params = new URLSearchParams();
    if (filters.period) {
      params.set("period", String(filters.period));
    }
    if (filters.retailer) {
      params.set("retailer", filters.retailer);
    }
    if (filters.channel) {
      params.set("channel", filters.channel);
    }

    const query = params.size > 0 ? `?${params.toString()}` : "";
    return this.request("GET", `/api/v1/analytics/dashboard${query}`, token);
  }

  public exportAnalyticsCsv(
    token: string,
    _filters: AnalyticsFilters,
  ): Promise<string> {
    return this.request("GET", "/api/v1/analytics/export?format=csv", token);
  }

  public listHistory(token: string): Promise<DealRecord[]> {
    return this.request("GET", "/api/v1/history", token);
  }

  public getSystemStatus(token: string): Promise<{ open_circuits: string[] }> {
    return this.request("GET", "/api/v1/system/status", token);
  }

  public listScanJobs(token: string): Promise<ScanJobsResponse> {
    return this.request("GET", "/api/v1/scan-jobs", token);
  }

  public createScanJob(
    token: string,
    request: {
      retailer: string;
      category: string;
      keywords: string[];
      min_margin_pct: number;
    },
  ): Promise<ScanJob> {
    return this.request("POST", "/api/v1/scan-jobs", token, request);
  }

  public pauseScanJob(token: string, jobId: string): Promise<void> {
    return this.request("POST", `/api/v1/scan-jobs/${jobId}/pause`, token);
  }

  public resumeScanJob(token: string, jobId: string): Promise<void> {
    return this.request("POST", `/api/v1/scan-jobs/${jobId}/resume`, token);
  }

  public deleteScanJob(token: string, jobId: string): Promise<void> {
    return this.request("DELETE", `/api/v1/scan-jobs/${jobId}`, token);
  }

  public listNotifications(token: string): Promise<NotificationsResponse> {
    return this.request("GET", "/api/v1/notifications", token);
  }

  public markNotificationRead(
    token: string,
    notificationId: string,
  ): Promise<void> {
    return this.request(
      "POST",
      `/api/v1/notifications/${notificationId}/read`,
      token,
    );
  }

  public markAllNotificationsRead(token: string): Promise<void> {
    return this.request("POST", "/api/v1/notifications/read-all", token);
  }

  public dismissNotification(
    token: string,
    notificationId: string,
  ): Promise<void> {
    return this.request(
      "DELETE",
      `/api/v1/notifications/${notificationId}`,
      token,
    );
  }

  public getUserSettings(token: string): Promise<UserSettings> {
    return this.request("GET", "/api/v1/user/settings", token);
  }

  public updateProfile(
    token: string,
    request: { vat_registered?: boolean; min_margin_pct?: number },
  ): Promise<UserSettings> {
    return this.request("PATCH", "/api/v1/user/settings", token, request);
  }

  public updateNotificationPrefs(
    token: string,
    prefs: NotificationPrefs,
  ): Promise<UserSettings> {
    return this.request("PUT", "/api/v1/user/notifications", token, prefs);
  }

  public connectChannel(
    token: string,
    channel: SellChannel,
  ): Promise<ChannelConnection> {
    return this.request("POST", `/api/v1/user/channels/${channel}`, token);
  }

  public disconnectChannel(
    token: string,
    channel: SellChannel,
  ): Promise<void> {
    return this.request("DELETE", `/api/v1/user/channels/${channel}`, token);
  }

  public regenerateBackupCodes(token: string): Promise<{ codes: string[] }> {
    return this.request("POST", "/auth/mfa/backup-codes", token);
  }

  public exportUserData(token: string): Promise<string> {
    return this.request("GET", "/api/v1/user/export", token);
  }

  public deleteAccount(token: string): Promise<void> {
    return this.request("DELETE", "/api/v1/user", token);
  }

  public getApiSettings(token: string): Promise<ApiSettingsResponse> {
    return this.request("GET", "/api/v1/settings/api", token);
  }

  public createApiKey(
    token: string,
    label: string,
    permissions: "read" | "read_write",
  ): Promise<CreatedApiKey> {
    return this.request("POST", "/api/v1/settings/api/keys", token, {
      label,
      permissions,
    });
  }

  public revokeApiKey(token: string, keyId: string): Promise<void> {
    return this.request("DELETE", `/api/v1/settings/api/keys/${keyId}`, token);
  }

  public registerWebhook(
    token: string,
    url: string,
    events: WebhookEvent[],
  ): Promise<WebhookEndpoint> {
    return this.request("POST", "/api/v1/settings/api/webhooks", token, {
      url,
      events,
    });
  }

  public deleteWebhook(token: string, webhookId: string): Promise<void> {
    return this.request(
      "DELETE",
      `/api/v1/settings/api/webhooks/${webhookId}`,
      token,
    );
  }
}
