"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Check,
  Copy,
  Download,
  Link2,
  Link2Off,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ApiError, apiDelete, apiFetch, apiPost } from "@/lib/api-client";
import { PLAN_LABELS } from "@/lib/entitlements";
import { timeAgo } from "@/lib/format";
import type {
  ChannelConnection,
  NotificationPrefs,
  UserSettings,
} from "@/lib/schemas";

const CHANNEL_STATUS_STYLES: Record<ChannelConnection["status"], string> = {
  connected:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  expired: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  disconnected: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const CHANNEL_STATUS_LABELS: Record<ChannelConnection["status"], string> = {
  connected: "Connected",
  expired: "Expired",
  disconnected: "Not connected",
};

async function patchSettings(body: unknown): Promise<UserSettings> {
  return apiFetch<UserSettings>("/api/v1/user/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function UserSettingsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [marginDraft, setMarginDraft] = useState("");
  const [marginDirty, setMarginDirty] = useState(false);
  const [spendCapDraft, setSpendCapDraft] = useState("");
  const [spendCapDirty, setSpendCapDirty] = useState(false);
  const [quantityCapDraft, setQuantityCapDraft] = useState("");
  const [quantityCapDirty, setQuantityCapDirty] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [codesCopied, setCodesCopied] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["user-settings"],
    queryFn: () => apiFetch<UserSettings>("/api/v1/user/settings"),
  });

  function applyUpdate(settings: UserSettings) {
    queryClient.setQueryData(["user-settings"], settings);
    void queryClient.invalidateQueries({ queryKey: ["session"] });
  }

  function onError(error: unknown) {
    toast.error(
      error instanceof ApiError ? error.message : "Could not save the change.",
    );
    void queryClient.invalidateQueries({ queryKey: ["user-settings"] });
  }

  const updateProfile = useMutation({
    mutationFn: (body: {
      vat_registered?: boolean;
      min_margin_pct?: string;
      daily_spend_cap_gbp?: string;
      quantity_cap_per_deal?: number;
    }) => patchSettings(body),
    onSuccess: (settings) => {
      applyUpdate(settings);
      toast.success("Profile updated.");
    },
    onError,
  });

  const updatePrefs = useMutation({
    mutationFn: (prefs: NotificationPrefs) =>
      apiFetch<UserSettings>("/api/v1/user/notifications", {
        method: "PUT",
        body: JSON.stringify(prefs),
      }),
    onSuccess: applyUpdate,
    onError,
  });

  const connect = useMutation({
    mutationFn: (channel: string) =>
      apiPost(`/api/v1/user/channels/${channel}`),
    onSuccess: () => {
      toast.success("Channel connected — OAuth token stored in the vault.");
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError,
  });

  const disconnect = useMutation({
    mutationFn: (channel: string) =>
      apiDelete(`/api/v1/user/channels/${channel}`),
    onSuccess: () => {
      toast.success("Channel disconnected — token zeroised and deleted.");
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError,
  });

  const regenerateCodes = useMutation({
    mutationFn: () =>
      apiPost<{ codes: string[] }>("/api/v1/user/backup-codes"),
    onSuccess: (result) => {
      setCodesCopied(false);
      setBackupCodes(result.codes);
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onError,
  });

  const deleteAccount = useMutation({
    mutationFn: () => apiDelete("/api/v1/user"),
    onSuccess: () => {
      toast.success("Account deleted. Anonymised records retained for tax compliance.");
      router.push("/auth/login");
      router.refresh();
    },
    onError,
  });

  if (isPending || !data) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  const margin = marginDirty ? marginDraft : Number(data.min_margin_pct).toFixed(0);
  const spendCap = spendCapDirty ? spendCapDraft : data.daily_spend_cap_gbp;
  const quantityCap = quantityCapDirty ? quantityCapDraft : String(data.quantity_cap_per_deal);
  const prefs = data.notifications;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Account details and the defaults that drive deal surfacing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{data.email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Plan</p>
              <Badge variant="secondary">{PLAN_LABELS[data.plan]}</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <div>
              <Label htmlFor="vat-switch" className="text-sm font-medium">
                VAT registered
              </Label>
              <p className="text-sm text-muted-foreground">
                Drives the VAT treatment in the margin calculator — reclaim on
                buys when registered, gross prices otherwise.
              </p>
            </div>
            <Switch
              id="vat-switch"
              checked={data.vat_registered}
              onCheckedChange={(checked) =>
                updateProfile.mutate({ vat_registered: checked })
              }
            />
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="min-margin">Minimum net margin alert (%)</Label>
              <Input
                id="min-margin"
                inputMode="numeric"
                className="w-24 sm:w-32"
                value={margin}
                onChange={(event) => { setMarginDraft(event.target.value); setMarginDirty(true); }}
              />
            </div>
            <Button
              size="sm"
              disabled={
                !/^\d{1,2}(\.\d)?$/.test(margin) ||
                Number(margin) === Number(data.min_margin_pct) ||
                updateProfile.isPending
              }
              onClick={() => {
                updateProfile.mutate({ min_margin_pct: margin });
                setMarginDraft(""); setMarginDirty(false);
              }}
            >
              Save threshold
            </Button>
            <p className="basis-full text-sm text-muted-foreground">
              Deals below this margin are not surfaced as alerts.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="spend-cap">Daily spend cap (£)</Label>
              <Input
                id="spend-cap"
                inputMode="decimal"
                className="w-24 sm:w-32"
                value={spendCap}
                onChange={(event) => { setSpendCapDraft(event.target.value); setSpendCapDirty(true); }}
              />
            </div>
            <Button
              size="sm"
              disabled={
                !/^\d+(\.\d{1,2})?$/.test(spendCap) ||
                Number(spendCap) < 0 ||
                Number(spendCap) === Number(data.daily_spend_cap_gbp) ||
                updateProfile.isPending
              }
              onClick={() => {
                updateProfile.mutate({ daily_spend_cap_gbp: spendCap });
                setSpendCapDraft(""); setSpendCapDirty(false);
              }}
            >
              Save cap
            </Button>
            <p className="basis-full text-sm text-muted-foreground">
              Maximum total buy cost the auto-purchaser will execute in one day. Set to 0 for unlimited.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantity-cap">Quantity cap per deal</Label>
              <Input
                id="quantity-cap"
                inputMode="numeric"
                className="w-20 sm:w-24"
                value={quantityCap}
                onChange={(event) => { setQuantityCapDraft(event.target.value); setQuantityCapDirty(true); }}
              />
            </div>
            <Button
              size="sm"
              disabled={
                !/^\d+$/.test(quantityCap) ||
                Number(quantityCap) < 0 ||
                Number(quantityCap) === data.quantity_cap_per_deal ||
                updateProfile.isPending
              }
              onClick={() => {
                updateProfile.mutate({ quantity_cap_per_deal: Number(quantityCap) });
                setQuantityCapDraft(""); setQuantityCapDirty(false);
              }}
            >
              Save cap
            </Button>
            <p className="basis-full text-sm text-muted-foreground">
              Maximum units per deal that can be added to the approval queue. Set to 0 for unlimited.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            MFA is required before any automated purchase executes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck
                className={
                  data.mfa_enrolled
                    ? "size-5 text-emerald-600"
                    : "size-5 text-muted-foreground"
                }
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium">
                  Two-factor authentication (TOTP)
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.mfa_enrolled
                    ? `Verified · ${data.backup_codes_remaining} backup codes remaining`
                    : "Not verified this session — you will be challenged at next sign-in."}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => regenerateCodes.mutate()}
              disabled={regenerateCodes.isPending}
            >
              <RefreshCw aria-hidden /> Regenerate backup codes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sell channels</CardTitle>
          <CardDescription>
            OAuth connections used for auto-listing on approval. Tokens are
            encrypted in the Credential Vault; expired tokens need
            re-authentication before approvals can execute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {data.channels.map((channel) => (
              <li
                key={channel.channel}
                className="flex flex-col gap-2 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
              >
                <span className="font-medium sm:w-44">{channel.label}</span>
                <div className="flex flex-wrap items-center gap-2 sm:flex-1">
                  <Badge
                    variant="secondary"
                    className={CHANNEL_STATUS_STYLES[channel.status]}
                  >
                    {CHANNEL_STATUS_LABELS[channel.status]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {channel.connected_at
                      ? `Connected ${timeAgo(channel.connected_at)}`
                      : "—"}
                  </span>
                </div>
                {channel.status === "connected" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnect.mutate(channel.channel)}
                  >
                    <Link2Off aria-hidden /> Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => connect.mutate(channel.channel)}
                  >
                    <Link2 aria-hidden />
                    {channel.status === "expired" ? "Reconnect" : "Connect"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Delivery preferences for deal alerts and execution updates. The
            in-app feed is always on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              {
                key: "email_alerts",
                label: "Email alerts",
                description: "Immediate email when a deal is surfaced.",
              },
              {
                key: "push_alerts",
                label: "Browser push",
                description: "Web Push for time-sensitive alerts (Pro+).",
              },
              {
                key: "daily_digest",
                label: "Daily digest",
                description: "One morning summary of surfaced deals.",
              },
            ] as const
          ).map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <Label htmlFor={`pref-${row.key}`} className="text-sm font-medium">
                  {row.label}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {row.description}
                </p>
              </div>
              <Switch
                id={`pref-${row.key}`}
                checked={prefs[row.key]}
                onCheckedChange={(checked) =>
                  updatePrefs.mutate({ ...prefs, [row.key]: checked })
                }
              />
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div>
              <Label htmlFor="pref-quiet" className="text-sm font-medium">
                Quiet hours
              </Label>
              <p className="text-sm text-muted-foreground">
                Hold email and push alerts overnight; they appear in-app.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {prefs.quiet_hours.enabled ? (
                <>
                  <Input
                    type="time"
                    aria-label="Quiet hours start"
                    className="w-24 sm:w-28"
                    value={prefs.quiet_hours.start}
                    onChange={(event) =>
                      updatePrefs.mutate({
                        ...prefs,
                        quiet_hours: {
                          ...prefs.quiet_hours,
                          start: event.target.value,
                        },
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    aria-label="Quiet hours end"
                    className="w-24 sm:w-28"
                    value={prefs.quiet_hours.end}
                    onChange={(event) =>
                      updatePrefs.mutate({
                        ...prefs,
                        quiet_hours: {
                          ...prefs.quiet_hours,
                          end: event.target.value,
                        },
                      })
                    }
                  />
                </>
              ) : null}
              <Switch
                id="pref-quiet"
                checked={prefs.quiet_hours.enabled}
                onCheckedChange={(checked) =>
                  updatePrefs.mutate({
                    ...prefs,
                    quiet_hours: { ...prefs.quiet_hours, enabled: checked },
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data &amp; privacy</CardTitle>
          <CardDescription>
            GDPR / UK GDPR rights: export everything we hold, or erase your
            account. Financial records are retained anonymised for 7-year tax
            compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <a href="/api/v1/user/export" download>
              <Download aria-hidden /> Export my data (JSON)
            </a>
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 aria-hidden /> Delete account
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={backupCodes !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBackupCodes(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new backup codes</DialogTitle>
            <DialogDescription>
              Each code works once if you lose your authenticator. They are
              shown only now and stored hashed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {(backupCodes ?? []).map((code) => (
              <code key={code} className="rounded-md border bg-muted px-3 py-1.5">
                {code}
              </code>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  (backupCodes ?? []).join("\n"),
                );
                setCodesCopied(true);
              }}
            >
              {codesCopied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {codesCopied ? "Copied" : "Copy all"}
            </Button>
            <Button onClick={() => setBackupCodes(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This erases your profile, scan jobs, and queue (GDPR right to
              erasure). Closed-deal financials are kept anonymised for tax
              compliance. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
            >
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
