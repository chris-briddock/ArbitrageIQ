"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  RotateCcw,
  Sparkles,
  Unplug,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ApiError, apiFetch, apiPost } from "@/lib/api-client";
import { PLAN_LABELS } from "@/lib/entitlements";
import type { Plan, SessionUser } from "@/lib/schemas";

const CIRCUIT_RETAILER = "Tesco";

/**
 * Floating demo control panel (mock mode only — the server layout gates
 * rendering). Triggers simulation events on cue for walkthroughs.
 */
export function DemoControls() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: sessionData } = useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<{ user: SessionUser }>("/api/auth/session"),
    staleTime: 60_000,
  });

  const { data: status } = useQuery({
    queryKey: ["system-status"],
    queryFn: () =>
      apiFetch<{ open_circuits: string[] }>("/api/v1/system/status"),
    refetchInterval: 10_000,
    enabled: open,
  });

  function invalidateAll() {
    void queryClient.invalidateQueries();
  }

  function onError(error: unknown) {
    toast.error(
      error instanceof ApiError ? error.message : "Demo action failed.",
    );
  }

  const reset = useMutation({
    mutationFn: () => apiPost("/api/demo/reset"),
    onSuccess: () => {
      toast.success("Demo data reset to pristine seeds.");
      invalidateAll();
      router.refresh();
    },
    onError,
  });

  const surface = useMutation({
    mutationFn: () => apiPost<{ surfaced: string | null }>("/api/demo/surface"),
    onSuccess: (result) => {
      if (result.surfaced) {
        toast.success(`Surfaced: ${result.surfaced}`);
      } else {
        toast.info("No reserve deals left and nothing has expired yet.");
      }

      invalidateAll();
    },
    onError,
  });

  const circuitOpen = status?.open_circuits.includes(CIRCUIT_RETAILER) ?? false;
  const circuit = useMutation({
    mutationFn: () =>
      apiPost("/api/demo/circuit", {
        retailer: CIRCUIT_RETAILER,
        open: !circuitOpen,
      }),
    onSuccess: () => {
      toast.success(
        circuitOpen
          ? `${CIRCUIT_RETAILER} circuit closed — collection resumed.`
          : `${CIRCUIT_RETAILER} circuit opened — scan jobs suspended.`,
      );
      invalidateAll();
    },
    onError,
  });

  const timewarp = useMutation({
    mutationFn: () => apiPost("/api/demo/timewarp", { minutes: 20 }),
    onSuccess: () => {
      toast.success("Clock advanced +20 minutes — watch staleness warnings.");
      invalidateAll();
    },
    onError,
  });

  const setPlan = useMutation({
    mutationFn: (plan: Plan) =>
      apiPost<{ user: SessionUser }>("/api/demo/plan", { plan }),
    onSuccess: (result) => {
      toast.success(`Plan switched to ${PLAN_LABELS[result.user.plan]}.`);
      invalidateAll();
      router.refresh();
    },
    onError,
  });

  return (
    <>
      <button
        type="button"
        aria-label="Open demo controls"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-50 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        <Wrench className="size-5" aria-hidden />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Demo controls</DialogTitle>
            <DialogDescription>
              Mock-mode only — trigger simulation events on cue during a
              walkthrough.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => surface.mutate()}
              disabled={surface.isPending}
            >
              <Sparkles aria-hidden /> Surface a deal now
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => circuit.mutate()}
              disabled={circuit.isPending}
            >
              <Unplug aria-hidden />
              {circuitOpen
                ? `Close ${CIRCUIT_RETAILER} circuit breaker`
                : `Open ${CIRCUIT_RETAILER} circuit breaker`}
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => timewarp.mutate()}
              disabled={timewarp.isPending}
            >
              <Clock aria-hidden /> Advance clock +20 minutes
            </Button>

            <Separator />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Plan tier</span>
              <Select
                value={sessionData?.user.plan}
                onValueChange={(value) => setPlan.mutate(value as Plan)}
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
            >
              <RotateCcw aria-hidden /> Reset demo data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
