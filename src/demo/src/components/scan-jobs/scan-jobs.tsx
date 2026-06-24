"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, apiDelete, apiFetch, apiPost } from "@/lib/api-client";
import { pct, timeAgo } from "@/lib/format";
import {
  createScanJobRequestSchema,
  type CreateScanJobRequest,
  type ScanJob,
  type ScanJobsResponse,
} from "@/lib/schemas";

const RETAILERS = ["Tesco", "Walmart", "Amazon", "AliExpress", "eBay"];
const CATEGORIES = [
  "Electronics",
  "Toys & Games",
  "Home & Garden",
  "Gaming",
  "Sports",
  "Health & Beauty",
];

const STATUS_STYLES: Record<ScanJob["status"], string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  paused: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  suspended: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  over_limit: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const STATUS_LABELS: Record<ScanJob["status"], string> = {
  active: "Active",
  paused: "Paused",
  suspended: "Suspended",
  over_limit: "Over limit",
};

function cadenceLabel(minutes: number): string {
  return minutes >= 60 ? `Every ${minutes / 60}h` : `Every ${minutes} min`;
}

export function ScanJobs() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["scan-jobs"],
    queryFn: () => apiFetch<ScanJobsResponse>("/api/v1/scan-jobs"),
    refetchInterval: 10_000,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["scan-jobs"] });
  }

  const form = useForm<CreateScanJobRequest>({
    resolver: zodResolver(createScanJobRequestSchema),
    defaultValues: {
      retailer: "Tesco",
      category: "Electronics",
      keywords: "",
      min_margin_pct: "20",
    },
  });

  const selectedRetailer = useWatch({
    control: form.control,
    name: "retailer",
  });
  const selectedCategory = useWatch({
    control: form.control,
    name: "category",
  });

  const createJob = useMutation({
    mutationFn: (values: CreateScanJobRequest) =>
      apiPost<ScanJob>("/api/v1/scan-jobs", values),
    onSuccess: () => {
      toast.success("Scan job created — first run dispatched.");
      setCreateOpen(false);
      form.reset();
      invalidate();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 402) {
        toast.error("Plan limit reached", { description: error.message });
      } else {
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Could not create the scan job.",
        );
      }
    },
  });

  const pause = useMutation({
    mutationFn: (jobId: string) => apiPost(`/api/v1/scan-jobs/${jobId}/pause`),
    onSuccess: invalidate,
    onError: () => toast.error("Could not pause the scan job."),
  });

  const resume = useMutation({
    mutationFn: (jobId: string) => apiPost(`/api/v1/scan-jobs/${jobId}/resume`),
    onSuccess: invalidate,
    onError: () => toast.error("Could not resume the scan job."),
  });

  const deleteJob = useMutation({
    mutationFn: (jobId: string) => apiDelete(`/api/v1/scan-jobs/${jobId}`),
    onSuccess: () => {
      toast.success("Scan job deleted. Historical price data is retained.");
      invalidate();
    },
    onError: () => toast.error("Could not delete the scan job."),
  });

  if (isPending || !data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {data.active_count}
          </span>{" "}
          active scan job{data.active_count === 1 ? "" : "s"}
          {data.job_limit !== null ? (
            <> of {data.job_limit} allowed on your plan</>
          ) : (
            <> — unlimited on your plan</>
          )}
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden /> New Scan Job
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Retailer</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Keywords</TableHead>
                <TableHead className="text-right">Min Margin</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.retailer}</TableCell>
                  <TableCell>{job.category}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.keywords.length > 0 ? job.keywords.join(", ") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(job.min_margin_pct)}
                  </TableCell>
                  <TableCell>{cadenceLabel(job.cadence_minutes)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.last_run_at ? timeAgo(job.last_run_at) : "Never"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_STYLES[job.status]}>
                      {STATUS_LABELS[job.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {job.status === "paused" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resume.mutate(job.id)}
                          aria-label="Resume"
                        >
                          <Play aria-hidden />
                          <span className="hidden sm:inline">Resume</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => pause.mutate(job.id)}
                          disabled={job.status === "suspended"}
                          aria-label="Pause"
                        >
                          <Pause aria-hidden />
                          <span className="hidden sm:inline">Pause</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteJob.mutate(job.id)}
                        aria-label={`Delete ${job.retailer} ${job.category} scan job`}
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {data.jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No scan jobs yet — create one to start monitoring a retailer
                    category for arbitrage opportunities.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        Suspended jobs resume automatically when the retailer&apos;s scraper
        circuit breaker closes. Scan cadence is set by your plan tier.
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New scan job</DialogTitle>
            <DialogDescription>
              Monitors a retailer category for price changes at your plan&apos;s
              cadence. The first run is dispatched immediately.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => createJob.mutate(values))}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Retailer</Label>
                <Select
                  value={selectedRetailer}
                  onValueChange={(value) => form.setValue("retailer", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETAILERS.map((retailer) => (
                      <SelectItem key={retailer} value={retailer}>
                        {retailer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => form.setValue("category", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="keywords">Keywords (comma-separated, optional)</Label>
              <Input
                id="keywords"
                placeholder="e.g. headphones, speaker"
                {...form.register("keywords")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min_margin_pct">Minimum net margin (%)</Label>
              <Input id="min_margin_pct" {...form.register("min_margin_pct")} />
              {form.formState.errors.min_margin_pct ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.min_margin_pct.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createJob.isPending}>
                Create scan job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
