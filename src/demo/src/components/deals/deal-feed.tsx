"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MarginBadge } from "@/components/deals/margin-badge";
import { SavedDeals } from "@/components/deals/saved-deals";
import { ProductTile } from "@/components/product-tile";
import { StatCard } from "@/components/deals/stat-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiPost } from "@/lib/api-client";
import { gbp, gbpWhole, pct } from "@/lib/format";
import type { DealListResponse } from "@/lib/schemas";

const RETAILERS = ["Tesco", "Walmart", "Amazon", "AliExpress"];
const CATEGORIES = [
  "Electronics",
  "Toys & Games",
  "Home & Garden",
  "Gaming",
  "Sports",
  "Health & Beauty",
];
const MARGIN_OPTIONS = [0, 10, 20, 30];
const ALL = "all";

interface Filters {
  retailer: string;
  category: string;
  minMargin: number;
  sort: "margin" | "profit" | "newest";
}

function dealsQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.retailer !== ALL) {
    params.set("retailer", filters.retailer);
  }
  if (filters.category !== ALL) {
    params.set("category", filters.category);
  }
  if (filters.minMargin > 0) {
    params.set("min_margin", String(filters.minMargin));
  }
  params.set("sort", filters.sort);

  return params.toString();
}

export function DealFeed() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"live" | "saved">("live");
  const [filters, setFilters] = useState<Filters>({
    retailer: ALL,
    category: ALL,
    minMargin: 20,
    sort: "margin",
  });

  const queryString = useMemo(() => dealsQueryString(filters), [filters]);

  const { data, isPending, refetch, isRefetching } = useQuery({
    queryKey: ["deals", queryString],
    queryFn: () =>
      apiFetch<DealListResponse>(`/api/v1/deals?${queryString}`),
    // Live feed polling per TDD §5.9.2.
    refetchInterval: 5_000,
  });

  // Highlight rows that arrived since the previous poll and announce them.
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!data) {
      return;
    }

    const currentIds = new Set(data.deals.map((deal) => deal.deal_id));
    const known = knownIdsRef.current;
    knownIdsRef.current = currentIds;
    if (known === null) {
      return;
    }

    const arrived = data.deals.filter((deal) => !known.has(deal.deal_id));
    if (arrived.length === 0) {
      return;
    }

    setFreshIds((previous) => {
      const next = new Set(previous);
      for (const deal of arrived) {
        next.add(deal.deal_id);
      }

      return next;
    });
    for (const deal of arrived) {
      toast.info("New deal surfaced", {
        description: `${deal.sku.title} — ${Number(deal.margin.net_margin_pct).toFixed(1)}% via ${deal.buy.retailer} → ${deal.sell.channel_label}`,
      });
    }

    const timer = setTimeout(() => {
      setFreshIds((previous) => {
        const next = new Set(previous);
        for (const deal of arrived) {
          next.delete(deal.deal_id);
        }

        return next;
      });
    }, 12_000);

    return () => clearTimeout(timer);
  }, [data]);

  const dismiss = useMutation({
    mutationFn: (dealId: string) =>
      apiPost(`/api/v1/deals/${dealId}/dismiss`),
    onMutate: async (dealId) => {
      await queryClient.cancelQueries({ queryKey: ["deals"] });
      const previous = queryClient.getQueryData<DealListResponse>([
        "deals",
        queryString,
      ]);
      if (previous) {
        queryClient.setQueryData<DealListResponse>(["deals", queryString], {
          ...previous,
          deals: previous.deals.filter((deal) => deal.deal_id !== dealId),
        });
      }

      return { previous };
    },
    onError: (_error, _dealId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["deals", queryString], context.previous);
      }

      toast.error("Could not dismiss the deal. Please try again.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  if (tab === "saved") {
    return (
      <div className="space-y-4">
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as "live" | "saved")}
        >
          <TabsList>
            <TabsTrigger value="live">Live Feed</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
        </Tabs>
        <SavedDeals />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as "live" | "saved")}
      >
        <TabsList>
          <TabsTrigger value="live">Live Feed</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          Filter:
        </span>
        <Select
          value={filters.retailer}
          onValueChange={(value) =>
            setFilters((current) => ({ ...current, retailer: value }))
          }
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Retailers</SelectItem>
            {RETAILERS.map((retailer) => (
              <SelectItem key={retailer} value={retailer}>
                {retailer}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.category}
          onValueChange={(value) =>
            setFilters((current) => ({ ...current, category: value }))
          }
        >
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Categories</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(filters.minMargin)}
          onValueChange={(value) =>
            setFilters((current) => ({ ...current, minMargin: Number(value) }))
          }
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MARGIN_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                Min Margin: {option}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.sort}
          onValueChange={(value) =>
            setFilters((current) => ({
              ...current,
              sort: value as Filters["sort"],
            }))
          }
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="margin">Sort: Margin ↓</SelectItem>
            <SelectItem value="profit">Sort: Profit ↓</SelectItem>
            <SelectItem value="newest">Sort: Newest</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => void refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={isRefetching ? "animate-spin" : undefined}
            aria-hidden
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data ? (
          <>
            <StatCard
              value={String(data.stats.active_deals)}
              label="Active Deals"
            />
            <StatCard
              value={`${gbpWhole(data.stats.est_profit_gbp)} Est. Profit`}
              label="Across active deals"
            />
            <StatCard
              value={pct(data.stats.avg_margin_pct)}
              label="Avg Margin"
            />
            <StatCard
              value={String(data.stats.pending_approvals)}
              label="Pending Approval"
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))
        )}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {isPending ? (
          <div className="space-y-px p-1">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-md" />
            ))}
          </div>
        ) : data && data.deals.length > 0 ? (
          <ul className="divide-y" aria-live="polite">
            {data.deals.map((deal) => (
              <li
                key={deal.deal_id}
                className={
                  freshIds.has(deal.deal_id)
                    ? "flex flex-wrap items-center gap-4 bg-accent/70 px-4 py-3 transition-colors duration-1000"
                    : "flex flex-wrap items-center gap-4 px-4 py-3 transition-colors duration-1000 odd:bg-muted/30"
                }
              >
                <ProductTile
                  id={deal.sku.id}
                  title={deal.sku.title}
                  category={deal.sku.category}
                  size="sm"
                />
                <div className="min-w-48 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {deal.sku.title}
                    {freshIds.has(deal.deal_id) ? (
                      <Sparkles
                        className="size-3.5 text-indigo-500"
                        aria-hidden
                      />
                    ) : null}
                  </p>
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    {deal.buy.retailer}
                    <ArrowRight className="size-3.5" aria-hidden />
                    {deal.sell.channel_label}
                  </p>
                </div>
                <MarginBadge netMarginPct={deal.margin.net_margin_pct} />
                <span className="w-24 text-right font-medium tabular-nums">
                  {gbp(deal.margin.net_profit_gbp)} net
                </span>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <Link href={`/deals/${deal.deal_id}`}>Review</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => dismiss.mutate(deal.deal_id)}
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-16 text-center text-muted-foreground">
            <p className="font-medium">No deals match your filters.</p>
            <p className="mt-1 text-sm">
              Lower the minimum margin or widen retailer and category filters —
              new opportunities surface automatically as prices refresh.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
