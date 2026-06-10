import { describe, expect, it } from "vitest";
import { DEMO_USER, TIER_DEMO_USERS } from "./fixtures";
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

async function loginAs(store: MockStore, email: string): Promise<string> {
  const login = await store.login(email, DEMO_USER.password);
  return login.user.user_id;
}

describe("scan jobs (PRD §5.1/§5.2, TDD §5.8.2)", () => {
  it("lists seeded jobs with plan cadence", async () => {
    const harness = createStore();
    const userId = await loginAs(harness.store, DEMO_USER.email);

    const result = await harness.store.listScanJobs(userId);
    expect(result.jobs.length).toBe(4);
    expect(result.job_limit).toBeNull(); // Business: unlimited
    for (const job of result.jobs) {
      expect(job.cadence_minutes).toBe(15); // Business cadence
    }
  });

  it("creates, pauses, resumes, and deletes a job", async () => {
    const harness = createStore();
    const userId = await loginAs(harness.store, DEMO_USER.email);

    const job = await harness.store.createScanJob(userId, {
      retailer: "Walmart",
      category: "Gaming",
      keywords: ["switch"],
      min_margin_pct: 25,
    });
    expect(job.status).toBe("active");
    expect(job.last_run_at).not.toBeNull(); // first run dispatched immediately

    await harness.store.pauseScanJob(userId, job.id);
    let listed = await harness.store.listScanJobs(userId);
    expect(listed.jobs.find((j) => j.id === job.id)?.status).toBe("paused");

    await harness.store.resumeScanJob(userId, job.id);
    listed = await harness.store.listScanJobs(userId);
    expect(listed.jobs.find((j) => j.id === job.id)?.status).toBe("active");

    await harness.store.deleteScanJob(userId, job.id);
    listed = await harness.store.listScanJobs(userId);
    expect(listed.jobs.find((j) => j.id === job.id)).toBeUndefined();
  });

  it("enforces the Starter plan limit with 402 and marks oldest excess over_limit", async () => {
    const harness = createStore();
    const starter = TIER_DEMO_USERS.find((user) => user.plan === "starter")!;
    const userId = await loginAs(harness.store, starter.email);

    // Starter seeds: 3 active + 1 paused → at the limit of 3 already.
    await expect(
      harness.store.createScanJob(userId, {
        retailer: "Tesco",
        category: "Sports",
        keywords: [],
        min_margin_pct: 20,
      }),
    ).rejects.toMatchObject({ problem: { status: 402 } });

    // Resuming the paused job pushes the count to 4 → oldest goes over_limit.
    const listed = await harness.store.listScanJobs(userId);
    const paused = listed.jobs.find((job) => job.status === "paused")!;
    await harness.store.resumeScanJob(userId, paused.id);

    const after = await harness.store.listScanJobs(userId);
    const oldest = [...after.jobs].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )[0];
    expect(oldest.status).toBe("over_limit");
    expect(after.jobs[0].cadence_minutes).toBe(360); // Starter cadence
  });

  it("suspends jobs while the retailer circuit is open and resumes after", async () => {
    const harness = createStore();
    const userId = await loginAs(harness.store, DEMO_USER.email);

    harness.store.demoSetCircuit("Tesco", true);
    let listed = await harness.store.listScanJobs(userId);
    const tescoJobs = listed.jobs.filter((job) => job.retailer === "Tesco");
    expect(tescoJobs.length).toBeGreaterThan(0);
    for (const job of tescoJobs) {
      expect(job.status).toBe("suspended");
    }

    harness.store.demoSetCircuit("Tesco", false);
    listed = await harness.store.listScanJobs(userId);
    for (const job of listed.jobs.filter((job) => job.retailer === "Tesco")) {
      expect(job.status).toBe("active");
    }
  });
});

describe("plan gating (PRD §8)", () => {
  it("blocks Starter approvals with 402 even after MFA", async () => {
    const harness = createStore();
    const starter = TIER_DEMO_USERS.find((user) => user.plan === "starter")!;
    const login = await harness.store.login(starter.email, starter.password);
    await harness.store.verifyMfa(login.user.user_id, DEMO_USER.mfaCode);

    const created = await harness.store.createApproval(login.user.user_id, {
      deal_id: "deal-0004",
      quantity: 1,
      sell_channel: "ebay",
    });

    await expect(
      harness.store.approve(login.user.user_id, created.approval_id),
    ).rejects.toMatchObject({ problem: { status: 402 } });
  });

  it("gives Starter no API settings, Pro read-only without webhooks", async () => {
    const harness = createStore();
    const starter = TIER_DEMO_USERS.find((user) => user.plan === "starter")!;
    const pro = TIER_DEMO_USERS.find((user) => user.plan === "pro")!;

    const starterId = await loginAs(harness.store, starter.email);
    await expect(
      harness.store.getApiSettings(starterId),
    ).rejects.toMatchObject({ problem: { status: 402 } });

    const proId = await loginAs(harness.store, pro.email);
    const settings = await harness.store.getApiSettings(proId);
    expect(settings.api_access).toBe("read");
    expect(settings.webhooks).toHaveLength(0);
    expect(settings.deliveries).toHaveLength(0);
  });

  it("switches plans via the demo control", async () => {
    const harness = createStore();
    const userId = await loginAs(harness.store, DEMO_USER.email);

    const user = harness.store.demoSetPlan(userId, "starter");
    expect(user.plan).toBe("starter");

    const jobs = await harness.store.listScanJobs(userId);
    expect(jobs.job_limit).toBe(3);
    expect(jobs.jobs[0].cadence_minutes).toBe(360);
  });
});
