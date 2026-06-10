import { describe, expect, it } from "vitest";
import { DEMO_USER } from "./fixtures";
import { MockStore } from "./store";

function createStore(start = new Date("2026-06-10T09:00:00Z")) {
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

describe("user settings (TDD §5.9.5)", () => {
  it("returns profile, channels, and notification prefs", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    const settings = await harness.store.getUserSettings(userId);
    expect(settings.email).toBe(DEMO_USER.email);
    expect(settings.plan).toBe("business");
    expect(settings.channels).toHaveLength(6);
    expect(
      settings.channels.find((c) => c.channel === "gumtree")?.status,
    ).toBe("expired");
    expect(settings.notifications.email_alerts).toBe(true);
  });

  it("updates VAT registration and margin threshold, reflected in the session", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    const updated = await harness.store.updateProfile(userId, {
      vat_registered: false,
      min_margin_pct: 25,
    });
    expect(updated.vat_registered).toBe(false);
    expect(updated.min_margin_pct).toBe("25.0");

    const session = await harness.store.getSessionUser(userId);
    expect(session.vat_registered).toBe(false);
    expect(session.min_margin_pct).toBe("25.0");

    await expect(
      harness.store.updateProfile(userId, { min_margin_pct: 120 }),
    ).rejects.toMatchObject({ problem: { status: 409 } });
  });

  it("updates daily spend cap and quantity cap, reflected in settings and queue", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    const updated = await harness.store.updateProfile(userId, {
      daily_spend_cap_gbp: 1_000,
      quantity_cap_per_deal: 10,
    });
    expect(updated.daily_spend_cap_gbp).toBe("1000.00");
    expect(updated.quantity_cap_per_deal).toBe(10);

    const queue = await harness.store.getApprovalQueue(userId);
    expect(queue.caps.daily_spend_cap_gbp).toBe("1000.00");
    expect(queue.caps.quantity_cap_per_deal).toBe(10);

    // 0 means unlimited — allowed.
    const unlimited = await harness.store.updateProfile(userId, { daily_spend_cap_gbp: 0, quantity_cap_per_deal: 0 });
    expect(unlimited.daily_spend_cap_gbp).toBe("0.00");
    expect(unlimited.quantity_cap_per_deal).toBe(0);

    await expect(
      harness.store.updateProfile(userId, { daily_spend_cap_gbp: -1 }),
    ).rejects.toMatchObject({ problem: { status: 409 } });
    await expect(
      harness.store.updateProfile(userId, { quantity_cap_per_deal: -1 }),
    ).rejects.toMatchObject({ problem: { status: 409 } });
  });

  it("uses the configured quantity cap when enforcing createApproval", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    await harness.store.updateProfile(userId, {
      quantity_cap_per_deal: 3,
    });

    await expect(
      harness.store.createApproval(userId, {
        deal_id: "deal-0004",
        quantity: 4,
        sell_channel: "ebay",
      }),
    ).rejects.toMatchObject({ problem: { status: 409 } });

    const created = await harness.store.createApproval(userId, {
      deal_id: "deal-0004",
      quantity: 3,
      sell_channel: "ebay",
    });
    expect(created.approval_id).toBeDefined();
  });

  it("uses the configured spend cap when enforcing approve", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    await harness.store.updateProfile(userId, {
      daily_spend_cap_gbp: 200,
    });

    // appr-0001 (Sony, 2 × £180 = £360) exceeds the £200 cap.
    await expect(
      harness.store.approve(userId, "appr-0001"),
    ).rejects.toMatchObject({ problem: { status: 402 } });
  });

  it("allows unlimited spend and quantity when caps are set to 0", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    await harness.store.updateProfile(userId, {
      daily_spend_cap_gbp: 0,
      quantity_cap_per_deal: 0,
    });

    // Quantity above the old cap of 5 is now allowed.
    const created = await harness.store.createApproval(userId, {
      deal_id: "deal-0004",
      quantity: 99,
      sell_channel: "ebay",
    });
    expect(created.approval_id).toBeDefined();

    // Spend above the old cap of £500 is now allowed.
    const result = await harness.store.approve(userId, "appr-0001");
    expect(result.status).toBe("executing");
  });

  it("walks the OAuth channel lifecycle: expired → connected → disconnected", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    const connected = await harness.store.connectChannel(userId, "gumtree");
    expect(connected.status).toBe("connected");

    await harness.store.disconnectChannel(userId, "gumtree");
    const settings = await harness.store.getUserSettings(userId);
    expect(
      settings.channels.find((c) => c.channel === "gumtree")?.status,
    ).toBe("disconnected");
  });

  it("blocks approval when the sell channel token is not connected", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    // Queue a deal against the expired Gumtree connection.
    const created = await harness.store.createApproval(userId, {
      deal_id: "deal-0011",
      quantity: 1,
      sell_channel: "gumtree",
    });

    await expect(
      harness.store.approve(userId, created.approval_id),
    ).rejects.toMatchObject({ problem: { status: 409 } });

    // Reconnecting clears the path (within the spend cap).
    await harness.store.connectChannel(userId, "gumtree");
    const result = await harness.store.approve(userId, created.approval_id);
    expect(result.status).toBe("executing");
  });

  it("regenerates eight 8-character backup codes", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    const { codes } = await harness.store.regenerateBackupCodes(userId);
    expect(codes).toHaveLength(8);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9a-f]{8}$/);
    }
  });

  it("exports user data and deletes the account (GDPR, TDD §8.6)", async () => {
    const harness = createStore();
    const userId = await authedUserId(harness.store);

    const exported = JSON.parse(await harness.store.exportUserData(userId));
    expect(exported.profile.email).toBe(DEMO_USER.email);
    expect(exported.scan_jobs.length).toBeGreaterThan(0);
    expect(exported.deal_history.length).toBeGreaterThan(0);

    await harness.store.deleteAccount(userId);
    await expect(
      harness.store.login(DEMO_USER.email, DEMO_USER.password),
    ).rejects.toMatchObject({ problem: { status: 401 } });
    await expect(harness.store.listScanJobs(userId)).rejects.toMatchObject({
      problem: { status: 404 },
    });
  });
});
