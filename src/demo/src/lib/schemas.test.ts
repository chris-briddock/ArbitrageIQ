import { describe, expect, it } from "vitest";
import { registerRequestSchema, sellChannelSchema } from "./schemas";

describe("registerRequestSchema (password policy, TDD §7.3.1)", () => {
  const base = {
    email: "trader@example.com",
    password: "Str0ng!Passw0rd",
    confirm_password: "Str0ng!Passw0rd",
  };

  it("accepts a compliant password", () => {
    expect(registerRequestSchema.safeParse(base).success).toBe(true);
  });

  it.each([
    ["too short", "Sh0rt!pass"],
    ["no uppercase", "l0ng!password-here"],
    ["no digit", "Long!password-here"],
    ["no special character", "L0ngpasswordhere1"],
  ])("rejects a password that is %s", (_label, password) => {
    const result = registerRequestSchema.safeParse({
      ...base,
      password,
      confirm_password: password,
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched confirmation", () => {
    const result = registerRequestSchema.safeParse({
      ...base,
      confirm_password: "Different!Passw0rd",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("confirm_password");
  });
});

describe("sellChannelSchema", () => {
  it("accepts all six sell channels from the TDD", () => {
    for (const channel of [
      "amazon_fba",
      "amazon_fbm",
      "ebay",
      "shopify",
      "facebook",
      "gumtree",
    ]) {
      expect(sellChannelSchema.safeParse(channel).success).toBe(true);
    }
  });

  it("rejects unknown channels", () => {
    expect(sellChannelSchema.safeParse("etsy").success).toBe(false);
  });
});
