"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Download, Eye, Search, Star } from "lucide-react";
import { ProductTile } from "@/components/product-tile";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiPost } from "@/lib/api-client";
import { gbp, pct } from "@/lib/format";
import type { CatalogueResponse, CatalogueSku } from "@/lib/schemas";
import { useEntitlements } from "@/lib/use-entitlements";
import { cn } from "@/lib/utils";

const ALL = "all";
const CATEGORIES = [
  "Electronics",
  "Toys & Games",
  "Home & Garden",
  "Gaming",
  "Sports",
  "Health & Beauty",
];
const RETAILERS = ["Tesco", "Walmart", "Amazon", "AliExpress"];
const SCORE_OPTIONS = [0, 40, 60, 80];

function scoreTone(score: number): string {
  if (score >= 70) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  }

  return score >= 50 ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
}

function SkuRow({
  sku,
  onToggleWatch,
}: {
  sku: CatalogueSku;
  onToggleWatch: (skuId: string) => void;
}) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3 odd:bg-muted/30 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <ProductTile id={sku.id} title={sku.title} category={sku.category} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{sku.title}</p>
        <p className="text-sm text-muted-foreground">{sku.category}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex flex-col items-center sm:w-28">
          {sku.composite_score !== null ? (
            <>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums",
                  scoreTone(sku.composite_score),
                )}
              >
                {Math.round(sku.composite_score)} /100
              </span>
              <span className="mt-0.5 text-xs capitalize text-muted-foreground">
                {sku.score_confidence}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">No score yet</span>
          )}
        </div>
        <div className="flex justify-center sm:w-24">
          {sku.high_opportunity ? (
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">HIGH OPP</Badge>
          ) : sku.is_stale ? (
            <Badge variant="secondary">STALE</Badge>
          ) : sku.score_confidence === "low" ? (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">LOW CONF</Badge>
          ) : null}
        </div>
        <div className="text-right text-sm sm:w-28">
          <p className="font-medium tabular-nums">
            {sku.deal_event_count_90d}
            {sku.deal_event_count_90d >= 10 ? "+" : ""} / 90d
          </p>
          <p className="text-muted-foreground">
            {pct(sku.avg_net_margin_pct)} avg
          </p>
        </div>
        <div className="text-right text-sm sm:w-32">
          {sku.cheapest_source ? (
            <>
              <p className="font-medium tabular-nums">
                {gbp(sku.cheapest_source.price_gbp)}
              </p>
              <p className="text-muted-foreground">
                ({sku.cheapest_source.retailer})
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {sku.live_deal_id ? (
          <Button asChild size="sm">
            <Link href={`/deals/${sku.live_deal_id}`}>
              <Eye aria-hidden /> View
            </Link>
          </Button>
        ) : (
          <Button size="sm" disabled title="No live deal for this SKU">
            <Eye aria-hidden /> View
          </Button>
        )}
        <Button
          size="sm"
          variant={sku.watched ? "default" : "secondary"}
          onClick={() => onToggleWatch(sku.id)}
        >
          <Star
            className={sku.watched ? "fill-current" : undefined}
            aria-hidden
          />
          {sku.watched ? "Watching" : "Watch"}
        </Button>
      </div>
    </li>
  );
}

export function CatalogueBrowse() {
  const queryClient = useQueryClient();
  const { entitlements } = useEntitlements();
  const canExport = entitlements?.csv_export ?? true;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [retailer, setRetailer] = useState(ALL);
  const [minScore, setMinScore] = useState(0);
  const [watchedOnly, setWatchedOnly] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) {
      params.set("search", search.trim());
    }
    if (category !== ALL) {
      params.set("category", category);
    }
    if (retailer !== ALL) {
      params.set("retailer", retailer);
    }
    if (minScore > 0) {
      params.set("min_score", String(minScore));
    }
    if (watchedOnly) {
      params.set("watched_only", "true");
    }
    params.set("limit", "8");

    return params.toString();
  }, [search, category, retailer, minScore, watchedOnly]);

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["catalogue", queryString],
      queryFn: ({ pageParam }) =>
        apiFetch<CatalogueResponse>(
          `/api/v1/catalogue?${queryString}${pageParam ? `&after=${pageParam}` : ""}`,
        ),
      initialPageParam: "",
      getNextPageParam: (lastPage) => lastPage.next_cursor,
    });

  const toggleWatch = useMutation({
    mutationFn: (skuId: string) =>
      apiPost<{ watched: boolean }>(`/api/v1/catalogue/${skuId}/watch`),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["catalogue"] });
      toast.success(
        result.watched ? "Added to your watchlist." : "Removed from watchlist.",
      );
    },
    onError: () => toast.error("Could not update your watchlist."),
  });

  const skus = data?.pages.flatMap((page) => page.skus) ?? [];
  const rankings = data?.pages[0]?.category_rankings ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products (name, brand, ASIN)"
            className="h-8 pl-8"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Category ▾</SelectItem>
            {CATEGORIES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(minScore)}
          onValueChange={(value) => setMinScore(Number(value))}
        >
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCORE_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                Min Score: {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={retailer} onValueChange={setRetailer}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Retailer ▾</SelectItem>
            {RETAILERS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={watchedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setWatchedOnly((current) => !current)}
          aria-pressed={watchedOnly}
        >
          <Star
            className={watchedOnly ? "fill-current" : undefined}
            aria-hidden
          />
          Watched only
        </Button>
        {canExport ? (
          <Button asChild variant="ghost" size="sm">
            <a href="/api/v1/catalogue/export" download>
              <Download aria-hidden /> Export CSV
            </a>
          </Button>
        ) : null}
      </div>

      <div className="flex gap-4">
        <aside className="hidden w-52 shrink-0 rounded-lg border bg-card p-4 xl:block">
          <h2 className="text-sm font-semibold">Category Rankings</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {rankings.map((ranking, index) => (
              <li
                key={ranking.category}
                className="flex items-center justify-between"
              >
                <button
                  type="button"
                  onClick={() => setCategory(ranking.category)}
                  className={cn(
                    "text-left hover:text-primary",
                    category === ranking.category && "font-medium text-primary",
                  )}
                >
                  {index + 1}. {ranking.category}
                </button>
                <span className="tabular-nums text-muted-foreground">
                  {ranking.avg_score}
                </span>
              </li>
            ))}
          </ol>
          {category !== ALL ? (
            <button
              type="button"
              onClick={() => setCategory(ALL)}
              className="mt-3 text-xs text-primary underline"
            >
              View All Categories
            </button>
          ) : null}
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-card">
          {isPending ? (
            <div className="space-y-px p-1">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-16 rounded-md" />
              ))}
            </div>
          ) : skus.length > 0 ? (
            <>
              <ul className="divide-y">
                {skus.map((sku) => (
                  <SkuRow
                    key={sku.id}
                    sku={sku}
                    onToggleWatch={(skuId) => toggleWatch.mutate(skuId)}
                  />
                ))}
              </ul>
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
                <span>
                  Showing {skus.length} of {total} SKUs
                </span>
                {hasNextPage ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center text-muted-foreground">
              <p className="font-medium">No SKUs match your search.</p>
              <p className="mt-1 text-sm">
                Try clearing filters or broadening the search term.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
