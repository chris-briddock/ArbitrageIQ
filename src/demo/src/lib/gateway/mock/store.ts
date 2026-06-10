import type {
  AnalyticsDashboard,
  ApiSettingsResponse,
  ApprovalQueueResponse,
  ApprovalStatus,
  CatalogueResponse,
  CatalogueSku,
  Deal,
  DealDetail,
  ChannelConnection,
  DealListResponse,
  DealRecord,
  ExecutionLogEntry,
  Notification,
  NotificationPrefs,
  NotificationsResponse,
  NotificationType,
  PricePoint,
  ScanJob,
  ScanJobsResponse,
  SellChannel,
  SessionUser,
  UserSettings,
  WebhookEndpoint,
  WebhookEvent,
} from "@/lib/schemas";
import {
  ANALYTICS_STATS_SEED,
  API_KEY_SEEDS,
  API_QUOTA_PER_DAY,
  API_USED_TODAY,
  APPROVAL_SEEDS,
  CHANNEL_LABELS,
  CHANNEL_PERFORMANCE_SEEDS,
  DAILY_SPEND_CAP_GBP,
  DEAL_SEEDS,
  DELIVERY_SEEDS,
  DEMO_USER,
  EXECUTION_LOG_SEEDS,
  HISTORY_SEEDS,
  QUANTITY_CAP_PER_DEAL,
  RESERVE_SEEDS,
  RETAILER_PERFORMANCE_SEEDS,
  SCAN_JOB_SEEDS,
  SPENT_TODAY_GBP,
  TIER_DEMO_USERS,
  WEBHOOK_SEEDS,
  type DealSeed,
} from "./fixtures";
import { PLAN_ENTITLEMENTS } from "@/lib/entitlements";
import { computeMargin, money, toMarginPayload, type MarginInputs } from "./margin";
import { hashSeed, mulberry32 } from "./rng";
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
} from "../types";

interface MockUser {
  userId: string;
  email: string;
  password: string;
  plan: "starter" | "pro" | "business";
  vatRegistered: boolean;
  mfaVerified: boolean;
  minMarginPct: number;
  dailySpendCapGbp: number;
  quantityCapPerDeal: number;
  backupCodesRemaining: number;
  notificationPrefs: NotificationPrefs;
  channels: Map<SellChannel, ChannelState>;
}

interface ChannelState {
  status: "connected" | "expired" | "disconnected";
  connectedAt: Date | null;
}

interface DealState {
  seed: DealSeed;
  pricing: MarginInputs;
  surfacedAt: Date;
  dismissed: boolean;
  /** True when the simulation expired the deal (eligible for re-surfacing). */
  expired: boolean;
  savedForLater: boolean;
  refreshCount: number;
  /** Consecutive sim steps with margin below the expiry floor (TDD §5.8.1). */
  subThresholdSteps: number;
}

interface NotificationState {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  createdAt: Date;
  read: boolean;
}

interface CircuitState {
  openedAt: Date;
}

interface ScanJobState {
  id: string;
  userId: string;
  retailer: string;
  category: string;
  keywords: string[];
  minMarginPct: number;
  paused: boolean;
  lastRunAt: Date | null;
  createdAt: Date;
}

/** Simulation constants — see docs/demo-improvement-plan.md §3.1. */
const SIM_STEP_MS = 15_000;
const SIM_MAX_STEPS_PER_TICK = 40;
const SIM_DRIFT_PER_STEP = 0.005;
const SIM_DRIFT_CLAMP = 0.12;
const SIM_EXPIRY_MARGIN_PCT = 12;
const SIM_EXPIRY_STEPS = 3;
const SIM_SURFACE_PROBABILITY = 1 / 16;
const SIM_CIRCUIT_RECOVERY_MS = 120_000;
const NOTIFICATION_CAP = 50;

interface ApprovalState {
  id: string;
  dealId: string;
  quantity: number;
  sellChannel: SellChannel;
  status: ApprovalStatus;
  queuedAt: Date;
  pricing: MarginInputs;
  failureReason: string | null;
}

interface LogState {
  id: string;
  skuTitle: string;
  outcome: "purchased_listed" | "failed";
  detail: string;
  occurredAt: Date;
}

interface ApiKeyState {
  id: string;
  label: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  permissions: "read" | "read_write";
}

interface WebhookState {
  id: string;
  url: string;
  events: WebhookEvent[];
  status: "active" | "disabled";
  lastDeliveryAt: Date | null;
}

interface DeliveryState {
  id: string;
  deliveredAt: Date;
  event: string;
  urlHost: string;
  statusCode: number;
  retryOf: string | null;
}

interface HistoryState {
  id: string;
  skuTitle: string;
  buyRetailer: string;
  channel: SellChannel;
  buyPriceGbp: number;
  sellPriceGbp: number | null;
  netProfitGbp: number | null;
  netMarginPct: number | null;
  status: "sold" | "listed" | "failed";
  closedAt: Date;
  /** False for records created by closing a deal during this session. */
  seeded: boolean;
}

function defaultNotificationPrefs(): NotificationPrefs {
  return {
    email_alerts: true,
    push_alerts: true,
    daily_digest: false,
    quiet_hours: { enabled: false, start: "22:00", end: "07:00" },
  };
}

/**
 * Seeded sell-channel connections: the channels used by the demo deals are
 * connected; Gumtree is expired (re-auth path, TDD §5.8.5) and Facebook is
 * never connected.
 */
function defaultChannels(seededAt: Date): Map<SellChannel, ChannelState> {
  return new Map<SellChannel, ChannelState>([
    ["amazon_fba", { status: "connected", connectedAt: daysAgo(34, seededAt) }],
    ["amazon_fbm", { status: "connected", connectedAt: daysAgo(34, seededAt) }],
    ["ebay", { status: "connected", connectedAt: daysAgo(21, seededAt) }],
    ["shopify", { status: "connected", connectedAt: daysAgo(12, seededAt) }],
    ["facebook", { status: "disconnected", connectedAt: null }],
    ["gumtree", { status: "expired", connectedAt: daysAgo(90, seededAt) }],
  ]);
}

const minutesAgo = (minutes: number, from: Date): Date =>
  new Date(from.getTime() - minutes * 60_000);

const daysAgo = (days: number, from: Date): Date =>
  new Date(from.getTime() - days * 86_400_000);

/** Deterministic pseudo-random in [0, 1) from a string seed and index. */
function jitter(seedText: string, index: number): number {
  let hash = 2166136261;
  const input = `${seedText}:${index}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 1000) / 1000;
}

const encodeCursor = (offset: number): string =>
  Buffer.from(JSON.stringify({ offset })).toString("base64url");

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { offset?: number };
    return typeof parsed.offset === "number" && parsed.offset >= 0
      ? parsed.offset
      : 0;
  } catch {
    return 0;
  }
}

/**
 * In-memory implementation of the gateway contract. State is seeded from
 * fixtures at construction and mutates for the lifetime of the dev server.
 */
export class MockStore implements Gateway {
  private readonly users = new Map<string, MockUser>();
  private readonly deals = new Map<string, DealState>();
  private approvals: ApprovalState[] = [];
  private executionLog: LogState[] = [];
  private readonly watchedSkus = new Set<string>();
  private apiKeys: ApiKeyState[] = [];
  private webhooks: WebhookState[] = [];
  private deliveries: DeliveryState[] = [];
  private history: HistoryState[] = [];
  private spentTodayGbp = SPENT_TODAY_GBP;

  private scanJobs: ScanJobState[] = [];

  // Simulation state (docs/demo-improvement-plan.md §3.1)
  private notifications: NotificationState[] = [];
  private readonly circuits = new Map<string, CircuitState>();
  private reservePool: DealSeed[] = [...RESERVE_SEEDS];
  private readonly rand = mulberry32(hashSeed("arbiq-demo-v1"));
  private timeWarpMs = 0;
  private lastTickAt: Date;

  public constructor(private readonly now: () => Date = () => new Date()) {
    const seededAt = this.clock();
    this.lastTickAt = seededAt;

    this.users.set(DEMO_USER.email, {
      userId: DEMO_USER.userId,
      email: DEMO_USER.email,
      password: DEMO_USER.password,
      plan: DEMO_USER.plan,
      vatRegistered: DEMO_USER.vatRegistered,
      mfaVerified: false,
      minMarginPct: DEMO_USER.minMarginPct,
      dailySpendCapGbp: DAILY_SPEND_CAP_GBP,
      quantityCapPerDeal: QUANTITY_CAP_PER_DEAL,
      backupCodesRemaining: 8,
      notificationPrefs: defaultNotificationPrefs(),
      channels: defaultChannels(seededAt),
    });

    for (const dealSeed of DEAL_SEEDS) {
      this.deals.set(dealSeed.id, {
        seed: dealSeed,
        pricing: { ...dealSeed.pricing },
        surfacedAt: minutesAgo(dealSeed.surfacedMinutesAgo, seededAt),
        dismissed: false,
        expired: false,
        savedForLater: false,
        refreshCount: 0,
        subThresholdSteps: 0,
      });
    }

    for (const approvalSeed of APPROVAL_SEEDS) {
      const deal = this.deals.get(approvalSeed.dealId);
      if (!deal) {
        continue;
      }

      this.approvals.push({
        id: approvalSeed.id,
        dealId: approvalSeed.dealId,
        quantity: approvalSeed.quantity,
        sellChannel: deal.seed.channel,
        status: "pending",
        queuedAt: minutesAgo(approvalSeed.queuedMinutesAgo, seededAt),
        pricing: { ...deal.pricing },
        failureReason: null,
      });
    }

    for (const tierUser of TIER_DEMO_USERS) {
      this.users.set(tierUser.email, {
        userId: tierUser.userId,
        email: tierUser.email,
        password: tierUser.password,
        plan: tierUser.plan,
        vatRegistered: tierUser.vatRegistered,
        mfaVerified: false,
        minMarginPct: tierUser.minMarginPct,
        dailySpendCapGbp: DAILY_SPEND_CAP_GBP,
        quantityCapPerDeal: QUANTITY_CAP_PER_DEAL,
        backupCodesRemaining: 8,
        notificationPrefs: defaultNotificationPrefs(),
        channels: defaultChannels(seededAt),
      });
    }

    // Every demo account gets its own copy of the seeded scan jobs so the
    // plan-limit and cadence differences are visible immediately.
    const scanJobUsers = [
      DEMO_USER.userId,
      ...TIER_DEMO_USERS.map((user) => user.userId),
    ];
    this.scanJobs = scanJobUsers.flatMap((userId) =>
      SCAN_JOB_SEEDS.map((job) => ({
        id: userId === DEMO_USER.userId ? job.id : `${job.id}-${userId}`,
        userId,
        retailer: job.retailer,
        category: job.category,
        keywords: [...job.keywords],
        minMarginPct: job.minMarginPct,
        paused: job.paused,
        lastRunAt: minutesAgo(7, seededAt),
        createdAt: daysAgo(job.createdDaysAgo, seededAt),
      })),
    );

    this.executionLog = EXECUTION_LOG_SEEDS.map((entry) => ({
      id: entry.id,
      skuTitle: entry.skuTitle,
      outcome: entry.outcome,
      detail: entry.detail,
      occurredAt: minutesAgo(entry.minutesAgo, seededAt),
    }));

    this.apiKeys = API_KEY_SEEDS.map((key) => ({
      id: key.id,
      label: key.label,
      prefix: key.prefix,
      createdAt: daysAgo(key.createdDaysAgo, seededAt),
      lastUsedAt:
        key.lastUsedMinutesAgo === null
          ? null
          : minutesAgo(key.lastUsedMinutesAgo, seededAt),
      permissions: key.permissions,
    }));

    this.webhooks = WEBHOOK_SEEDS.map((webhook) => ({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: "active",
      lastDeliveryAt: minutesAgo(webhook.lastDeliveryMinutesAgo, seededAt),
    }));

    this.deliveries = DELIVERY_SEEDS.map((delivery) => ({
      id: delivery.id,
      deliveredAt: minutesAgo(delivery.minutesAgo, seededAt),
      event: delivery.event,
      urlHost: delivery.urlHost,
      statusCode: delivery.statusCode,
      retryOf: delivery.retryOf,
    }));

    this.history = HISTORY_SEEDS.map((record) => ({
      id: record.id,
      skuTitle: record.skuTitle,
      buyRetailer: record.buyRetailer,
      channel: record.channel,
      buyPriceGbp: record.buyPriceGbp,
      sellPriceGbp: record.sellPriceGbp,
      netProfitGbp: record.netProfitGbp,
      netMarginPct: record.netMarginPct,
      status: record.status,
      closedAt: daysAgo(record.daysAgo, seededAt),
      seeded: true,
    }));
  }

  // ─── Clock & simulation engine ───────────────────────────────────────────

  /** Current simulated time: injected clock plus the demo time-warp offset. */
  private clock(): Date {
    return new Date(this.now().getTime() + this.timeWarpMs);
  }

  /**
   * Lazily advances the simulation in fixed steps. Called at the start of
   * every gateway method so the demo "runs" without background timers.
   */
  private tick(): void {
    const nowMs = this.clock().getTime();
    const elapsed = nowMs - this.lastTickAt.getTime();
    let steps = Math.floor(elapsed / SIM_STEP_MS);
    if (steps <= 0) {
      return;
    }

    // After a long idle period, simulate only the most recent window.
    steps = Math.min(steps, SIM_MAX_STEPS_PER_TICK);
    for (let index = steps; index > 0; index--) {
      this.step(new Date(nowMs - (index - 1) * SIM_STEP_MS));
    }

    this.lastTickAt = new Date(nowMs);
  }

  private step(at: Date): void {
    // 1. Circuit recovery (TDD §5.2.2: half-open probe → closed).
    for (const [retailer, circuit] of this.circuits) {
      if (at.getTime() - circuit.openedAt.getTime() >= SIM_CIRCUIT_RECOVERY_MS) {
        this.circuits.delete(retailer);
        this.notify(
          "scraper_circuit_closed",
          `${retailer} scraper recovered`,
          `The ${retailer} circuit breaker closed after a successful probe. Suspended scan jobs resumed.`,
          "/dashboard",
          at,
        );
      }
    }

    // 2. Price drift + expiry for live deals.
    for (const deal of this.deals.values()) {
      if (deal.dismissed || this.circuits.has(deal.seed.retailer)) {
        continue;
      }

      const drift = (this.rand() - 0.5) * 2 * SIM_DRIFT_PER_STEP;
      const base = deal.seed.pricing.buyPriceGbp;
      const next = deal.pricing.buyPriceGbp * (1 + drift);
      deal.pricing.buyPriceGbp = Number(
        Math.min(
          base * (1 + SIM_DRIFT_CLAMP),
          Math.max(base * (1 - SIM_DRIFT_CLAMP), next),
        ).toFixed(2),
      );

      const margin = computeMargin(deal.pricing);
      if (margin.netMarginPct < SIM_EXPIRY_MARGIN_PCT) {
        deal.subThresholdSteps += 1;
        if (deal.subThresholdSteps >= SIM_EXPIRY_STEPS) {
          this.expireDeal(deal, at);
        }
      } else {
        deal.subThresholdSteps = 0;
      }
    }

    // 3. Occasionally surface a new deal.
    if (this.rand() < SIM_SURFACE_PROBABILITY) {
      this.surfaceNextDeal(at);
    }

    // 4. Scan jobs fire at their plan cadence (TDD §5.8.2 active → running).
    for (const job of this.scanJobs) {
      if (job.paused || this.circuits.has(job.retailer)) {
        continue;
      }

      const owner = [...this.users.values()].find(
        (user) => user.userId === job.userId,
      );
      const cadenceMs =
        PLAN_ENTITLEMENTS[owner?.plan ?? "business"].cadence_minutes * 60_000;
      if (!job.lastRunAt || at.getTime() - job.lastRunAt.getTime() >= cadenceMs) {
        job.lastRunAt = at;
      }
    }
  }

  private expireDeal(deal: DealState, at: Date): void {
    deal.dismissed = true;
    deal.expired = true;
    deal.subThresholdSteps = 0;
    this.notify(
      "deal_expired",
      "Deal expired",
      `${deal.seed.title} dropped below a viable margin and left the feed.`,
      null,
      at,
    );
  }

  /** Surfaces a deal from the reserve pool, or recycles an expired one. */
  private surfaceNextDeal(at: Date): DealState | null {
    const reserveSeed = this.reservePool.shift();
    if (reserveSeed) {
      const deal: DealState = {
        seed: reserveSeed,
        pricing: { ...reserveSeed.pricing },
        surfacedAt: at,
        dismissed: false,
        expired: false,
        savedForLater: false,
        refreshCount: 0,
        subThresholdSteps: 0,
      };
      this.deals.set(reserveSeed.id, deal);
      this.notifySurfaced(deal, at);
      return deal;
    }

    // Pool exhausted — re-surface an auto-expired deal with fresh pricing.
    const recyclable = [...this.deals.values()].find((deal) => deal.expired);
    if (!recyclable) {
      return null;
    }

    recyclable.pricing = { ...recyclable.seed.pricing };
    recyclable.dismissed = false;
    recyclable.expired = false;
    recyclable.subThresholdSteps = 0;
    recyclable.surfacedAt = at;
    this.notifySurfaced(recyclable, at);
    return recyclable;
  }

  private notifySurfaced(deal: DealState, at: Date): void {
    const margin = computeMargin(deal.pricing);
    this.notify(
      "deal_surfaced",
      "New deal surfaced",
      `${deal.seed.title} — ${margin.netMarginPct.toFixed(1)}% margin via ${deal.seed.retailer} → ${CHANNEL_LABELS[deal.seed.channel]}.`,
      `/deals/${deal.seed.id}`,
      at,
    );
  }

  private notify(
    type: NotificationType,
    title: string,
    body: string,
    href: string | null,
    at: Date = this.clock(),
  ): void {
    this.notifications.unshift({
      id: `ntf-${crypto.randomUUID()}`,
      type,
      title,
      body,
      href,
      createdAt: at,
      read: false,
    });
    this.notifications = this.notifications.slice(0, NOTIFICATION_CAP);
  }

  // ─── Demo control operations (mock-only, not part of Gateway) ────────────

  /** Surfaces a deal immediately. Returns its title, or null if none left. */
  public demoSurfaceDeal(): string | null {
    this.tick();
    return this.surfaceNextDeal(this.clock())?.seed.title ?? null;
  }

  /** Opens or closes a retailer's scraper circuit breaker (TDD §5.2.2). */
  public demoSetCircuit(retailer: string, open: boolean): void {
    this.tick();
    if (open && !this.circuits.has(retailer)) {
      this.circuits.set(retailer, { openedAt: this.clock() });
      this.notify(
        "scraper_circuit_open",
        `${retailer} scraper paused`,
        `Extraction failures exceeded the threshold — the ${retailer} circuit breaker is open. Affected scan jobs are suspended until it recovers.`,
        "/dashboard",
      );
    } else if (!open && this.circuits.has(retailer)) {
      this.circuits.delete(retailer);
      this.notify(
        "scraper_circuit_closed",
        `${retailer} scraper recovered`,
        `The ${retailer} circuit breaker closed. Suspended scan jobs resumed.`,
        "/dashboard",
      );
    }
  }

  /** Advances the simulated clock — staleness/409 paths become demoable. */
  public demoAdvanceClock(minutes: number): void {
    this.timeWarpMs += minutes * 60_000;
    this.tick();
  }

  /** Switches the signed-in user's plan tier (PRD §8 gating walkthroughs). */
  public demoSetPlan(
    userId: string,
    plan: MockUser["plan"],
  ): SessionUser {
    const user = this.requireUser(userId);
    user.plan = plan;
    return this.toSessionUser(user);
  }

  /** Retailers whose circuit breaker is currently open. */
  public openCircuits(): string[] {
    this.tick();
    return [...this.circuits.keys()];
  }

  public async getSystemStatus(
    _userId: string,
  ): Promise<{ open_circuits: string[] }> {
    return { open_circuits: this.openCircuits() };
  }

  // ─── Notifications ───────────────────────────────────────────────────────

  public async listNotifications(_userId: string): Promise<NotificationsResponse> {
    this.tick();
    return {
      notifications: this.notifications.map(
        (notification): Notification => ({
          id: notification.id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          href: notification.href,
          created_at: notification.createdAt.toISOString(),
          read: notification.read,
        }),
      ),
      unread_count: this.notifications.filter((n) => !n.read).length,
    };
  }

  public async markNotificationRead(
    _userId: string,
    notificationId: string,
  ): Promise<void> {
    const notification = this.notifications.find(
      (candidate) => candidate.id === notificationId,
    );
    if (notification) {
      notification.read = true;
    }
  }

  public async markAllNotificationsRead(_userId: string): Promise<void> {
    for (const notification of this.notifications) {
      notification.read = true;
    }
  }

  public async dismissNotification(
    _userId: string,
    notificationId: string,
  ): Promise<void> {
    this.notifications = this.notifications.filter(
      (candidate) => candidate.id !== notificationId,
    );
  }

  // ─── User settings (TDD §5.9.5: profile, MFA, channels, GDPR) ───────────

  public async getUserSettings(userId: string): Promise<UserSettings> {
    this.tick();
    return this.toUserSettings(this.requireUser(userId));
  }

  public async updateProfile(
    userId: string,
    request: {
      vat_registered?: boolean;
      min_margin_pct?: number;
      daily_spend_cap_gbp?: number;
      quantity_cap_per_deal?: number;
    },
  ): Promise<UserSettings> {
    this.tick();
    const user = this.requireUser(userId);
    if (request.vat_registered !== undefined) {
      user.vatRegistered = request.vat_registered;
    }

    if (request.min_margin_pct !== undefined) {
      if (request.min_margin_pct < 0 || request.min_margin_pct >= 100) {
        throw GatewayError.conflict("Margin threshold must be between 0 and 99.");
      }

      user.minMarginPct = request.min_margin_pct;
    }

    if (request.daily_spend_cap_gbp !== undefined) {
      if (request.daily_spend_cap_gbp < 0) {
        throw GatewayError.conflict("Daily spend cap cannot be negative.");
      }
      user.dailySpendCapGbp = request.daily_spend_cap_gbp;
    }

    if (request.quantity_cap_per_deal !== undefined) {
      if (request.quantity_cap_per_deal < 0) {
        throw GatewayError.conflict("Quantity cap cannot be negative.");
      }
      user.quantityCapPerDeal = request.quantity_cap_per_deal;
    }

    return this.toUserSettings(user);
  }

  public async updateNotificationPrefs(
    userId: string,
    prefs: NotificationPrefs,
  ): Promise<UserSettings> {
    this.tick();
    const user = this.requireUser(userId);
    user.notificationPrefs = prefs;
    return this.toUserSettings(user);
  }

  public async connectChannel(
    userId: string,
    channel: SellChannel,
  ): Promise<ChannelConnection> {
    this.tick();
    const user = this.requireUser(userId);
    // Mock OAuth callback: the token is "encrypted and stored" immediately
    // (TDD §5.8.5 absent/expired → active).
    user.channels.set(channel, {
      status: "connected",
      connectedAt: this.clock(),
    });

    return this.toChannelConnection(
      channel,
      user.channels.get(channel) ?? null,
    );
  }

  public async disconnectChannel(
    userId: string,
    channel: SellChannel,
  ): Promise<void> {
    this.tick();
    const user = this.requireUser(userId);
    // TDD §5.8.5 revoked_user: token zeroised, listing disabled immediately.
    user.channels.set(channel, { status: "disconnected", connectedAt: null });
  }

  public async regenerateBackupCodes(
    userId: string,
  ): Promise<{ codes: string[] }> {
    this.tick();
    const user = this.requireUser(userId);
    user.backupCodesRemaining = 8;

    // 8 × 8-char codes (TDD §5.6.2), shown exactly once.
    const codes = Array.from({ length: 8 }, () =>
      crypto.randomUUID().replace(/-/g, "").slice(0, 8),
    );

    return { codes };
  }

  public async exportUserData(userId: string): Promise<string> {
    this.tick();
    const user = this.requireUser(userId);

    // GDPR data export (TDD §8.6): profile, scan jobs, queue, history.
    const payload = {
      exported_at: this.clock().toISOString(),
      profile: this.toUserSettings(user),
      scan_jobs: (await this.listScanJobs(userId)).jobs,
      approval_queue: (await this.getApprovalQueue(userId)).items,
      deal_history: await this.listHistory(userId),
      notifications: (await this.listNotifications(userId)).notifications,
    };

    return JSON.stringify(payload, null, 2);
  }

  public async deleteAccount(userId: string): Promise<void> {
    this.tick();
    const user = this.requireUser(userId);

    // GDPR erasure: PII removed; financial history retained anonymised
    // for tax compliance (TDD §8.6) — the mock simply drops user-owned state.
    this.users.delete(user.email);
    this.scanJobs = this.scanJobs.filter((job) => job.userId !== userId);
  }

  private toUserSettings(user: MockUser): UserSettings {
    return {
      email: user.email,
      plan: user.plan,
      vat_registered: user.vatRegistered,
      min_margin_pct: user.minMarginPct.toFixed(1),
      daily_spend_cap_gbp: money(user.dailySpendCapGbp),
      quantity_cap_per_deal: user.quantityCapPerDeal,
      mfa_enrolled: user.mfaVerified,
      backup_codes_remaining: user.backupCodesRemaining,
      notifications: user.notificationPrefs,
      channels: (
        [
          "amazon_fba",
          "amazon_fbm",
          "ebay",
          "shopify",
          "facebook",
          "gumtree",
        ] as SellChannel[]
      ).map((channel) =>
        this.toChannelConnection(channel, user.channels.get(channel) ?? null),
      ),
    };
  }

  private toChannelConnection(
    channel: SellChannel,
    state: ChannelState | null,
  ): ChannelConnection {
    return {
      channel,
      label: CHANNEL_LABELS[channel],
      status: state?.status ?? "disconnected",
      connected_at: state?.connectedAt?.toISOString() ?? null,
    };
  }

  // ─── Scan jobs (PRD §5.1/§5.2, TDD §5.8.2) ──────────────────────────────

  public async listScanJobs(userId: string): Promise<ScanJobsResponse> {
    this.tick();
    const user = this.requireUser(userId);
    const limit = PLAN_ENTITLEMENTS[user.plan].scan_job_limit;
    const jobs = this.scanJobs
      .filter((job) => job.userId === userId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const overLimitIds = this.overLimitJobIds(jobs, limit);
    const mapped = jobs.map((job) =>
      this.toScanJob(job, user.plan, overLimitIds),
    );

    return {
      jobs: mapped,
      active_count: mapped.filter((job) => job.status === "active").length,
      job_limit: limit,
    };
  }

  public async createScanJob(
    userId: string,
    request: {
      retailer: string;
      category: string;
      keywords: string[];
      min_margin_pct: number;
    },
  ): Promise<ScanJob> {
    this.tick();
    const user = this.requireUser(userId);
    const limit = PLAN_ENTITLEMENTS[user.plan].scan_job_limit;
    const activeCount = this.scanJobs.filter(
      (job) => job.userId === userId && !job.paused,
    ).length;
    if (limit !== null && activeCount >= limit) {
      throw GatewayError.planGated(
        `Your ${user.plan} plan allows ${limit} active scan jobs. Pause one or upgrade to add more.`,
      );
    }

    const job: ScanJobState = {
      id: `scan-${crypto.randomUUID()}`,
      userId,
      retailer: request.retailer,
      category: request.category,
      keywords: request.keywords,
      minMarginPct: request.min_margin_pct,
      paused: false,
      // First run dispatched immediately (TDD §5.8.2 draft → active).
      lastRunAt: this.clock(),
      createdAt: this.clock(),
    };
    this.scanJobs.push(job);

    return this.toScanJob(job, user.plan, new Set());
  }

  public async pauseScanJob(userId: string, jobId: string): Promise<void> {
    this.tick();
    this.requireScanJob(userId, jobId).paused = true;
  }

  public async resumeScanJob(userId: string, jobId: string): Promise<void> {
    this.tick();
    this.requireScanJob(userId, jobId).paused = false;
  }

  public async deleteScanJob(userId: string, jobId: string): Promise<void> {
    this.tick();
    this.requireScanJob(userId, jobId);
    this.scanJobs = this.scanJobs.filter(
      (job) => !(job.userId === userId && job.id === jobId),
    );
  }

  /** Oldest excess active jobs are over_limit after a downgrade (TDD §5.8.2). */
  private overLimitJobIds(
    jobs: ScanJobState[],
    limit: number | null,
  ): Set<string> {
    if (limit === null) {
      return new Set();
    }

    const active = jobs.filter((job) => !job.paused);
    const excess = active.length - limit;
    return new Set(active.slice(0, Math.max(0, excess)).map((job) => job.id));
  }

  private toScanJob(
    job: ScanJobState,
    plan: MockUser["plan"],
    overLimitIds: Set<string>,
  ): ScanJob {
    const status = job.paused
      ? "paused"
      : this.circuits.has(job.retailer)
        ? "suspended"
        : overLimitIds.has(job.id)
          ? "over_limit"
          : "active";

    return {
      id: job.id,
      retailer: job.retailer,
      category: job.category,
      keywords: job.keywords,
      min_margin_pct: job.minMarginPct.toFixed(1),
      cadence_minutes: PLAN_ENTITLEMENTS[plan].cadence_minutes,
      status,
      last_run_at: job.lastRunAt?.toISOString() ?? null,
      created_at: job.createdAt.toISOString(),
    };
  }

  private requireScanJob(userId: string, jobId: string): ScanJobState {
    const job = this.scanJobs.find(
      (candidate) => candidate.userId === userId && candidate.id === jobId,
    );
    if (!job) {
      throw GatewayError.notFound("Scan job not found.");
    }

    return job;
  }

  // ─── Auth ────────────────────────────────────────────────────────────────

  public async login(email: string, password: string): Promise<LoginResult> {
    const user = this.users.get(email.toLowerCase());
    if (!user || user.password !== password) {
      throw GatewayError.invalidCredentials();
    }

    return { user: this.toSessionUser(user), mfa_required: !user.mfaVerified };
  }

  public async register(email: string, password: string): Promise<LoginResult> {
    const normalised = email.toLowerCase();
    if (this.users.has(normalised)) {
      throw GatewayError.conflict("An account with this email already exists.");
    }

    const user: MockUser = {
      userId: `user-${crypto.randomUUID()}`,
      email: normalised,
      password,
      plan: "business",
      vatRegistered: false,
      mfaVerified: false,
      minMarginPct: 20,
      dailySpendCapGbp: DAILY_SPEND_CAP_GBP,
      quantityCapPerDeal: QUANTITY_CAP_PER_DEAL,
      backupCodesRemaining: 8,
      notificationPrefs: defaultNotificationPrefs(),
      channels: defaultChannels(this.clock()),
    };
    this.users.set(normalised, user);

    return { user: this.toSessionUser(user), mfa_required: true };
  }

  public async verifyMfa(userId: string, code: string): Promise<SessionUser> {
    const user = this.requireUser(userId);
    if (code !== DEMO_USER.mfaCode) {
      throw new GatewayError({
        type: "/errors/invalid-mfa-code",
        title: "Invalid code",
        status: 400,
        detail: "The verification code is incorrect. In the mock environment the code is 000000.",
      });
    }

    user.mfaVerified = true;
    return this.toSessionUser(user);
  }

  public async getSessionUser(userId: string): Promise<SessionUser> {
    return this.toSessionUser(this.requireUser(userId));
  }

  // ─── Deals ───────────────────────────────────────────────────────────────

  public async listDeals(
    _userId: string,
    filters: DealListFilters,
  ): Promise<DealListResponse> {
    this.tick();
    let visible =
      filters.view === "saved"
        ? [...this.deals.values()].filter((deal) => deal.savedForLater)
        : [...this.deals.values()].filter((deal) => !deal.dismissed);

    if (filters.retailer) {
      visible = visible.filter(
        (deal) =>
          deal.seed.retailer.toLowerCase() === filters.retailer?.toLowerCase(),
      );
    }

    if (filters.category) {
      visible = visible.filter(
        (deal) =>
          deal.seed.category.toLowerCase() === filters.category?.toLowerCase(),
      );
    }

    if (filters.min_margin !== undefined) {
      visible = visible.filter(
        (deal) =>
          computeMargin(deal.pricing).netMarginPct >= (filters.min_margin ?? 0),
      );
    }

    const sort = filters.sort ?? "margin";
    visible.sort((a, b) => {
      if (sort === "newest") {
        return b.surfacedAt.getTime() - a.surfacedAt.getTime();
      }

      const marginA = computeMargin(a.pricing);
      const marginB = computeMargin(b.pricing);
      return sort === "profit"
        ? marginB.netProfitGbp - marginA.netProfitGbp
        : marginB.netMarginPct - marginA.netMarginPct;
    });

    const allActive = [...this.deals.values()].filter((deal) => !deal.dismissed);
    const totalProfit = allActive.reduce(
      (sum, deal) => sum + computeMargin(deal.pricing).netProfitGbp,
      0,
    );
    const avgMargin =
      allActive.length > 0
        ? allActive.reduce(
            (sum, deal) => sum + computeMargin(deal.pricing).netMarginPct,
            0,
          ) / allActive.length
        : 0;

    const offset = decodeCursor(filters.after);
    const limit = Math.min(filters.limit ?? 50, 200);
    const page = visible.slice(offset, offset + limit);
    const nextOffset = offset + limit;

    return {
      deals: page.map((deal) => this.toDeal(deal)),
      next_cursor: nextOffset < visible.length ? encodeCursor(nextOffset) : null,
      total: visible.length,
      stats: {
        active_deals: allActive.length,
        est_profit_gbp: money(totalProfit),
        avg_margin_pct: avgMargin.toFixed(1),
        pending_approvals: this.pendingApprovals().length,
      },
    };
  }

  public async getDeal(_userId: string, dealId: string): Promise<DealDetail> {
    this.tick();
    return this.toDealDetail(this.requireDeal(dealId));
  }

  public async refreshDeal(_userId: string, dealId: string): Promise<DealDetail> {
    this.tick();
    const deal = this.requireDeal(dealId);
    deal.refreshCount += 1;

    // Simulated drift: small deterministic buy-price movement per refresh.
    const driftFactors = [-0.02, 0.01, -0.01, 0.02];
    const factor = driftFactors[deal.refreshCount % driftFactors.length];
    deal.pricing.buyPriceGbp = Number(
      (deal.pricing.buyPriceGbp * (1 + factor)).toFixed(2),
    );
    deal.surfacedAt = this.clock();

    return this.toDealDetail(deal);
  }

  public async dismissDeal(_userId: string, dealId: string): Promise<void> {
    this.tick();
    this.requireDeal(dealId).dismissed = true;
  }

  public async saveDealForLater(_userId: string, dealId: string): Promise<void> {
    this.tick();
    this.requireDeal(dealId).savedForLater = true;
  }

  public async unsaveDeal(_userId: string, dealId: string): Promise<void> {
    this.tick();
    this.requireDeal(dealId).savedForLater = false;
  }

  // ─── Approvals ───────────────────────────────────────────────────────────

  public async getApprovalQueue(_userId: string): Promise<ApprovalQueueResponse> {
    this.tick();
    const user = this.requireUser(_userId);
    return {
      items: this.approvals
        .filter((approval) => !["removed", "closed"].includes(approval.status))
        .sort((a, b) => b.queuedAt.getTime() - a.queuedAt.getTime())
        .map((approval) => this.toApprovalItem(approval)),
      caps: {
        daily_spend_cap_gbp: money(user.dailySpendCapGbp),
        remaining_today_gbp: money(
          Math.max(0, user.dailySpendCapGbp - this.spentTodayGbp),
        ),
        quantity_cap_per_deal: user.quantityCapPerDeal,
        mfa_verified: user.mfaVerified,
      },
      execution_log: this.executionLog
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .slice(0, 8)
        .map(
          (entry): ExecutionLogEntry => ({
            id: entry.id,
            sku_title: entry.skuTitle,
            outcome: entry.outcome,
            detail: entry.detail,
            occurred_at: entry.occurredAt.toISOString(),
          }),
        ),
    };
  }

  public async createApproval(
    _userId: string,
    request: CreateApprovalRequest,
  ): Promise<{ approval_id: string }> {
    this.tick();
    const user = this.requireUser(_userId);
    const deal = this.requireDeal(request.deal_id);

    if (request.quantity < 1 || (user.quantityCapPerDeal > 0 && request.quantity > user.quantityCapPerDeal)) {
      throw GatewayError.conflict(
        user.quantityCapPerDeal > 0
          ? `Quantity must be between 1 and ${user.quantityCapPerDeal} per deal.`
          : "Quantity must be at least 1.",
      );
    }

    const duplicate = this.approvals.find(
      (approval) =>
        approval.dealId === request.deal_id && approval.status === "pending",
    );
    if (duplicate) {
      throw GatewayError.conflict("This deal is already in your approval queue.");
    }

    const approval: ApprovalState = {
      id: `appr-${crypto.randomUUID()}`,
      dealId: request.deal_id,
      quantity: request.quantity,
      sellChannel: request.sell_channel,
      status: "pending",
      queuedAt: this.clock(),
      pricing: { ...deal.pricing },
      failureReason: null,
    };
    this.approvals.push(approval);

    return { approval_id: approval.id };
  }

  public async approve(userId: string, approvalId: string): Promise<ApproveResult> {
    this.tick();
    const user = this.requireUser(userId);
    if (!user.mfaVerified) {
      throw GatewayError.mfaRequired();
    }

    if (!PLAN_ENTITLEMENTS[user.plan].semi_automated_purchasing) {
      throw GatewayError.planGated(
        "Semi-automated purchasing requires the Pro or Business plan.",
      );
    }

    const approval = this.requireApproval(approvalId);

    // Listing needs a live OAuth token for the sell channel (TDD §7.2.2:
    // expired/absent token → failure with a re-authentication prompt).
    const channelState = user.channels.get(approval.sellChannel);
    if (channelState?.status !== "connected") {
      throw GatewayError.conflict(
        `${CHANNEL_LABELS[approval.sellChannel]} is ${channelState?.status === "expired" ? "expired" : "not connected"} — reconnect it in Settings before approving.`,
      );
    }

    if (approval.status !== "pending") {
      throw GatewayError.conflict(
        `Approval is in state '${approval.status}' and cannot be approved.`,
      );
    }

    // Pre-execution margin re-check (TDD §5.4): items stale by >45 minutes are
    // simulated as having drifted below the user's threshold.
    const ageMinutes =
      (this.clock().getTime() - approval.queuedAt.getTime()) / 60_000;
    if (ageMinutes > 45) {
      const driftedPricing: MarginInputs = {
        ...approval.pricing,
        buyPriceGbp: approval.pricing.buyPriceGbp * 1.18,
      };
      const drifted = computeMargin(driftedPricing);
      throw GatewayError.marginBelowThreshold(drifted.netMarginPct.toFixed(1));
    }

    const totalSpend = approval.pricing.buyPriceGbp * approval.quantity;
    if (user.dailySpendCapGbp > 0 && this.spentTodayGbp + totalSpend > user.dailySpendCapGbp) {
      throw GatewayError.spendCapExceeded(
        money(Math.max(0, user.dailySpendCapGbp - this.spentTodayGbp)),
      );
    }

    const margin = computeMargin(approval.pricing);
    approval.status = "executing";
    this.spentTodayGbp += totalSpend;
    this.scheduleExecution(approval);

    return {
      approval_id: approval.id,
      status: "executing",
      pre_execute_margin_pct: margin.netMarginPct.toFixed(1),
    };
  }

  /**
   * Closes a listed deal with its actual sale price (TDD §5.4 listed→closed).
   * Emits deal.closed semantics: an immutable history record plus a
   * notification, and the Analytics surfaces pick the record up immediately.
   */
  public async closeApproval(
    _userId: string,
    approvalId: string,
    actualSellPriceGbp: number,
  ): Promise<void> {
    this.tick();
    const approval = this.requireApproval(approvalId);
    if (approval.status !== "listed") {
      throw GatewayError.conflict(
        `Only listed deals can be marked as sold (current state: '${approval.status}').`,
      );
    }

    if (actualSellPriceGbp <= 0) {
      throw GatewayError.conflict("Sale price must be greater than zero.");
    }

    const deal = this.deals.get(approval.dealId);
    const pricing: MarginInputs = {
      ...approval.pricing,
      sellPriceGbp: actualSellPriceGbp,
    };
    const margin = computeMargin(pricing);

    approval.status = "closed";
    this.history.push({
      id: `hist-${crypto.randomUUID()}`,
      skuTitle: deal?.seed.title ?? "Unknown SKU",
      buyRetailer: deal?.seed.retailer ?? "Unknown",
      channel: approval.sellChannel,
      buyPriceGbp: approval.pricing.buyPriceGbp * approval.quantity,
      sellPriceGbp: actualSellPriceGbp * approval.quantity,
      netProfitGbp: Number((margin.netProfitGbp * approval.quantity).toFixed(2)),
      netMarginPct: Number(margin.netMarginPct.toFixed(1)),
      status: "sold",
      closedAt: this.clock(),
      seeded: false,
    });
    this.notify(
      "deal_closed",
      "Deal closed",
      `${deal?.seed.title ?? "Deal"} sold for £${(actualSellPriceGbp * approval.quantity).toFixed(2)} — £${(margin.netProfitGbp * approval.quantity).toFixed(2)} net profit recorded in history.`,
      "/analytics",
    );
  }

  /** Re-queues the deal behind a failed execution-log entry. */
  public async retryExecutionLogEntry(
    userId: string,
    logEntryId: string,
  ): Promise<{ approval_id: string }> {
    this.tick();
    const entry = this.executionLog.find(
      (candidate) => candidate.id === logEntryId,
    );
    if (!entry || entry.outcome !== "failed") {
      throw GatewayError.notFound("Failed execution log entry not found.");
    }

    const deal = [...this.deals.values()].find(
      (candidate) => candidate.seed.title === entry.skuTitle,
    );
    if (!deal) {
      throw GatewayError.conflict(
        `${entry.skuTitle} is no longer available — the deal has left the feed.`,
      );
    }

    this.executionLog = this.executionLog.filter(
      (candidate) => candidate.id !== logEntryId,
    );
    return this.createApproval(userId, {
      deal_id: deal.seed.id,
      quantity: 1,
      sell_channel: deal.seed.channel,
    });
  }

  public async dismissExecutionLogEntry(
    _userId: string,
    logEntryId: string,
  ): Promise<void> {
    this.executionLog = this.executionLog.filter(
      (candidate) => candidate.id !== logEntryId,
    );
  }

  public async refreshApproval(_userId: string, approvalId: string): Promise<void> {
    this.tick();
    const approval = this.requireApproval(approvalId);
    const deal = this.requireDeal(approval.dealId);

    approval.pricing = { ...deal.pricing };
    approval.queuedAt = this.clock();
  }

  public async removeApproval(_userId: string, approvalId: string): Promise<void> {
    this.tick();
    const approval = this.requireApproval(approvalId);
    approval.status = "removed";
  }

  // ─── Catalogue ───────────────────────────────────────────────────────────

  public async listCatalogue(
    _userId: string,
    filters: CatalogueFilters,
  ): Promise<CatalogueResponse> {
    this.tick();
    let skus = [...this.deals.values()];

    if (filters.watched_only) {
      skus = skus.filter((deal) => this.watchedSkus.has(deal.seed.skuId));
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      skus = skus.filter(
        (deal) =>
          deal.seed.title.toLowerCase().includes(query) ||
          deal.seed.brand.toLowerCase().includes(query),
      );
    }

    if (filters.category) {
      skus = skus.filter(
        (deal) =>
          deal.seed.category.toLowerCase() === filters.category?.toLowerCase(),
      );
    }

    if (filters.retailer) {
      skus = skus.filter(
        (deal) =>
          deal.seed.retailer.toLowerCase() === filters.retailer?.toLowerCase(),
      );
    }

    if (filters.min_score !== undefined) {
      skus = skus.filter(
        (deal) => (deal.seed.compositeScore ?? 0) >= (filters.min_score ?? 0),
      );
    }

    skus.sort(
      (a, b) => (b.seed.compositeScore ?? -1) - (a.seed.compositeScore ?? -1),
    );

    const offset = decodeCursor(filters.after);
    const limit = Math.min(filters.limit ?? 20, 100);
    const page = skus.slice(offset, offset + limit);
    const nextOffset = offset + limit;

    return {
      skus: page.map((deal) => this.toCatalogueSku(deal)),
      next_cursor: nextOffset < skus.length ? encodeCursor(nextOffset) : null,
      total: skus.length,
      category_rankings: this.categoryRankings(),
    };
  }

  public async toggleWatch(
    _userId: string,
    skuId: string,
  ): Promise<{ watched: boolean }> {
    if (this.watchedSkus.has(skuId)) {
      this.watchedSkus.delete(skuId);
      return { watched: false };
    }

    this.watchedSkus.add(skuId);
    return { watched: true };
  }

  public async exportCatalogueCsv(_userId: string): Promise<string> {
    this.tick();
    const header =
      "sku_id,title,brand,category,composite_score,score_confidence,high_opportunity,deal_events_90d,cheapest_retailer,cheapest_price_gbp";
    const rows = [...this.deals.values()].map((deal) => {
      const sku = this.toCatalogueSku(deal);
      return [
        sku.id,
        JSON.stringify(sku.title),
        JSON.stringify(sku.brand ?? ""),
        JSON.stringify(sku.category),
        sku.composite_score ?? "",
        sku.score_confidence,
        sku.high_opportunity,
        sku.deal_event_count_90d,
        JSON.stringify(sku.cheapest_source?.retailer ?? ""),
        sku.cheapest_source?.price_gbp ?? "",
      ].join(",");
    });

    return [header, ...rows].join("\n");
  }

  // ─── Analytics & history ─────────────────────────────────────────────────

  public async getAnalytics(
    _userId: string,
    filters: AnalyticsFilters,
  ): Promise<AnalyticsDashboard> {
    this.tick();
    const period = filters.period ?? 30;
    const now = this.clock();

    let records = this.history.filter(
      (record) =>
        record.closedAt.getTime() >= now.getTime() - period * 86_400_000,
    );
    if (filters.retailer) {
      records = records.filter(
        (record) =>
          record.buyRetailer.toLowerCase() === filters.retailer?.toLowerCase(),
      );
    }

    if (filters.channel) {
      records = records.filter((record) => record.channel === filters.channel);
    }

    const daily = Array.from({ length: Math.min(period, 30) }, (_, index) => {
      const dayOffset = Math.min(period, 30) - 1 - index;
      const date = daysAgo(dayOffset, now);
      const wave = Math.sin(index / 3.2) * 0.4 + 1;
      const revenue = 120 + wave * 140 + jitter("revenue", dayOffset) * 90;
      const profit = revenue * (0.22 + jitter("profit", dayOffset) * 0.14);

      return {
        date: date.toISOString().slice(0, 10),
        gross_revenue_gbp: money(revenue),
        net_profit_gbp: money(profit),
        deal_count: 1 + Math.floor(jitter("count", dayOffset) * 4),
      };
    });

    // Stats blend the seeded baseline with closures made during this session.
    const dynamicClosures = this.history.filter(
      (record) => !record.seeded && record.status === "sold",
    );
    const dynamicProfit = dynamicClosures.reduce(
      (sum, record) => sum + (record.netProfitGbp ?? 0),
      0,
    );

    return {
      stats: {
        net_profit_gbp: money(ANALYTICS_STATS_SEED.netProfitGbp + dynamicProfit),
        deals_closed: ANALYTICS_STATS_SEED.dealsClosed + dynamicClosures.length,
        avg_roi_pct: ANALYTICS_STATS_SEED.avgRoiPct.toFixed(1),
        best_month_gbp: money(ANALYTICS_STATS_SEED.bestMonthGbp),
      },
      daily,
      channel_performance: CHANNEL_PERFORMANCE_SEEDS.map((channel) => ({
        channel_label: channel.channel_label,
        profit_gbp: money(channel.profit),
        deal_count: channel.deals,
        avg_margin_pct: channel.margin.toFixed(1),
      })),
      retailer_performance: RETAILER_PERFORMANCE_SEEDS.map((retailer) => ({
        retailer: retailer.retailer,
        profit_gbp: money(retailer.profit),
        deal_count: retailer.deals,
        avg_margin_pct: retailer.margin.toFixed(1),
      })),
      records: records
        .sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime())
        .map((record) => this.toDealRecord(record)),
    };
  }

  public async exportAnalyticsCsv(
    userId: string,
    filters: AnalyticsFilters,
  ): Promise<string> {
    const dashboard = await this.getAnalytics(userId, filters);
    const header =
      "closed_at,product,buy_retailer,sell_channel,buy_price_gbp,sell_price_gbp,net_profit_gbp,net_margin_pct,status";
    const rows = dashboard.records.map((record) =>
      [
        record.closed_at,
        JSON.stringify(record.sku_title),
        JSON.stringify(record.buy_retailer),
        record.sell_channel,
        record.buy_price_gbp,
        record.sell_price_gbp ?? "",
        record.net_profit_gbp ?? "",
        record.net_margin_pct ?? "",
        record.status,
      ].join(","),
    );

    return [header, ...rows].join("\n");
  }

  public async listHistory(_userId: string): Promise<DealRecord[]> {
    this.tick();
    return this.history
      .sort((a, b) => b.closedAt.getTime() - a.closedAt.getTime())
      .map((record) => this.toDealRecord(record));
  }

  // ─── API settings ────────────────────────────────────────────────────────

  public async getApiSettings(userId: string): Promise<ApiSettingsResponse> {
    this.tick();
    const user = this.requireUser(userId);
    const apiAccess = PLAN_ENTITLEMENTS[user.plan].api_access;
    if (apiAccess === "none") {
      throw GatewayError.planGated(
        "API access requires the Pro plan (read-only) or Business plan (full + webhooks).",
      );
    }

    return {
      plan: user.plan,
      api_access: apiAccess,
      // Per-plan daily quota from the TDD §3.4 routing table.
      quota_per_day: user.plan === "business" ? API_QUOTA_PER_DAY : 2_000,
      used_today: user.plan === "business" ? API_USED_TODAY : 312,
      keys: this.apiKeys.map((key) => ({
        id: key.id,
        label: key.label,
        key_prefix: `${key.prefix}…`,
        created_at: key.createdAt.toISOString(),
        last_used_at: key.lastUsedAt?.toISOString() ?? null,
        permissions: key.permissions,
      })),
      // Webhooks are Business-only (PRD §8: Pro = read-only REST).
      webhooks:
        apiAccess === "full"
          ? this.webhooks.map((webhook) => this.toWebhook(webhook))
          : [],
      deliveries: (apiAccess === "full" ? this.deliveries : [])
        .sort((a, b) => b.deliveredAt.getTime() - a.deliveredAt.getTime())
        .slice(0, 5)
        .map((delivery) => ({
          id: delivery.id,
          delivered_at: delivery.deliveredAt.toISOString(),
          event: delivery.event,
          url_host: delivery.urlHost,
          status_code: delivery.statusCode,
          retry_of: delivery.retryOf,
        })),
    };
  }

  public async createApiKey(
    _userId: string,
    label: string,
    permissions: "read" | "read_write",
  ): Promise<CreatedApiKey> {
    const secret = crypto.randomUUID().replace(/-/g, "");
    const fullKey = `arb_live_${secret}`;
    const key: ApiKeyState = {
      id: `key-${crypto.randomUUID()}`,
      label,
      prefix: fullKey.slice(0, 13),
      createdAt: this.clock(),
      lastUsedAt: null,
      permissions,
    };
    this.apiKeys.push(key);

    return {
      full_key: fullKey,
      record: {
        id: key.id,
        label: key.label,
        key_prefix: `${key.prefix}…`,
        created_at: key.createdAt.toISOString(),
        last_used_at: null,
        permissions: key.permissions,
      },
    };
  }

  public async revokeApiKey(_userId: string, keyId: string): Promise<void> {
    const index = this.apiKeys.findIndex((key) => key.id === keyId);
    if (index === -1) {
      throw GatewayError.notFound("API key not found.");
    }

    this.apiKeys.splice(index, 1);
  }

  public async registerWebhook(
    _userId: string,
    url: string,
    events: WebhookEvent[],
  ): Promise<WebhookEndpoint> {
    const webhook: WebhookState = {
      id: `wh-${crypto.randomUUID()}`,
      url,
      events,
      status: "active",
      lastDeliveryAt: null,
    };
    this.webhooks.push(webhook);

    return this.toWebhook(webhook);
  }

  public async deleteWebhook(_userId: string, webhookId: string): Promise<void> {
    const index = this.webhooks.findIndex((webhook) => webhook.id === webhookId);
    if (index === -1) {
      throw GatewayError.notFound("Webhook not found.");
    }

    this.webhooks.splice(index, 1);
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private scheduleExecution(approval: ApprovalState): void {
    const deal = this.deals.get(approval.dealId);
    const margin = computeMargin(approval.pricing);

    setTimeout(() => {
      approval.status = "purchased";
    }, 1_500);

    setTimeout(() => {
      approval.status = "listed";
      this.executionLog.unshift({
        id: `exec-${crypto.randomUUID()}`,
        skuTitle: deal?.seed.title ?? "Unknown SKU",
        outcome: "purchased_listed",
        detail: `Purchased £${approval.pricing.buyPriceGbp.toFixed(0)} (${deal?.seed.retailer}) → Listed on ${CHANNEL_LABELS[approval.sellChannel]} · est. £${margin.netProfitGbp.toFixed(0)} net`,
        occurredAt: this.clock(),
      });
      if (deal) {
        deal.dismissed = true;
      }
    }, 4_000);
  }

  private pendingApprovals(): ApprovalState[] {
    return this.approvals.filter((approval) => approval.status === "pending");
  }

  private requireUser(userId: string): MockUser {
    const user = [...this.users.values()].find(
      (candidate) => candidate.userId === userId,
    );
    if (!user) {
      throw GatewayError.notFound("User not found.");
    }

    return user;
  }

  private requireDeal(dealId: string): DealState {
    const deal = this.deals.get(dealId);
    if (!deal) {
      throw GatewayError.notFound("Deal not found.");
    }

    return deal;
  }

  private requireApproval(approvalId: string): ApprovalState {
    const approval = this.approvals.find(
      (candidate) => candidate.id === approvalId,
    );
    if (!approval) {
      throw GatewayError.notFound("Approval not found.");
    }

    return approval;
  }

  private toSessionUser(user: MockUser): SessionUser {
    return {
      user_id: user.userId,
      email: user.email,
      plan: user.plan,
      vat_registered: user.vatRegistered,
      mfa_verified: user.mfaVerified,
      min_margin_pct: user.minMarginPct.toFixed(1),
    };
  }

  private toDeal(deal: DealState): Deal {
    const margin = computeMargin(deal.pricing);

    return {
      deal_id: deal.seed.id,
      sku: {
        id: deal.seed.skuId,
        title: deal.seed.title,
        category: deal.seed.category,
        composite_score: deal.seed.compositeScore,
        score_confidence: deal.seed.scoreConfidence,
        high_opportunity: deal.seed.highOpportunity,
        deal_event_count_90d: deal.seed.dealEventCount90d,
      },
      buy: {
        retailer: deal.seed.retailer,
        price_gbp: money(deal.pricing.buyPriceGbp),
        delivery_gbp: money(deal.pricing.deliveryGbp),
        product_url: deal.seed.productUrl,
      },
      sell: {
        channel: deal.seed.channel,
        channel_label: CHANNEL_LABELS[deal.seed.channel],
        price_gbp: money(deal.pricing.sellPriceGbp),
      },
      margin: toMarginPayload(margin),
      surfaced_at: deal.surfacedAt.toISOString(),
    };
  }

  private toDealDetail(deal: DealState): DealDetail {
    const base = this.toDeal(deal);
    const vatReclaim = deal.pricing.vatAdjustmentGbp;
    const history = this.priceHistory(deal);
    const last90 = history.slice(-90);
    const avg90 =
      last90.reduce((sum, point) => sum + Number(point.buy_price_gbp), 0) /
      Math.max(1, last90.length);
    const belowAvgPct =
      avg90 > 0 ? ((avg90 - deal.pricing.buyPriceGbp) / avg90) * 100 : 0;

    return {
      ...base,
      buy_breakdown: {
        price_gbp: money(deal.pricing.buyPriceGbp),
        delivery_gbp: money(deal.pricing.deliveryGbp),
        vat_reclaim_gbp: money(vatReclaim),
        effective_gbp: money(
          deal.pricing.buyPriceGbp + deal.pricing.deliveryGbp + vatReclaim,
        ),
      },
      sell_breakdown: {
        price_gbp: money(deal.pricing.sellPriceGbp),
        referral_fee_gbp: money(
          -(deal.pricing.sellPriceGbp * deal.pricing.referralRate),
        ),
        fulfilment_fee_gbp: money(-deal.pricing.fulfilmentFeeGbp),
        fuel_surcharge_gbp: money(-deal.pricing.fuelSurchargeGbp),
      },
      price_history: history,
      demand_signal: {
        bsr_trend: deal.seed.bsrTrend,
        review_velocity: deal.seed.reviewVelocity,
      },
      below_90d_average_pct: belowAvgPct > 0.5 ? belowAvgPct.toFixed(1) : null,
    };
  }

  private priceHistory(deal: DealState): PricePoint[] {
    const now = this.clock();
    const baseBuy = deal.seed.pricing.buyPriceGbp;
    const baseSell = deal.seed.pricing.sellPriceGbp;

    return Array.from({ length: 365 }, (_, index) => {
      const dayOffset = 364 - index;
      const date = daysAgo(dayOffset, now);
      const seasonal = Math.sin((index / 365) * Math.PI * 4) * 0.06;
      const noise = (jitter(deal.seed.id, dayOffset) - 0.5) * 0.08;
      const dip = dayOffset < 6 ? -0.08 : 0;

      return {
        date: date.toISOString().slice(0, 10),
        buy_price_gbp: money(baseBuy * (1 + seasonal + noise + dip)),
        sell_price_gbp: money(
          baseSell * (1 + seasonal * 0.5 + noise * 0.4),
        ),
      };
    });
  }

  private toApprovalItem(approval: ApprovalState) {
    const deal = this.deals.get(approval.dealId);
    const margin = computeMargin(approval.pricing);

    return {
      approval_id: approval.id,
      deal_id: approval.dealId,
      sku_title: deal?.seed.title ?? "Unknown SKU",
      buy_retailer: deal?.seed.retailer ?? "Unknown",
      sell_channel: approval.sellChannel,
      sell_channel_label: CHANNEL_LABELS[approval.sellChannel],
      quantity: approval.quantity,
      buy_price_gbp: money(approval.pricing.buyPriceGbp * approval.quantity),
      sell_price_gbp: money(approval.pricing.sellPriceGbp * approval.quantity),
      net_margin_pct: margin.netMarginPct.toFixed(1),
      net_profit_gbp: money(margin.netProfitGbp * approval.quantity),
      status: approval.status,
      queued_at: approval.queuedAt.toISOString(),
      failure_reason: approval.failureReason,
    };
  }

  private toCatalogueSku(deal: DealState): CatalogueSku {
    const margin = computeMargin(deal.pricing);

    return {
      id: deal.seed.skuId,
      title: deal.seed.title,
      brand: deal.seed.brand,
      category: deal.seed.category,
      image_url: null,
      composite_score:
        deal.seed.scoreConfidence === "insufficient"
          ? null
          : deal.seed.compositeScore,
      score_confidence: deal.seed.scoreConfidence,
      high_opportunity: deal.seed.highOpportunity,
      is_stale: deal.seed.isStale,
      deal_event_count_90d: deal.seed.dealEventCount90d,
      cheapest_source: {
        retailer: deal.seed.retailer,
        price_gbp: money(deal.pricing.buyPriceGbp),
      },
      avg_net_margin_pct: margin.netMarginPct.toFixed(1),
      watched: this.watchedSkus.has(deal.seed.skuId),
      live_deal_id: deal.dismissed ? null : deal.seed.id,
    };
  }

  private categoryRankings(): { category: string; avg_score: number }[] {
    const byCategory = new Map<string, number[]>();
    for (const deal of this.deals.values()) {
      if (deal.seed.compositeScore === null) {
        continue;
      }

      const scores = byCategory.get(deal.seed.category) ?? [];
      scores.push(deal.seed.compositeScore);
      byCategory.set(deal.seed.category, scores);
    }

    return [...byCategory.entries()]
      .map(([category, scores]) => ({
        category,
        avg_score: Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        ),
      }))
      .sort((a, b) => b.avg_score - a.avg_score);
  }

  private toWebhook(webhook: WebhookState): WebhookEndpoint {
    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      status: webhook.status,
      last_delivery_at: webhook.lastDeliveryAt?.toISOString() ?? null,
    };
  }

  private toDealRecord(record: HistoryState): DealRecord {
    return {
      id: record.id,
      sku_title: record.skuTitle,
      buy_retailer: record.buyRetailer,
      sell_channel: record.channel,
      sell_channel_label: CHANNEL_LABELS[record.channel],
      buy_price_gbp: money(record.buyPriceGbp),
      sell_price_gbp:
        record.sellPriceGbp === null ? null : money(record.sellPriceGbp),
      net_profit_gbp:
        record.netProfitGbp === null ? null : money(record.netProfitGbp),
      net_margin_pct:
        record.netMarginPct === null ? null : record.netMarginPct.toFixed(1),
      status: record.status,
      closed_at: record.closedAt.toISOString(),
    };
  }
}
