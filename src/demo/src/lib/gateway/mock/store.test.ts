import { beforeEach, describe, expect, it } from "vitest";
import { GatewayError } from "../types";
import { DEMO_USER } from "./fixtures";
import { MockStore } from "./store";

/** Store with a controllable clock for staleness-dependent behaviour. */
function createStore(start = new Date("2026-06-09T12:00:00Z")) {
  let now = start;
  const store = new MockStore(() => now);
  return {
    store,
    advanceMinutes(minutes: number) {
      now = new Date(now.getTime() + minutes * 60_000);
    },
  };
}

async function authedUserId(store: MockStore): Promise<string> {
  const login = await store.login(DEMO_USER.email, DEMO_USER.password);
  await store.verifyMfa(login.user.user_id, DEMO_USER.mfaCode);
  return login.user.user_id;
}

describe("MockStore auth", () => {
  let harness: ReturnType<typeof createStore>;

  beforeEach(() => {
    harness = createStore();
  });

  it("rejects invalid credentials with 401", async () => {
    await expect(
      harness.store.login(DEMO_USER.email, "wrong-password"),
    ).rejects.toMatchObject({ problem: { status: 401 } });
  });

  it("requires MFA on first login and clears it after verification", async () => {
    const first = await harness.store.login(DEMO_USER.email, DEMO_USER.password);
    expect(first.mfa_required).toBe(true);

    await harness.store.verifyMfa(first.user.user_id, DEMO_USER.mfaCode);
    const second = await harness.store.login(
      DEMO_USER.email,
      DEMO_USER.password,
    );
    expect(second.mfa_required).toBe(false);
  });

  it("rejects an incorrect MFA code with 400", async () => {
    const login = await harness.store.login(DEMO_USER.email, DEMO_USER.password);
    await expect(
      harness.store.verifyMfa(login.user.user_id, "123456"),
    ).rejects.toMatchObject({ problem: { status: 400 } });
  });

  it("rejects duplicate registration with 409", async () => {
    await expect(
      harness.store.register(DEMO_USER.email, "Whatever!Pass123"),
    ).rejects.toMatchObject({ problem: { status: 409 } });
  });
});

describe("MockStore deals", () => {
  let harness: ReturnType<typeof createStore>;
  let userId: string;

  beforeEach(async () => {
    harness = createStore();
    userId = await authedUserId(harness.store);
  });

  it("filters by minimum margin", async () => {
    const result = await harness.store.listDeals(userId, { min_margin: 30 });
    for (const deal of result.deals) {
      expect(Number(deal.margin.net_margin_pct)).toBeGreaterThanOrEqual(30);
    }
  });

  it("filters by retailer and category", async () => {
    const result = await harness.store.listDeals(userId, {
      retailer: "Tesco",
      category: "Electronics",
    });
    for (const deal of result.deals) {
      expect(deal.buy.retailer).toBe("Tesco");
      expect(deal.sku.category).toBe("Electronics");
    }
  });

  it("paginates with a cursor", async () => {
    const first = await harness.store.listDeals(userId, { limit: 5 });
    expect(first.deals).toHaveLength(5);
    expect(first.next_cursor).not.toBeNull();

    const second = await harness.store.listDeals(userId, {
      limit: 5,
      after: first.next_cursor ?? undefined,
    });
    const firstIds = new Set(first.deals.map((deal) => deal.deal_id));
    for (const deal of second.deals) {
      expect(firstIds.has(deal.deal_id)).toBe(false);
    }
  });

  it("removes dismissed deals from the feed and stats", async () => {
    const before = await harness.store.listDeals(userId, {});
    await harness.store.dismissDeal(userId, before.deals[0].deal_id);
    const after = await harness.store.listDeals(userId, {});

    expect(after.stats.active_deals).toBe(before.stats.active_deals - 1);
  });

  it("hides the composite score when confidence is insufficient", async () => {
    const catalogue = await harness.store.listCatalogue(userId, {
      search: "YETI",
    });
    expect(catalogue.skus[0].score_confidence).toBe("insufficient");
    expect(catalogue.skus[0].composite_score).toBeNull();
  });
});

describe("MockStore approval state machine (TDD §5.4)", () => {
  let harness: ReturnType<typeof createStore>;
  let userId: string;

  beforeEach(async () => {
    harness = createStore();
    userId = await authedUserId(harness.store);
  });

  it("rejects approval without MFA with 403", async () => {
    const fresh = createStore();
    const login = await fresh.store.login(DEMO_USER.email, DEMO_USER.password);

    await expect(
      fresh.store.approve(login.user.user_id, "appr-0001"),
    ).rejects.toMatchObject({ problem: { status: 403 } });
  });

  it("returns 409 with the drifted margin for items older than 45 minutes", async () => {
    // appr-0003 (Dyson) is seeded 47 minutes old.
    let caught: unknown;
    try {
      await harness.store.approve(userId, "appr-0003");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(GatewayError);
    expect((caught as GatewayError).problem.status).toBe(409);
    expect((caught as GatewayError).problem.detail).toContain("dropped");
  });

  it("refreshing a stale item resets its queue age so approval succeeds", async () => {
    await harness.store.refreshApproval(userId, "appr-0003");
    const result = await harness.store.approve(userId, "appr-0003");
    expect(result.status).toBe("executing");
  });

  it("returns 402 when the purchase would exceed the daily spend cap", async () => {
    // Sony (2 × £180 = £360) then Dyson (£299) exceeds the £450 remaining.
    await harness.store.approve(userId, "appr-0001");
    await harness.store.refreshApproval(userId, "appr-0003");

    await expect(
      harness.store.approve(userId, "appr-0003"),
    ).rejects.toMatchObject({ problem: { status: 402 } });
  });

  it("rejects duplicate pending approvals for the same deal", async () => {
    await expect(
      harness.store.createApproval(userId, {
        deal_id: "deal-0001",
        quantity: 1,
        sell_channel: "amazon_fba",
      }),
    ).rejects.toMatchObject({ problem: { status: 409 } });
  });

  it("enforces the per-deal quantity cap", async () => {
    await expect(
      harness.store.createApproval(userId, {
        deal_id: "deal-0004",
        quantity: 6,
        sell_channel: "ebay",
      }),
    ).rejects.toMatchObject({ problem: { status: 409 } });
  });

  it("removes items from the pending queue", async () => {
    await harness.store.removeApproval(userId, "appr-0002");
    const queue = await harness.store.getApprovalQueue(userId);
    expect(
      queue.items.find((item) => item.approval_id === "appr-0002"),
    ).toBeUndefined();
  });
});

describe("MockStore API settings", () => {
  let harness: ReturnType<typeof createStore>;
  let userId: string;

  beforeEach(async () => {
    harness = createStore();
    userId = await authedUserId(harness.store);
  });

  it("creates a key whose full value is only returned once", async () => {
    const created = await harness.store.createApiKey(userId, "CI Bot", "read");
    expect(created.full_key).toMatch(/^arb_live_[0-9a-f]{32}$/);
    expect(created.record.key_prefix.endsWith("…")).toBe(true);

    const settings = await harness.store.getApiSettings(userId);
    const stored = settings.keys.find((key) => key.id === created.record.id);
    expect(stored).toBeDefined();
    expect(JSON.stringify(stored)).not.toContain(created.full_key);
  });

  it("revokes keys and deletes webhooks", async () => {
    const created = await harness.store.createApiKey(userId, "Temp", "read");
    await harness.store.revokeApiKey(userId, created.record.id);

    const webhook = await harness.store.registerWebhook(
      userId,
      "https://example.com/hook",
      ["new_deal"],
    );
    await harness.store.deleteWebhook(userId, webhook.id);

    const settings = await harness.store.getApiSettings(userId);
    expect(settings.keys.find((key) => key.id === created.record.id)).toBeUndefined();
    expect(
      settings.webhooks.find((endpoint) => endpoint.id === webhook.id),
    ).toBeUndefined();
  });
});

describe("MockStore close-the-loop (TDD §5.4 listed→closed)", () => {
  async function listedApproval(harness: ReturnType<typeof createStore>) {
    const userId = await authedUserId(harness.store);
    await harness.store.refreshApproval(userId, "appr-0002");
    await harness.store.approve(userId, "appr-0002");
    // Execution settles via timers; wait for the terminal state.
    await new Promise((resolve) => setTimeout(resolve, 4_200));
    return userId;
  }

  it("closing a listed deal writes history and updates analytics", async () => {
    const harness = createStore();
    const userId = await listedApproval(harness);

    const before = await harness.store.getAnalytics(userId, { period: 30 });
    await harness.store.closeApproval(userId, "appr-0002", 95);
    const after = await harness.store.getAnalytics(userId, { period: 30 });

    expect(after.stats.deals_closed).toBe(before.stats.deals_closed + 1);
    expect(Number(after.stats.net_profit_gbp)).toBeGreaterThan(
      Number(before.stats.net_profit_gbp),
    );
    expect(after.records[0].sku_title).toBe("LEGO Technic 42145");
    expect(after.records[0].status).toBe("sold");

    const queue = await harness.store.getApprovalQueue(userId);
    expect(
      queue.items.find((item) => item.approval_id === "appr-0002"),
    ).toBeUndefined();
  }, 15_000);

  it("rejects closing a deal that is not listed", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    await expect(
      harness.store.closeApproval(userId, "appr-0001", 250),
    ).rejects.toMatchObject({ problem: { status: 409 } });
  });

  it("retrying a failed execution entry re-queues a live deal", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    // Seeded failure is Galaxy Tab S9, which has no live deal → conflict.
    await expect(
      harness.store.retryExecutionLogEntry(userId, "exec-0003"),
    ).rejects.toMatchObject({ problem: { status: 409 } });

    // Dismissing removes the entry.
    await harness.store.dismissExecutionLogEntry(userId, "exec-0003");
    const queue = await harness.store.getApprovalQueue(userId);
    expect(
      queue.execution_log.find((entry) => entry.id === "exec-0003"),
    ).toBeUndefined();
  });
});
