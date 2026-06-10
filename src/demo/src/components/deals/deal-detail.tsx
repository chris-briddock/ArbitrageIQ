"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ExternalLink,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { MarginBadge } from "@/components/deals/margin-badge";
import { PriceChart } from "@/components/deals/price-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiFetch, apiPost } from "@/lib/api-client";
import { gbp } from "@/lib/format";
import type { DealDetail, SellChannel, SessionUser, UserSettings } from "@/lib/schemas";


const SELL_CHANNELS: { value: SellChannel; label: string }[] = [
  { value: "amazon_fba", label: "Amazon FBA" },
  { value: "amazon_fbm", label: "Amazon FBM" },
  { value: "ebay", label: "eBay" },
  { value: "shopify", label: "Shopify" },
  { value: "facebook", label: "Facebook Marketplace" },
  { value: "gumtree", label: "Gumtree" },
];

function BreakdownRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={emphasis ? "font-medium" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular-nums ${emphasis ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function DealDetailView({ dealId }: { dealId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [channel, setChannel] = useState<SellChannel | null>(null);

  const { data: deal, isPending } = useQuery({
    queryKey: ["deal", dealId],
    queryFn: () => apiFetch<DealDetail>(`/api/v1/deals/${dealId}`),
  });

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<{ user: SessionUser }>("/api/auth/session"),
    staleTime: 60_000,
  });

  const { data: userSettings } = useQuery({
    queryKey: ["user-settings"],
    queryFn: () => apiFetch<UserSettings>("/api/v1/user/settings"),
    staleTime: 60_000,
  });

  const refreshPrices = useMutation({
    mutationFn: () =>
      apiPost<DealDetail>(`/api/v1/deals/${dealId}/refresh`),
    onSuccess: (updated) => {
      queryClient.setQueryData(["deal", dealId], updated);
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Prices refreshed from source retailers.");
    },
    onError: () => toast.error("Could not refresh prices. Please try again."),
  });

  const addToQueue = useMutation({
    mutationFn: () =>
      apiPost<{ approval_id: string }>("/api/v1/approvals", {
        deal_id: dealId,
        quantity,
        sell_channel: channel ?? deal?.sell.channel,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Added to your approval queue.", {
        action: { label: "View queue", onClick: () => router.push("/approvals") },
      });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not add the deal to your queue.",
      ),
  });

  const saveForLater = useMutation({
    mutationFn: () => apiPost(`/api/v1/deals/${dealId}/save`),
    onSuccess: () => toast.success("Saved for later."),
    onError: () => toast.error("Could not save the deal."),
  });

  if (isPending || !deal) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const quantityCap = userSettings?.quantity_cap_per_deal ?? 5;
  const quantityCapActive = quantityCap > 0;
  const netProfitTotal = Number(deal.margin.net_profit_gbp) * quantity;
  const lowConfidence = deal.sku.deal_event_count_90d < 5;
  const vatRegistered = sessionData?.user.vat_registered ?? false;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">
            <ArrowLeft aria-hidden /> Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">{deal.sku.title}</h1>
        {deal.sku.high_opportunity ? (
          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">HIGH OPP</Badge>
        ) : null}
        <span className="text-sm text-muted-foreground">— Deal Detail</span>
      </div>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Margin Summary</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refreshPrices.mutate()}
            disabled={refreshPrices.isPending}
          >
            <RefreshCw
              className={refreshPrices.isPending ? "animate-spin" : undefined}
              aria-hidden
            />
            Refresh Prices
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Buy — {deal.buy.retailer}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-4">
              <BreakdownRow
                label={`${deal.buy.retailer}: `}
                value={gbp(deal.buy_breakdown.price_gbp)}
              />
              <BreakdownRow
                label="Delivery"
                value={gbp(deal.buy_breakdown.delivery_gbp)}
              />
              <BreakdownRow
                label="VAT reclaim"
                value={gbp(deal.buy_breakdown.vat_reclaim_gbp)}
              />
              <div className="border-t pt-1.5">
                <BreakdownRow
                  label="Effective"
                  value={gbp(deal.buy_breakdown.effective_gbp)}
                  emphasis
                />
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Sell — {deal.sell.channel_label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-4">
              <BreakdownRow
                label={`${deal.sell.channel_label}: `}
                value={gbp(deal.sell_breakdown.price_gbp)}
              />
              <BreakdownRow
                label="Referral fee"
                value={gbp(deal.sell_breakdown.referral_fee_gbp)}
              />
              <BreakdownRow
                label="Fulfilment"
                value={gbp(deal.sell_breakdown.fulfilment_fee_gbp)}
              />
              <BreakdownRow
                label="Fuel surcharge"
                value={gbp(deal.sell_breakdown.fuel_surcharge_gbp)}
              />
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-accent/40 py-4">
            <CardHeader className="px-4 pb-0">
              <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-semibold tabular-nums">
                {gbp(netProfitTotal.toFixed(2))}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <MarginBadge netMarginPct={deal.margin.net_margin_pct} />
                <span className="text-sm text-muted-foreground">margin</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Qty:</span>
                <div className="flex items-center gap-1 rounded-md border">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((current) => current - 1)}
                  >
                    <Minus className="size-3.5" aria-hidden />
                  </button>
                  <span className="w-6 text-center text-sm font-medium tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                    disabled={quantityCapActive && quantity >= quantityCap}
                    onClick={() => setQuantity((current) => current + 1)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <PriceChart
        history={deal.price_history}
        belowAveragePct={deal.below_90d_average_pct}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="py-4">
          <CardContent className="px-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Composite Score
            </p>
            {deal.sku.composite_score !== null ? (
              <>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {deal.sku.composite_score.toFixed(1)} / 100
                </p>
                <p className="text-sm capitalize text-muted-foreground">
                  {deal.sku.score_confidence} confidence
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Not yet scored — insufficient deal history
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Deal Frequency
            </p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {deal.sku.deal_event_count_90d} in 90 days
            </p>
            <p className="text-sm text-muted-foreground">
              {deal.sku.deal_event_count_90d >= 10
                ? "Frequent opportunity"
                : "Occasional opportunity"}
            </p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4 text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Demand Signal
            </p>
            <p className="mt-1 text-xl font-semibold">
              BSR: {deal.demand_signal.bsr_trend}
            </p>
            <p className="text-sm text-muted-foreground">
              Review velocity: {deal.demand_signal.review_velocity}
            </p>
          </CardContent>
        </Card>
      </div>

      {lowConfidence ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          ⚠ Low confidence: fewer than 5 deal events for this SKU — the score
          is based on limited history. Verify the sell price before committing.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
        <Select
          value={channel ?? deal.sell.channel}
          onValueChange={(value) => setChannel(value as SellChannel)}
        >
          <SelectTrigger size="sm" className="w-48">
            <SelectValue placeholder="Sell channel" />
          </SelectTrigger>
          <SelectContent>
            {SELL_CHANNELS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => addToQueue.mutate()}
          disabled={addToQueue.isPending}
        >
          <Check aria-hidden /> Add to Approval Queue
        </Button>
        <Button asChild variant="secondary">
          <a href={deal.buy.product_url} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden /> Buy Manually
          </a>
        </Button>
        <Button
          variant="ghost"
          onClick={() => saveForLater.mutate()}
          disabled={saveForLater.isPending}
        >
          <Bookmark aria-hidden /> Save for Later
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {vatRegistered
          ? "VAT registered — buy-side VAT reclaimed, net VAT excluded from sell price."
          : "Non-registered — figures use gross prices; no VAT reclaim applied."}{" "}
        Sell channel selection applies to the auto-listing created on approval.
      </p>
    </div>
  );
}
