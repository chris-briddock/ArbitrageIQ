import type { Margin } from "@/lib/schemas";

/**
 * Inputs to the net margin formula from TDD §5.3.1. All values in GBP.
 * vatAdjustmentGbp is negative when VAT is reclaimable (it increases profit).
 */
export interface MarginInputs {
  buyPriceGbp: number;
  deliveryGbp: number;
  sellPriceGbp: number;
  referralRate: number;
  fulfilmentFeeGbp: number;
  fuelSurchargeGbp: number;
  vatAdjustmentGbp: number;
}

export interface ComputedMargin {
  netProfitGbp: number;
  netMarginPct: number;
  referralFeeGbp: number;
  fulfilmentFeeGbp: number;
  vatAdjustmentGbp: number;
}

/** Serialises a GBP number to the wire format string, e.g. 77.13 → "77.13". */
export function money(value: number): string {
  return value.toFixed(2);
}

/**
 * Pure margin function mirroring TDD §5.3.1:
 * NetProfit = Sell − Buy − Referral − Fulfilment − ShippingBuy − VatAdjustment.
 */
export function computeMargin(inputs: MarginInputs): ComputedMargin {
  const referralFeeGbp = inputs.sellPriceGbp * inputs.referralRate;
  const netProfitGbp =
    inputs.sellPriceGbp -
    inputs.buyPriceGbp -
    referralFeeGbp -
    inputs.fulfilmentFeeGbp -
    inputs.fuelSurchargeGbp -
    inputs.deliveryGbp -
    inputs.vatAdjustmentGbp;
  const netMarginPct =
    inputs.sellPriceGbp > 0 ? (netProfitGbp / inputs.sellPriceGbp) * 100 : 0;

  return {
    netProfitGbp,
    netMarginPct,
    referralFeeGbp,
    fulfilmentFeeGbp: inputs.fulfilmentFeeGbp + inputs.fuelSurchargeGbp,
    vatAdjustmentGbp: inputs.vatAdjustmentGbp,
  };
}

/** Wire-format margin payload from computed values. */
export function toMarginPayload(computed: ComputedMargin): Margin {
  return {
    net_profit_gbp: money(computed.netProfitGbp),
    net_margin_pct: computed.netMarginPct.toFixed(1),
    referral_fee_gbp: money(computed.referralFeeGbp),
    fulfilment_fee_gbp: money(computed.fulfilmentFeeGbp),
    vat_adjustment_gbp: money(computed.vatAdjustmentGbp),
  };
}
