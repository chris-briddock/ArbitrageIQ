"use client";

import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ArrowRight, BookmarkX } from "lucide-react";
import { toast } from "sonner";
import { MarginBadge } from "@/components/deals/margin-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, apiPost } from "@/lib/api-client";
import { gbp } from "@/lib/format";
import type { DealListResponse } from "@/lib/schemas";

/** Saved-for-later bucket (PRD §5.3 save-for-later action). */
export function SavedDeals() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["deals", "saved"],
    queryFn: () => apiFetch<DealListResponse>("/api/v1/deals?view=saved"),
  });

  const unsave = useMutation({
    mutationFn: (dealId: string) => apiPost(`/api/v1/deals/${dealId}/unsave`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Removed from saved deals.");
    },
    onError: () => toast.error("Could not remove the deal."),
  });

  if (isPending) {
    return <Skeleton className="h-40 rounded-lg" />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {data && data.deals.length > 0 ? (
        <ul className="divide-y">
          {data.deals.map((deal) => (
            <li
              key={deal.deal_id}
              className="flex flex-wrap items-center gap-4 px-4 py-3 odd:bg-muted/30"
            >
              <div className="min-w-48 flex-1">
                <p className="font-medium">{deal.sku.title}</p>
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
                  onClick={() => unsave.mutate(deal.deal_id)}
                >
                  <BookmarkX aria-hidden /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-6 py-16 text-center text-muted-foreground">
          <p className="font-medium">No saved deals.</p>
          <p className="mt-1 text-sm">
            Use &ldquo;Save for Later&rdquo; on a deal detail page to park
            opportunities you want to revisit.
          </p>
        </div>
      )}
    </div>
  );
}
