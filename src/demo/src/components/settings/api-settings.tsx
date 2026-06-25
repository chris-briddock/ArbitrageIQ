"use client";

import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Check, Copy, KeyRound, Plus, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { clockTime, timeAgo } from "@/lib/format";
import type {
  ApiKey,
  ApiSettingsResponse,
  WebhookEvent,
} from "@/lib/schemas";

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: "new_deal", label: "new_deal" },
  { value: "deal_approved", label: "deal_approved" },
  { value: "deal_executed", label: "deal_executed" },
];

function deliveryTone(statusCode: number, retryOf: string | null): string {
  if (statusCode >= 500) {
    return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  }

  return retryOf
    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
}

export function ApiSettings() {
  const queryClient = useQueryClient();
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [keyLabel, setKeyLabel] = useState("");
  const [keyPermissions, setKeyPermissions] = useState<"read" | "read_write">(
    "read",
  );
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([
    "new_deal",
  ]);

  const { data, isPending, error } = useQuery({
    queryKey: ["api-settings"],
    queryFn: () => apiFetch<ApiSettingsResponse>("/api/v1/settings/api"),
    retry: false,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["api-settings"] });
  }

  const createKey = useMutation({
    mutationFn: () =>
      apiPost<{ full_key: string; record: ApiKey }>(
        "/api/v1/settings/api/keys",
        { label: keyLabel, permissions: keyPermissions },
      ),
    onSuccess: (result) => {
      setCreatedKey(result.full_key);
      invalidate();
    },
    onError: (mutationError) =>
      toast.error(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Could not generate the key.",
      ),
  });

  const revokeKey = useMutation({
    mutationFn: (keyId: string) =>
      apiDelete(`/api/v1/settings/api/keys/${keyId}`),
    onSuccess: () => {
      toast.success("API key revoked.");
      invalidate();
    },
    onError: () => toast.error("Could not revoke the key."),
  });

  const registerWebhook = useMutation({
    mutationFn: () =>
      apiPost("/api/v1/settings/api/webhooks", {
        url: webhookUrl,
        events: webhookEvents,
      }),
    onSuccess: () => {
      toast.success("Webhook registered.");
      setWebhookDialogOpen(false);
      setWebhookUrl("");
      setWebhookEvents(["new_deal"]);
      invalidate();
    },
    onError: (mutationError) =>
      toast.error(
        mutationError instanceof ApiError
          ? mutationError.message
          : "Could not register the webhook.",
      ),
  });

  const deleteWebhook = useMutation({
    mutationFn: (webhookId: string) =>
      apiDelete(`/api/v1/settings/api/webhooks/${webhookId}`),
    onSuccess: () => {
      toast.success("Webhook deleted.");
      invalidate();
    },
    onError: () => toast.error("Could not delete the webhook."),
  });

  if (error instanceof ApiError && error.status === 402) {
    return (
      <div className="rounded-lg border bg-card px-6 py-16 text-center">
        <KeyRound className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h2 className="mt-3 font-semibold">API access is a Business plan feature</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          {error.message}
        </p>
        <Button className="mt-4">Upgrade to Business</Button>
      </div>
    );
  }

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  function closeKeyDialog() {
    setKeyDialogOpen(false);
    setCreatedKey(null);
    setKeyLabel("");
    setCopied(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col flex-wrap items-center justify-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 sm:flex-row sm:gap-x-6 sm:gap-y-1 sm:text-sm dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <span className="flex items-center gap-1.5">
          <Check className="size-3.5 sm:size-4" aria-hidden />
          {data.api_access === "full"
            ? "Business Plan — Full API access enabled. REST + Webhooks"
            : "Pro Plan — Read-only REST API access"}
        </span>
        <span>Quota: {data.quota_per_day.toLocaleString("en-GB")} calls/day</span>
        <span>Used today: {data.used_today.toLocaleString("en-GB")}</span>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">API Keys</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Label</TableHead>
                <TableHead>Key (prefix)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.label}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {key.key_prefix}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(key.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {key.last_used_at ? timeAgo(key.last_used_at) : "Never"}
                  </TableCell>
                  <TableCell>
                    {key.permissions === "read_write"
                      ? "Read + Write"
                      : "Read only"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revokeKey.mutate(key.id)}
                    >
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.keys.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No API keys yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <Button onClick={() => setKeyDialogOpen(true)}>
          <Plus aria-hidden /> Generate New Key
        </Button>
      </section>

      {data.api_access === "read" ? (
        <div className="rounded-lg border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          <Webhook className="mx-auto mb-2 size-5" aria-hidden />
          Outbound webhooks are a Business plan feature. Your Pro plan includes
          read-only REST access with the keys above.
        </div>
      ) : null}

      <section
        className="space-y-3"
        hidden={data.api_access !== "full"}
        aria-hidden={data.api_access !== "full"}
      >
        <h2 className="font-semibold">Webhook Endpoints</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Delivery</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell className="font-mono text-sm">
                    {webhook.url}
                  </TableCell>
                  <TableCell className="text-sm">
                    {webhook.events.join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        webhook.status === "active"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : undefined
                      }
                    >
                      {webhook.status === "active" ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {webhook.last_delivery_at
                      ? timeAgo(webhook.last_delivery_at)
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteWebhook.mutate(webhook.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.webhooks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No webhooks registered.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
        <Button onClick={() => setWebhookDialogOpen(true)}>
          <Webhook aria-hidden /> Register New Webhook
        </Button>
      </section>

      <section
        className="space-y-3"
        hidden={data.api_access !== "full"}
        aria-hidden={data.api_access !== "full"}
      >
        <h2 className="font-semibold">Delivery Log (last 5)</h2>
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>Time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>URL</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {clockTime(delivery.delivered_at)}
                  </TableCell>
                  <TableCell>
                    {delivery.retry_of
                      ? `(retry) ${delivery.event}`
                      : delivery.event}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {delivery.url_host}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="secondary"
                      className={deliveryTone(
                        delivery.status_code,
                        delivery.retry_of,
                      )}
                    >
                      {delivery.status_code}{" "}
                      {delivery.status_code === 200 ? "OK" : "Error"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <p className="text-center text-sm text-muted-foreground">
        📖 API Documentation →{" "}
        <a
          href="https://docs.arbitrageiq.com/api"
          className="text-primary underline"
          target="_blank"
          rel="noreferrer"
        >
          docs.arbitrageiq.com/api
        </a>{" "}
        | OpenAPI / Swagger spec available for download
      </p>

      <Dialog
        open={keyDialogOpen}
        onOpenChange={(open) => (open ? setKeyDialogOpen(true) : closeKeyDialog())}
      >
        <DialogContent>
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Your new API key</DialogTitle>
                <DialogDescription>
                  Copy it now — for security it is shown only once and stored
                  hashed.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {createdKey}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdKey);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeKeyDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Generate new API key</DialogTitle>
                <DialogDescription>
                  Keys authenticate REST API calls via the X-API-Key header.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="key-label">Label</Label>
                  <Input
                    id="key-label"
                    value={keyLabel}
                    onChange={(event) => setKeyLabel(event.target.value)}
                    placeholder="e.g. Production Bot"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Permissions</Label>
                  <Select
                    value={keyPermissions}
                    onValueChange={(value) =>
                      setKeyPermissions(value as "read" | "read_write")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read only</SelectItem>
                      <SelectItem value="read_write">Read + Write</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={closeKeyDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createKey.mutate()}
                  disabled={!keyLabel.trim() || createKey.isPending}
                >
                  Generate
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register new webhook</DialogTitle>
            <DialogDescription>
              We POST signed event payloads (HMAC-SHA256, X-ArbitrageIQ-Signature
              header) to your HTTPS endpoint.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://example.com/hook"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              {WEBHOOK_EVENTS.map((event) => (
                <label
                  key={event.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={webhookEvents.includes(event.value)}
                    onCheckedChange={(checked) =>
                      setWebhookEvents((current) =>
                        checked
                          ? [...current, event.value]
                          : current.filter((value) => value !== event.value),
                      )
                    }
                  />
                  {event.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setWebhookDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => registerWebhook.mutate()}
              disabled={
                !webhookUrl.trim() ||
                webhookEvents.length === 0 ||
                registerWebhook.isPending
              }
            >
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
