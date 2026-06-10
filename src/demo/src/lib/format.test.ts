import { describe, expect, it } from "vitest";
import {
  gbp,
  gbpWhole,
  marginTone,
  pct,
  staleness,
  timeAgo,
} from "./format";

describe("gbp", () => {
  it("formats a money string with thousands separators", () => {
    expect(gbp("1240.5")).toBe("£1,240.50");
  });

  it("returns an em dash for null, undefined, and non-numeric input", () => {
    expect(gbp(null)).toBe("—");
    expect(gbp(undefined)).toBe("—");
    expect(gbp("not-a-number")).toBe("—");
  });
});

describe("gbpWhole", () => {
  it("rounds to whole pounds", () => {
    expect(gbpWhole("4820.00")).toBe("£4,820");
  });
});

describe("pct", () => {
  it("formats with one decimal place", () => {
    expect(pct("30.94")).toBe("30.9%");
  });

  it("returns an em dash for null", () => {
    expect(pct(null)).toBe("—");
  });
});

describe("marginTone", () => {
  it("is positive at or above the 20% threshold", () => {
    expect(marginTone("20.0")).toBe("positive");
    expect(marginTone("34.2")).toBe("positive");
  });

  it("is caution below 20%", () => {
    expect(marginTone("19.4")).toBe("caution");
  });
});

describe("staleness", () => {
  const now = new Date("2026-06-09T12:00:00Z");

  it("is fresh under 15 minutes", () => {
    expect(staleness("2026-06-09T11:50:00Z", now)).toBe("fresh");
  });

  it("is drifting between 15 and 45 minutes", () => {
    expect(staleness("2026-06-09T11:42:00Z", now)).toBe("drifting");
  });

  it("is stale beyond 45 minutes", () => {
    expect(staleness("2026-06-09T11:13:00Z", now)).toBe("stale");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-06-09T12:00:00Z");

  it("renders seconds, minutes, and hours", () => {
    expect(timeAgo("2026-06-09T11:59:30Z", now)).toBe("30 sec ago");
    expect(timeAgo("2026-06-09T11:58:00Z", now)).toBe("2 min ago");
    expect(timeAgo("2026-06-09T09:00:00Z", now)).toBe("3 hours ago");
  });

  it("falls back to a date beyond 24 hours", () => {
    expect(timeAgo("2026-05-12T12:00:00Z", now)).toContain("May 2026");
  });
});
