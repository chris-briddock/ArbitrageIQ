"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { MarginBadge } from "@/components/deals/margin-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiDelete, apiFetch, apiPost } from "@/lib/api-client";
import { clockTime, gbp, staleness, timeAgo } from "@/lib/format";
import type { ApprovalItem, ApprovalQueueResponse } from "@/lib/schemas";
import { useEntitlements } from "@/lib/use-entitlements";

const STATUS_BADGES: Partial<Record<ApprovalItem["status"], string>> = {
  executing: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  purchased: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  listed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

function StalenessNotice({ queuedAt, now }: { queuedAt: string; now: number }) {
  const level = staleness(queuedAt, new Date(now));
  if (level === "fresh") {
    return null;
  }

  const minutes = Math.floor((now - new Date(queuedAt).getTime()) / 60_000);

  return (
    <p
      className={
        level === "stale"
          ? "mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
          : "mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      }
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      {level === "stale"
        ? `Deal is ${minutes} min old — prices likely stale. Refresh required.`
        : `Prices may have drifted — ${minutes} min since deal was surfaced. Refresh before approving.`}
    </p>
  );
}

interface SoldDialogState {
  approvalId: string;
  skuTitle: string;
  defaultPrice: string;
}

export function ApprovalQueue() {
  const queryClient = useQueryClient();
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [soldDialog, setSoldDialog] = useState<SoldDialogState | null>(null);
  const [salePrice, setSalePrice] = useState("");
  const { entitlements, planLabel } = useEntitlements();
  // Semi-automated purchasing is Pro+ (PRD §8); default open until known.
  const canApprove = entitlements?.semi_automated_purchasing ?? true;

  const { data, isPending, dataUpdatedAt } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => apiFetch<ApprovalQueueResponse>("/api/v1/approvals"),
    // Poll so executing → purchased → listed transitions appear live.
    refetchInterval: 3_000,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    void queryClient.invalidateQueries({ queryKey: ["deals"] });
  }

  function handleApproveError(error: unknown) {
    if (!(error instanceof ApiError)) {
      toast.error("Approval failed. Please try again.");
      return;
    }

    if (error.status === 409) {
      toast.error("Margin has dropped", { description: error.message });
    } else if (error.status === 402) {
      toast.error("Daily spend cap", { description: error.message });
    } else if (error.status === 403) {
      toast.error("MFA required", {
        description: "Verify two-factor authentication before approving deals.",
        action: {
          label: "Verify",
          onClick: () => {
            window.location.href = "/auth/mfa";
          },
        },
      });
    } else {
      toast.error(error.message);
    }
  }

  const approve = useMutation({
    mutationFn: (approvalId: string) =>
      apiPost<{ status: string }>(`/api/v1/approvals/${approvalId}/approve`),
    onSuccess: () => {
      toast.success("Approved — executing purchase and listing.");
      invalidate();
    },
    onError: (error) => {
      handleApproveError(error);
      invalidate();
    },
  });

  const refresh = useMutation({
    mutationFn: (approvalId: string) =>
      apiPost(`/api/v1/approvals/${approvalId}/refresh`),
    onSuccess: () => {
      toast.success("Prices re-checked against the source retailer.");
      invalidate();
    },
    onError: () => toast.error("Could not refresh this deal."),
  });

  const remove = useMutation({
    mutationFn: (approvalId: string) =>
      apiDelete(`/api/v1/approvals/${approvalId}`),
    onSuccess: invalidate,
    onError: () => toast.error("Could not remove this deal."),
  });

  const markSold = useMutation({
    mutationFn: ({ approvalId, price }: { approvalId: string; price: string }) =>
      apiPost(`/api/v1/approvals/${approvalId}/close`, {
        sell_price_gbp: price,
      }),
    onSuccess: () => {
      toast.success("Deal closed — profit recorded in your history.");
      setSoldDialog(null);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Could not close the deal.",
      ),
  });

  const retryLog = useMutation({
    mutationFn: (logEntryId: string) =>
      apiPost(`/api/v1/execution-log/${logEntryId}/retry`),
    onSuccess: () => {
      toast.success("Deal re-queued for approval.");
      invalidate();
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not retry this deal.",
      ),
  });

  const dismissLog = useMutation({
    mutationFn: (logEntryId: string) =>
      apiDelete(`/api/v1/execution-log/${logEntryId}`),
    onSuccess: invalidate,
    onError: () => toast.error("Could not dismiss the log entry."),
  });

  async function approveAll() {
    setConfirmAllOpen(false);
    const pending =
      data?.items.filter((item) => item.status === "pending") ?? [];

    for (const item of pending) {
      try {
        await apiPost(`/api/v1/approvals/${item.approval_id}/approve`);
        toast.success(`${item.sku_title} approved.`);
      } catch (error) {
        handleApproveError(error);
      }
    }

    invalidate();
  }

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-lg" />
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const pendingItems = data.items.filter((item) => item.status === "pending");

  return (
    <div className="space-y-4">
      {!canApprove ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-center text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
          Semi-automated purchasing is a <strong>Pro</strong> and{" "}
          <strong>Business</strong> feature — your {planLabel} plan can stage
          deals here but approval is locked.{" "}
          <button
            type="button"
            className="font-medium underline"
            onClick={() =>
              toast.info("Upgrade flow is handled by Billing/Stripe in production.")
            }
          >
            Upgrade
          </button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <span className="flex items-center gap-1.5">
          <Check className="size-4" aria-hidden />
          Daily spend cap: {Number(data.caps.daily_spend_cap_gbp) === 0 ? "Unlimited" : gbp(data.caps.daily_spend_cap_gbp)}
        </span>
        <span>Remaining today: {Number(data.caps.daily_spend_cap_gbp) === 0 ? "Unlimited" : gbp(data.caps.remaining_today_gbp)}</span>
        <span>Quantity cap: {data.caps.quantity_cap_per_deal === 0 ? "Unlimited" : `${data.caps.quantity_cap_per_deal} units/deal`}</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-4" aria-hidden />
          {data.caps.mfa_verified ? "MFA verified" : "MFA not verified"}
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="hidden items-center gap-4 border-b bg-muted/60 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide md:flex">
          <span className="flex-1">Product · Source → Sell</span>
          <span className="w-10 text-center">Qty</span>
          <span className="w-20 text-right">Buy Cost</span>
          <span className="w-20 text-right">Est. Sell</span>
          <span className="w-28 text-center">Net Margin</span>
          <span className="w-20 text-right">Queued</span>
          <span className="w-64 text-center">Actions</span>
        </div>
        {data.items.length === 0 ? (
          <div className="px-6 py-16 text-center text-muted-foreground">
            <p className="font-medium">Your approval queue is empty.</p>
            <p className="mt-1 text-sm">
              Review a deal on the dashboard and add it to the queue to stage a
              purchase.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {data.items.map((item) => (
              <li key={item.approval_id} className="px-4 py-4 odd:bg-muted/30">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{item.sku_title}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      {item.buy_retailer}
                      <ArrowRight className="size-3.5" aria-hidden />
                      {item.sell_channel_label}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <span className="rounded-md border bg-muted px-2 py-1 text-center text-sm font-medium tabular-nums sm:w-10">
                      {item.quantity}
                    </span>
                    <span className="tabular-nums sm:w-20 sm:text-right">
                      {gbp(item.buy_price_gbp)}
                    </span>
                    <span className="tabular-nums sm:w-20 sm:text-right">
                      {gbp(item.sell_price_gbp)}
                    </span>
                    <span className="flex justify-center sm:w-28">
                      <MarginBadge netMarginPct={item.net_margin_pct} />
                    </span>
                    <span className="text-sm text-muted-foreground sm:w-20 sm:text-right">
                      {timeAgo(item.queued_at)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:w-64 sm:justify-center">
                    {item.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => approve.mutate(item.approval_id)}
                          disabled={approve.isPending || !canApprove}
                          title={
                            canApprove
                              ? undefined
                              : "Upgrade to Pro or Business to enable automated purchasing"
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => refresh.mutate(item.approval_id)}
                          disabled={refresh.isPending}
                        >
                          <RefreshCw aria-hidden /> Refresh
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove.mutate(item.approval_id)}
                          disabled={remove.isPending}
                        >
                          <X aria-hidden /> Remove
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge
                          className={STATUS_BADGES[item.status]}
                          variant="secondary"
                        >
                          {item.status === "executing"
                            ? "Executing…"
                            : item.status}
                        </Badge>
                        {item.status === "listed" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              const perUnit = (
                                Number(item.sell_price_gbp) / item.quantity
                              ).toFixed(2);
                              setSalePrice(perUnit);
                              setSoldDialog({
                                approvalId: item.approval_id,
                                skuTitle: item.sku_title,
                                defaultPrice: perUnit,
                              });
                            }}
                          >
                            Mark Sold
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
                {item.status === "pending" ? (
                  <StalenessNotice
                    queuedAt={item.queued_at}
                    now={dataUpdatedAt}
                  />
                ) : null}
                {item.failure_reason ? (
                  <p className="mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    <XCircle className="size-4 shrink-0" aria-hidden />
                    {item.failure_reason}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingItems.length > 0 && canApprove ? (
        <div className="rounded-lg border bg-accent/40 px-4 py-3 text-center text-sm">
          <Dialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
            <DialogTrigger asChild>
              <button type="button" className="font-medium text-primary underline">
                [ Approve All ]
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve all {pendingItems.length} deals?</DialogTitle>
                <DialogDescription>
                  This executes purchase and listing for every queued deal
                  simultaneously. It is irreversible once started.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="secondary"
                  onClick={() => setConfirmAllOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => void approveAll()}>
                  Approve all
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>{" "}
          <span className="text-muted-foreground">
            — executes purchase + listing for all queued deals simultaneously.
            Irreversible once started.
          </span>
        </div>
      ) : null}

      <section className="rounded-lg border bg-card px-4 py-3">
        <h2 className="text-center text-sm font-semibold">Execution Log</h2>
        {data.execution_log.length === 0 ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">
            No executions yet today.
          </p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {data.execution_log.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1"
              >
                {entry.outcome === "purchased_listed" ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <XCircle
                    className="size-4 shrink-0 text-red-600"
                    aria-hidden
                  />
                )}
                <span className="font-medium">{entry.sku_title}</span>
                <span className="text-muted-foreground">— {entry.detail} —</span>
                <span className="tabular-nums text-muted-foreground">
                  {clockTime(entry.occurred_at)}
                </span>
                {entry.outcome === "failed" ? (
                  <span className="text-muted-foreground">
                    [{" "}
                    <button
                      type="button"
                      onClick={() => retryLog.mutate(entry.id)}
                      disabled={retryLog.isPending}
                      className="text-primary underline"
                    >
                      Retry
                    </button>{" "}
                    |{" "}
                    <button
                      type="button"
                      onClick={() => dismissLog.mutate(entry.id)}
                      disabled={dismissLog.isPending}
                      className="text-primary underline"
                    >
                      Dismiss
                    </button>{" "}
                    ]
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={soldDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSoldDialog(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {soldDialog?.skuTitle} as sold</DialogTitle>
            <DialogDescription>
              Enter the actual sale price per unit. The closed deal is written
              to your history with the final net profit and feeds Analytics.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="sale-price">Sale price per unit (£)</Label>
            <Input
              id="sale-price"
              inputMode="decimal"
              value={salePrice}
              onChange={(event) => setSalePrice(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSoldDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                soldDialog &&
                markSold.mutate({
                  approvalId: soldDialog.approvalId,
                  price: salePrice,
                })
              }
              disabled={
                markSold.isPending ||
                !/^\d+(\.\d{1,2})?$/.test(salePrice) ||
                Number(salePrice) <= 0
              }
            >
              Confirm sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
