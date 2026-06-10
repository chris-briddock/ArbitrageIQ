import type { SellChannel } from "@/lib/schemas";
import type { MarginInputs } from "./margin";

/** Display labels per sell channel. */
export const CHANNEL_LABELS: Record<SellChannel, string> = {
  amazon_fba: "Amazon FBA",
  amazon_fbm: "Amazon FBM",
  ebay: "eBay",
  shopify: "Shopify",
  facebook: "Facebook Marketplace",
  gumtree: "Gumtree",
};

export interface DealSeed {
  id: string;
  skuId: string;
  title: string;
  brand: string;
  category: string;
  retailer: string;
  channel: SellChannel;
  pricing: MarginInputs;
  /** Minutes before "now" the deal was surfaced. */
  surfacedMinutesAgo: number;
  compositeScore: number | null;
  scoreConfidence: "high" | "medium" | "low" | "insufficient";
  highOpportunity: boolean;
  isStale: boolean;
  dealEventCount90d: number;
  bsrTrend: string;
  reviewVelocity: string;
  productUrl: string;
}

const seed = (
  id: string,
  title: string,
  brand: string,
  category: string,
  retailer: string,
  channel: SellChannel,
  pricing: MarginInputs,
  surfacedMinutesAgo: number,
  score: {
    composite: number | null;
    confidence: "high" | "medium" | "low" | "insufficient";
    highOpp: boolean;
    stale?: boolean;
    dealCount: number;
    bsr: string;
    reviews: string;
  },
): DealSeed => ({
  id: `deal-${id}`,
  skuId: `sku-${id}`,
  title,
  brand,
  category,
  retailer,
  channel,
  pricing,
  surfacedMinutesAgo,
  compositeScore: score.composite,
  scoreConfidence: score.confidence,
  highOpportunity: score.highOpp,
  isStale: score.stale ?? false,
  dealEventCount90d: score.dealCount,
  bsrTrend: score.bsr,
  reviewVelocity: score.reviews,
  productUrl: `https://www.${retailer.toLowerCase().replace(/\s/g, "")}.com/p/${id}`,
});

/** Twelve live deals — the first six reproduce the products in docs/screens. */
export const DEAL_SEEDS: DealSeed[] = [
  seed(
    "0001",
    "Sony WH-1000XM5",
    "Sony",
    "Electronics",
    "Tesco",
    "amazon_fba",
    {
      buyPriceGbp: 180,
      deliveryGbp: 0,
      sellPriceGbp: 249.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 5.28,
      fuelSurchargeGbp: 0.08,
      vatAdjustmentGbp: -30,
    },
    4,
    { composite: 84.3, confidence: "high", highOpp: true, dealCount: 18, bsr: "Improving", reviews: "High" },
  ),
  seed(
    "0002",
    "LEGO Technic 42145",
    "LEGO",
    "Toys & Games",
    "Walmart",
    "ebay",
    {
      buyPriceGbp: 52,
      deliveryGbp: 0,
      sellPriceGbp: 89.99,
      referralRate: 0.1,
      fulfilmentFeeGbp: 3.99,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    11,
    { composite: 58.1, confidence: "medium", highOpp: false, dealCount: 9, bsr: "Stable", reviews: "Medium" },
  ),
  seed(
    "0003",
    "Ninja Air Fryer 6L",
    "Ninja",
    "Home & Garden",
    "Tesco",
    "shopify",
    {
      buyPriceGbp: 96,
      deliveryGbp: 0,
      sellPriceGbp: 134,
      referralRate: 0.029,
      fulfilmentFeeGbp: 4.5,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    23,
    { composite: 71.4, confidence: "high", highOpp: true, dealCount: 14, bsr: "Improving", reviews: "High" },
  ),
  seed(
    "0004",
    "Apple AirPods Pro 2",
    "Apple",
    "Electronics",
    "Amazon",
    "ebay",
    {
      buyPriceGbp: 176,
      deliveryGbp: 0,
      sellPriceGbp: 259,
      referralRate: 0.129,
      fulfilmentFeeGbp: 2.99,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    36,
    { composite: 52.6, confidence: "medium", highOpp: false, dealCount: 7, bsr: "Stable", reviews: "High" },
  ),
  seed(
    "0005",
    "Dyson V11 Vacuum",
    "Dyson",
    "Home & Garden",
    "AliExpress",
    "amazon_fba",
    {
      buyPriceGbp: 299,
      deliveryGbp: 4.99,
      sellPriceGbp: 449.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 8.4,
      fuelSurchargeGbp: 0.12,
      vatAdjustmentGbp: -20,
    },
    52,
    { composite: 67.8, confidence: "high", highOpp: true, dealCount: 12, bsr: "Improving", reviews: "Medium" },
  ),
  seed(
    "0006",
    "Nintendo Switch OLED",
    "Nintendo",
    "Gaming",
    "Walmart",
    "ebay",
    {
      buyPriceGbp: 210,
      deliveryGbp: 0,
      sellPriceGbp: 309.99,
      referralRate: 0.129,
      fulfilmentFeeGbp: 3.99,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    71,
    { composite: 44.2, confidence: "low", highOpp: false, dealCount: 4, bsr: "Declining", reviews: "Medium" },
  ),
  seed(
    "0007",
    "Bose QuietComfort 45",
    "Bose",
    "Electronics",
    "Amazon",
    "ebay",
    {
      buyPriceGbp: 195,
      deliveryGbp: 0,
      sellPriceGbp: 289,
      referralRate: 0.129,
      fulfilmentFeeGbp: 2.99,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: -12,
    },
    95,
    { composite: 61.5, confidence: "medium", highOpp: false, dealCount: 8, bsr: "Stable", reviews: "Medium" },
  ),
  seed(
    "0008",
    "Instant Pot Duo 7-in-1",
    "Instant Pot",
    "Home & Garden",
    "Tesco",
    "amazon_fba",
    {
      buyPriceGbp: 64,
      deliveryGbp: 0,
      sellPriceGbp: 99.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 4.1,
      fuelSurchargeGbp: 0.05,
      vatAdjustmentGbp: -10,
    },
    118,
    { composite: 56.9, confidence: "medium", highOpp: false, dealCount: 6, bsr: "Stable", reviews: "Low" },
  ),
  seed(
    "0009",
    "Garmin Forerunner 255",
    "Garmin",
    "Sports",
    "Walmart",
    "amazon_fba",
    {
      buyPriceGbp: 219,
      deliveryGbp: 0,
      sellPriceGbp: 309.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 4.2,
      fuelSurchargeGbp: 0.06,
      vatAdjustmentGbp: -25,
    },
    142,
    { composite: 63.7, confidence: "medium", highOpp: false, dealCount: 10, bsr: "Improving", reviews: "Medium" },
  ),
  seed(
    "0010",
    "Oral-B iO Series 9",
    "Oral-B",
    "Health & Beauty",
    "Tesco",
    "amazon_fba",
    {
      buyPriceGbp: 199,
      deliveryGbp: 0,
      sellPriceGbp: 279.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 3.8,
      fuelSurchargeGbp: 0.04,
      vatAdjustmentGbp: -28,
    },
    167,
    { composite: 48.3, confidence: "low", highOpp: false, dealCount: 3, bsr: "Stable", reviews: "Low" },
  ),
  seed(
    "0011",
    "YETI Rambler 26oz",
    "YETI",
    "Sports",
    "Walmart",
    "ebay",
    {
      buyPriceGbp: 22,
      deliveryGbp: 2.5,
      sellPriceGbp: 38,
      referralRate: 0.1,
      fulfilmentFeeGbp: 2.6,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    201,
    { composite: null, confidence: "insufficient", highOpp: false, dealCount: 1, bsr: "Unknown", reviews: "Low" },
  ),
  seed(
    "0012",
    "Philips Hue Starter Kit",
    "Philips",
    "Electronics",
    "AliExpress",
    "shopify",
    {
      buyPriceGbp: 89,
      deliveryGbp: 3.99,
      sellPriceGbp: 139.99,
      referralRate: 0.029,
      fulfilmentFeeGbp: 4.9,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    228,
    { composite: 54.8, confidence: "medium", highOpp: false, stale: true, dealCount: 5, bsr: "Stable", reviews: "Medium" },
  ),
];

/**
 * Reserve pool — products that surface as new deals while the demo runs
 * (TDD §5.8.1 deal_emitted). Drawn one at a time by the simulation tick.
 */
export const RESERVE_SEEDS: DealSeed[] = [
  seed(
    "0101",
    "KitchenAid Artisan Mixer",
    "KitchenAid",
    "Home & Garden",
    "Tesco",
    "amazon_fba",
    {
      buyPriceGbp: 289,
      deliveryGbp: 0,
      sellPriceGbp: 429.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 9.1,
      fuelSurchargeGbp: 0.12,
      vatAdjustmentGbp: -48,
    },
    0,
    { composite: 76.2, confidence: "high", highOpp: true, dealCount: 15, bsr: "Improving", reviews: "High" },
  ),
  seed(
    "0102",
    "DJI Mini 4K Drone",
    "DJI",
    "Electronics",
    "AliExpress",
    "ebay",
    {
      buyPriceGbp: 215,
      deliveryGbp: 5.99,
      sellPriceGbp: 319,
      referralRate: 0.129,
      fulfilmentFeeGbp: 3.49,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    0,
    { composite: 69.4, confidence: "high", highOpp: true, dealCount: 11, bsr: "Improving", reviews: "High" },
  ),
  seed(
    "0103",
    "LEGO Star Wars X-Wing",
    "LEGO",
    "Toys & Games",
    "Walmart",
    "amazon_fba",
    {
      buyPriceGbp: 38,
      deliveryGbp: 0,
      sellPriceGbp: 64.99,
      referralRate: 0.07,
      fulfilmentFeeGbp: 3.3,
      fuelSurchargeGbp: 0.04,
      vatAdjustmentGbp: -6,
    },
    0,
    { composite: 62.8, confidence: "medium", highOpp: false, dealCount: 8, bsr: "Stable", reviews: "Medium" },
  ),
  seed(
    "0104",
    "Shark Steam Mop S6002",
    "Shark",
    "Home & Garden",
    "Tesco",
    "shopify",
    {
      buyPriceGbp: 69,
      deliveryGbp: 0,
      sellPriceGbp: 109,
      referralRate: 0.029,
      fulfilmentFeeGbp: 4.2,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    0,
    { composite: 57.5, confidence: "medium", highOpp: false, dealCount: 6, bsr: "Stable", reviews: "Medium" },
  ),
  seed(
    "0105",
    "Fitbit Charge 6",
    "Fitbit",
    "Health & Beauty",
    "Amazon",
    "ebay",
    {
      buyPriceGbp: 95,
      deliveryGbp: 0,
      sellPriceGbp: 144.99,
      referralRate: 0.129,
      fulfilmentFeeGbp: 2.49,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    0,
    { composite: 54.1, confidence: "medium", highOpp: false, dealCount: 5, bsr: "Stable", reviews: "Medium" },
  ),
  seed(
    "0106",
    "Sonos Roam 2",
    "Sonos",
    "Electronics",
    "Walmart",
    "amazon_fba",
    {
      buyPriceGbp: 119,
      deliveryGbp: 0,
      sellPriceGbp: 179,
      referralRate: 0.07,
      fulfilmentFeeGbp: 3.9,
      fuelSurchargeGbp: 0.05,
      vatAdjustmentGbp: -19,
    },
    0,
    { composite: 66.3, confidence: "high", highOpp: false, dealCount: 9, bsr: "Improving", reviews: "Medium" },
  ),
  seed(
    "0107",
    "Le Creuset Casserole 24cm",
    "Le Creuset",
    "Home & Garden",
    "Tesco",
    "ebay",
    {
      buyPriceGbp: 159,
      deliveryGbp: 0,
      sellPriceGbp: 239,
      referralRate: 0.1,
      fulfilmentFeeGbp: 5.6,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: -26,
    },
    0,
    { composite: 71.9, confidence: "high", highOpp: true, dealCount: 13, bsr: "Improving", reviews: "High" },
  ),
  seed(
    "0108",
    "Xbox Wireless Controller",
    "Microsoft",
    "Gaming",
    "Walmart",
    "ebay",
    {
      buyPriceGbp: 34,
      deliveryGbp: 0,
      sellPriceGbp: 54.99,
      referralRate: 0.129,
      fulfilmentFeeGbp: 2.2,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    0,
    { composite: 48.7, confidence: "low", highOpp: false, dealCount: 4, bsr: "Stable", reviews: "Low" },
  ),
  seed(
    "0109",
    "Theragun Mini Massager",
    "Therabody",
    "Health & Beauty",
    "Amazon",
    "amazon_fba",
    {
      buyPriceGbp: 129,
      deliveryGbp: 0,
      sellPriceGbp: 189,
      referralRate: 0.07,
      fulfilmentFeeGbp: 3.4,
      fuelSurchargeGbp: 0.04,
      vatAdjustmentGbp: -21,
    },
    0,
    { composite: 59.6, confidence: "medium", highOpp: false, dealCount: 7, bsr: "Stable", reviews: "Medium" },
  ),
  seed(
    "0110",
    "Weber Compact Kettle BBQ",
    "Weber",
    "Sports",
    "Walmart",
    "shopify",
    {
      buyPriceGbp: 79,
      deliveryGbp: 4.99,
      sellPriceGbp: 129,
      referralRate: 0.029,
      fulfilmentFeeGbp: 6.8,
      fuelSurchargeGbp: 0,
      vatAdjustmentGbp: 0,
    },
    0,
    { composite: 53.2, confidence: "medium", highOpp: false, dealCount: 5, bsr: "Stable", reviews: "Low" },
  ),
];

export interface ApprovalSeed {
  id: string;
  dealId: string;
  quantity: number;
  queuedMinutesAgo: number;
}

/** Three queued approvals matching the Approval Queue screen. */
export const APPROVAL_SEEDS: ApprovalSeed[] = [
  { id: "appr-0001", dealId: "deal-0001", quantity: 2, queuedMinutesAgo: 2 },
  { id: "appr-0002", dealId: "deal-0002", quantity: 1, queuedMinutesAgo: 18 },
  { id: "appr-0003", dealId: "deal-0005", quantity: 1, queuedMinutesAgo: 47 },
];

export interface ExecutionLogSeed {
  id: string;
  skuTitle: string;
  outcome: "purchased_listed" | "failed";
  detail: string;
  minutesAgo: number;
}

export const EXECUTION_LOG_SEEDS: ExecutionLogSeed[] = [
  {
    id: "exec-0001",
    skuTitle: "Ninja Air Fryer 6L",
    outcome: "purchased_listed",
    detail: "Purchased £89 (Tesco) → Listed on Amazon FBA",
    minutesAgo: 38,
  },
  {
    id: "exec-0002",
    skuTitle: "Apple AirPods Pro 2",
    outcome: "purchased_listed",
    detail: "Purchased £189 (Amazon) → Listed on eBay",
    minutesAgo: 129,
  },
  {
    id: "exec-0003",
    skuTitle: "Galaxy Tab S9",
    outcome: "failed",
    detail: "Purchase FAILED: out of stock",
    minutesAgo: 145,
  },
];

export interface HistorySeed {
  id: string;
  skuTitle: string;
  buyRetailer: string;
  channel: SellChannel;
  buyPriceGbp: number;
  sellPriceGbp: number | null;
  netProfitGbp: number | null;
  netMarginPct: number | null;
  status: "sold" | "listed" | "failed";
  daysAgo: number;
}

/** Closed-deal records matching the Analytics screen table. */
export const HISTORY_SEEDS: HistorySeed[] = [
  { id: "hist-0001", skuTitle: "Sony WH-1000XM5", buyRetailer: "Tesco", channel: "amazon_fba", buyPriceGbp: 150, sellPriceGbp: 249, netProfitGbp: 77, netMarginPct: 30.9, status: "sold", daysAgo: 7 },
  { id: "hist-0002", skuTitle: "Ninja Air Fryer 6L", buyRetailer: "Tesco", channel: "shopify", buyPriceGbp: 89, sellPriceGbp: 134, netProfitGbp: 31, netMarginPct: 23.1, status: "sold", daysAgo: 8 },
  { id: "hist-0003", skuTitle: "LEGO Technic 42145", buyRetailer: "Walmart", channel: "ebay", buyPriceGbp: 62, sellPriceGbp: 89, netProfitGbp: 20, netMarginPct: 22.5, status: "listed", daysAgo: 8 },
  { id: "hist-0004", skuTitle: "Dyson V11 Vacuum", buyRetailer: "Tesco", channel: "amazon_fba", buyPriceGbp: 299, sellPriceGbp: 449, netProfitGbp: 94, netMarginPct: 20.9, status: "sold", daysAgo: 9 },
  { id: "hist-0005", skuTitle: "Galaxy Tab S9", buyRetailer: "Walmart", channel: "ebay", buyPriceGbp: 340, sellPriceGbp: null, netProfitGbp: null, netMarginPct: null, status: "failed", daysAgo: 10 },
  { id: "hist-0006", skuTitle: "Bose QuietComfort 45", buyRetailer: "Amazon", channel: "ebay", buyPriceGbp: 195, sellPriceGbp: 289, netProfitGbp: 49, netMarginPct: 17.0, status: "sold", daysAgo: 12 },
  { id: "hist-0007", skuTitle: "Garmin Forerunner 255", buyRetailer: "Walmart", channel: "amazon_fba", buyPriceGbp: 219, sellPriceGbp: 310, netProfitGbp: 61, netMarginPct: 19.7, status: "sold", daysAgo: 15 },
  { id: "hist-0008", skuTitle: "Instant Pot Duo 7-in-1", buyRetailer: "Tesco", channel: "amazon_fba", buyPriceGbp: 64, sellPriceGbp: 99, netProfitGbp: 21, netMarginPct: 21.2, status: "sold", daysAgo: 18 },
  { id: "hist-0009", skuTitle: "Philips Hue Starter Kit", buyRetailer: "AliExpress", channel: "shopify", buyPriceGbp: 89, sellPriceGbp: 139, netProfitGbp: 38, netMarginPct: 27.3, status: "sold", daysAgo: 21 },
  { id: "hist-0010", skuTitle: "YETI Rambler 26oz", buyRetailer: "Walmart", channel: "ebay", buyPriceGbp: 22, sellPriceGbp: 38, netProfitGbp: 9, netMarginPct: 23.7, status: "sold", daysAgo: 24 },
];

export const CHANNEL_PERFORMANCE_SEEDS = [
  { channel_label: "Amazon FBA", profit: 2840, deals: 34, margin: 32.1 },
  { channel_label: "eBay", profit: 1240, deals: 21, margin: 24.8 },
  { channel_label: "Shopify", profit: 740, deals: 12, margin: 21.4 },
];

export const RETAILER_PERFORMANCE_SEEDS = [
  { retailer: "Tesco", profit: 2200, deals: 29, margin: 31.2 },
  { retailer: "Walmart", profit: 1460, deals: 22, margin: 27.8 },
  { retailer: "AliExpress", profit: 760, deals: 12, margin: 22.1 },
];

export const ANALYTICS_STATS_SEED = {
  netProfitGbp: 4820,
  dealsClosed: 67,
  avgRoiPct: 28.4,
  bestMonthGbp: 1240,
};

export interface ApiKeySeed {
  id: string;
  label: string;
  prefix: string;
  createdDaysAgo: number;
  lastUsedMinutesAgo: number | null;
  permissions: "read" | "read_write";
}

export const API_KEY_SEEDS: ApiKeySeed[] = [
  { id: "key-0001", label: "Production Bot", prefix: "arb_live_k3x9", createdDaysAgo: 28, lastUsedMinutesAgo: 2, permissions: "read_write" },
  { id: "key-0002", label: "Analytics Script", prefix: "arb_live_7fqz", createdDaysAgo: 42, lastUsedMinutesAgo: 180, permissions: "read" },
];

export interface WebhookSeed {
  id: string;
  url: string;
  events: ("new_deal" | "deal_approved" | "deal_executed")[];
  lastDeliveryMinutesAgo: number;
}

export const WEBHOOK_SEEDS: WebhookSeed[] = [
  { id: "wh-0001", url: "https://mybot.example.com/hook", events: ["new_deal", "deal_approved"], lastDeliveryMinutesAgo: 0 },
  { id: "wh-0002", url: "https://slack.example.com/hook", events: ["new_deal"], lastDeliveryMinutesAgo: 12 },
];

export interface DeliverySeed {
  id: string;
  minutesAgo: number;
  event: string;
  urlHost: string;
  statusCode: number;
  retryOf: string | null;
}

export const DELIVERY_SEEDS: DeliverySeed[] = [
  { id: "del-0001", minutesAgo: 1, event: "new_deal", urlHost: "mybot.example.com", statusCode: 200, retryOf: null },
  { id: "del-0002", minutesAgo: 4, event: "deal_approved", urlHost: "mybot.example.com", statusCode: 200, retryOf: null },
  { id: "del-0003", minutesAgo: 15, event: "new_deal", urlHost: "slack.example.com", statusCode: 200, retryOf: null },
  { id: "del-0004", minutesAgo: 29, event: "new_deal", urlHost: "mybot.example.com", statusCode: 503, retryOf: null },
  { id: "del-0005", minutesAgo: 29, event: "new_deal", urlHost: "mybot.example.com", statusCode: 200, retryOf: "del-0004" },
];

export interface ScanJobSeed {
  id: string;
  retailer: string;
  category: string;
  keywords: string[];
  minMarginPct: number;
  paused: boolean;
  createdDaysAgo: number;
}

/** Seeded scan jobs (PRD §5.1/§5.2, TDD §5.8.2). */
export const SCAN_JOB_SEEDS: ScanJobSeed[] = [
  { id: "scan-0001", retailer: "Tesco", category: "Electronics", keywords: ["headphones", "speaker"], minMarginPct: 20, paused: false, createdDaysAgo: 30 },
  { id: "scan-0002", retailer: "Walmart", category: "Toys & Games", keywords: ["lego"], minMarginPct: 25, paused: false, createdDaysAgo: 21 },
  { id: "scan-0003", retailer: "Tesco", category: "Home & Garden", keywords: [], minMarginPct: 20, paused: false, createdDaysAgo: 14 },
  { id: "scan-0004", retailer: "AliExpress", category: "Electronics", keywords: ["smart home"], minMarginPct: 30, paused: true, createdDaysAgo: 7 },
];

export const DEMO_USER = {
  userId: "user-demo-0001",
  email: "demo@arbitrageiq.com",
  password: "Demo!Pass123",
  plan: "business" as const,
  vatRegistered: true,
  minMarginPct: 20,
  /** Any TOTP code is rejected except this one in the mock. */
  mfaCode: "000000",
};

/** Per-tier demo accounts for plan-gating walkthroughs (PRD §8). */
export const TIER_DEMO_USERS = [
  {
    userId: "user-demo-starter",
    email: "starter@arbitrageiq.com",
    password: DEMO_USER.password,
    plan: "starter" as const,
    vatRegistered: false,
    minMarginPct: 20,
  },
  {
    userId: "user-demo-pro",
    email: "pro@arbitrageiq.com",
    password: DEMO_USER.password,
    plan: "pro" as const,
    vatRegistered: true,
    minMarginPct: 20,
  },
];

export const DAILY_SPEND_CAP_GBP = 500;
export const SPENT_TODAY_GBP = 50;
export const QUANTITY_CAP_PER_DEAL = 5;
export const API_QUOTA_PER_DAY = 10_000;
export const API_USED_TODAY = 1_240;
