import { describe, expect, it } from "vitest";
import { computeMargin, money, toMarginPayload } from "./margin";

describe("computeMargin (TDD §5.3.1 formula)", () => {
  it("reproduces the worked Sony WH-1000XM5 example from the TDD", () => {
    // Sell £249.99, buy £180, referral 7%, fulfilment £5.28 + £0.08 fuel,
    // VAT reclaim −£30 → net £77.13 at 30.9% margin.
    const result = computeMargin({
      buyPriceGbp: 180,
      deliveryGbp: 0,
      sellPriceGbp: 249.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 5.28,
      fuelSurchargeGbp: 0.08,
      vatAdjustmentGbp: -30,
    });

    expect(result.netProfitGbp).toBeCloseTo(77.13, 2);
    expect(result.netMarginPct).toBeCloseTo(30.9, 1);
    expect(result.referralFeeGbp).toBeCloseTo(17.5, 2);
  });

  it("subtracts buy-side delivery from profit", () => {
    const withDelivery = computeMargin({
      buyPriceGbp: 100,
      deliveryGbp: 5,
      sellPriceGbp: 150,
      referralRate: 0.1,
      fulfilmentFeeGbp: 2,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    });
    const withoutDelivery = computeMargin({
      buyPriceGbp: 100,
      deliveryGbp: 0,
      sellPriceGbp: 150,
      referralRate: 0.1,
      fulfilmentFeeGbp: 2,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    });

    expect(withoutDelivery.netProfitGbp - withDelivery.netProfitGbp).toBeCloseTo(
      5,
      2,
    );
  });

  it("returns zero margin percent for a zero sell price", () => {
    const result = computeMargin({
      buyPriceGbp: 10,
      deliveryGbp: 0,
      sellPriceGbp: 0,
      referralRate: 0.1,
      fulfilmentFeeGbp: 0,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    });

    expect(result.netMarginPct).toBe(0);
  });
});

describe("money", () => {
  it("serialises to a two-decimal wire string", () => {
    expect(money(77.125)).toBe("77.13");
    expect(money(180)).toBe("180.00");
  });
});

describe("toMarginPayload", () => {
  it("produces the TDD §6.2 wire shape", () => {
    const payload = toMarginPayload(
      computeMargin({
        buyPriceGbp: 180,
        deliveryGbp: 0,
        sellPriceGbp: 249.99,
        referralRate: 0.07,
        fulfilmentFeeGbp: 5.28,
        fuelSurchargeGbp: 0.08,
        vatAdjustmentGbp: -30,
      }),
    );

    expect(payload).toEqual({
      net_profit_gbp: "77.13",
      net_margin_pct: "30.9",
      referral_fee_gbp: "17.50",
      fulfilment_fee_gbp: "5.36",
      vat_adjustment_gbp: "-30.00",
    });
  });
});
