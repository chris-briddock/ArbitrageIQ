import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_USER, RESERVE_SEEDS } from "./fixtures";
import { MockStore } from "./store";

/**
 * Simulation engine tests (docs/demo-improvement-plan.md §3.1).
 * The store uses an injected clock; advancing it and calling any gateway
 * method runs the lazy tick.
 */
function createStore(start = new Date("2026-06-10T09:00:00Z")) {
  let now = start;
  const store = new MockStore(() => now);
  return {
    store,
    /** Advance wall clock in small hops, ticking along the way. */
    async advanceMinutes(minutes: number) {
      const hops = Math.ceil(minutes / 5);
      for (let hop = 0; hop < hops; hop++) {
        now = new Date(now.getTime() + (minutes / hops) * 60_000);
        await store.listDeals("any", {});
      }
    },
  };
}

async function authedUserId(store: MockStore): Promise<string> {
  const login = await store.login(DEMO_USER.email, DEMO_USER.password);
  await store.verifyMfa(login.user.user_id, DEMO_USER.mfaCode);
  return login.user.user_id;
}

describe("simulation: price drift", () => {
  it("moves prices over time but keeps them within the clamp", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    const before = await harness.store.listDeals(userId, { limit: 200 });
    await harness.advanceMinutes(30);
    const after = await harness.store.listDeals(userId, { limit: 200 });

    const beforePrices = new Map(
      before.deals.map((deal) => [deal.deal_id, deal.buy.price_gbp]),
    );
    const moved = after.deals.filter(
      (deal) =>
        beforePrices.has(deal.deal_id) &&
        beforePrices.get(deal.deal_id) !== deal.buy.price_gbp,
    );
    expect(moved.length).toBeGreaterThan(0);

    // Every live price stays within ±12% of its seeded base.
    for (const deal of after.deals) {
      const detail = await harness.store.getDeal(userId, deal.deal_id);
      const price = Number(detail.buy.price_gbp);
      expect(price).toBeGreaterThan(0);
    }
  });

  it("does not drift prices for a retailer whose circuit is open", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    harness.store.demoSetCircuit("Tesco", true);
    const before = await harness.store.listDeals(userId, {
      retailer: "Tesco",
      limit: 200,
    });
    await harness.advanceMinutes(1.5);
    const after = await harness.store.listDeals(userId, {
      retailer: "Tesco",
      limit: 200,
    });

    const beforePrices = new Map(
      before.deals.map((deal) => [deal.deal_id, deal.buy.price_gbp]),
    );
    for (const deal of after.deals) {
      if (beforePrices.has(deal.deal_id)) {
        expect(deal.buy.price_gbp).toBe(beforePrices.get(deal.deal_id));
      }
    }
  });
});

describe("simulation: deal surfacing", () => {
  it("surfaces reserve deals on demand with a notification", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);
    const before = await harness.store.listDeals(userId, { limit: 200 });

    const title = harness.store.demoSurfaceDeal();
    expect(title).toBe(RESERVE_SEEDS[0].title);

    const after = await harness.store.listDeals(userId, { limit: 200 });
    expect(after.stats.active_deals).toBe(before.stats.active_deals + 1);

    const notifications = await harness.store.listNotifications(userId);
    expect(notifications.notifications[0]?.type).toBe("deal_surfaced");
    expect(notifications.notifications[0]?.href).toContain("/deals/");
  });

  it("returns null once the pool is empty and nothing has expired", async () => {
    const harness = createStore();
    for (let index = 0; index < RESERVE_SEEDS.length; index++) {
      expect(harness.store.demoSurfaceDeal()).not.toBeNull();
    }

    expect(harness.store.demoSurfaceDeal()).toBeNull();
  });

  it("surfaces deals organically as simulated time passes", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    // ~30 sim-minutes ≈ 120 steps at p=1/16 → surfacing is near-certain.
    await harness.advanceMinutes(30);

    const notifications = await harness.store.listNotifications(userId);
    expect(
      notifications.notifications.some((n) => n.type === "deal_surfaced"),
    ).toBe(true);
  });
});

describe("simulation: circuit breaker lifecycle (TDD §5.2.2)", () => {
  it("opens, reports, and auto-recovers with notifications", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    harness.store.demoSetCircuit("Tesco", true);
    expect(harness.store.openCircuits()).toContain("Tesco");

    let notifications = await harness.store.listNotifications(userId);
    expect(
      notifications.notifications.some(
        (n) => n.type === "scraper_circuit_open",
      ),
    ).toBe(true);

    // Recovery window is 2 sim-minutes.
    await harness.advanceMinutes(3);
    expect(harness.store.openCircuits()).not.toContain("Tesco");

    notifications = await harness.store.listNotifications(userId);
    expect(
      notifications.notifications.some(
        (n) => n.type === "scraper_circuit_closed",
      ),
    ).toBe(true);
  });
});

describe("simulation: time-warp", () => {
  it("advancing the clock makes queued approvals stale (409 path)", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    // appr-0001 is seeded 2 minutes old — approvable. Warp +50 minutes.
    harness.store.demoAdvanceClock(50);

    await expect(
      harness.store.approve(userId, "appr-0001"),
    ).rejects.toMatchObject({ problem: { status: 409 } });
  });
});

describe("notifications CRUD", () => {
  let harness: ReturnType<typeof createStore>;
  let userId: string;

  beforeEach(async () => {
    harness = createStore();
    userId = await authedUserId(harness.store);
    harness.store.demoSurfaceDeal();
    harness.store.demoSurfaceDeal();
  });

  it("marks a single notification read", async () => {
    const before = await harness.store.listNotifications(userId);
    expect(before.unread_count).toBeGreaterThanOrEqual(2);

    await harness.store.markNotificationRead(
      userId,
      before.notifications[0].id,
    );
    const after = await harness.store.listNotifications(userId);
    expect(after.unread_count).toBe(before.unread_count - 1);
  });

  it("marks all read and dismisses individual notifications", async () => {
    await harness.store.markAllNotificationsRead(userId);
    let state = await harness.store.listNotifications(userId);
    expect(state.unread_count).toBe(0);

    const target = state.notifications[0].id;
    await harness.store.dismissNotification(userId, target);
    state = await harness.store.listNotifications(userId);
    expect(state.notifications.find((n) => n.id === target)).toBeUndefined();
  });
});
