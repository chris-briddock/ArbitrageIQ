"use client";

import Link from "next/link";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Sparkles,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiDelete, apiFetch, apiPost } from "@/lib/api-client";
import { timeAgo } from "@/lib/format";
import type { Notification, NotificationsResponse } from "@/lib/schemas";
import { cn } from "@/lib/utils";

function NotificationIcon({ type }: { type: Notification["type"] }) {
  if (type === "deal_surfaced") {
    return <Sparkles className="size-4 text-indigo-500" aria-hidden />;
  }

  if (type.startsWith("scraper_circuit")) {
    return <AlertTriangle className="size-4 text-amber-500" aria-hidden />;
  }

  if (type === "deal_failed" || type === "deal_expired") {
    return <X className="size-4 text-red-500" aria-hidden />;
  }

  return <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />;
}

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationsResponse>("/api/v1/notifications"),
    refetchInterval: 10_000,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  const markRead = useMutation({
    mutationFn: (id: string) => apiPost(`/api/v1/notifications/${id}/read`),
    onSettled: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiPost("/api/v1/notifications/read-all"),
    onSettled: invalidate,
  });

  const dismiss = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/notifications/${id}`),
    onSettled: invalidate,
  });

  const unread = data?.unread_count ?? 0;

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) {
          void refetch();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          className="relative rounded-md p-1.5 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Bell className="size-5" aria-hidden />
          {unread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-semibold text-primary-foreground dark:bg-red-400">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <CheckCheck className="size-3.5" aria-hidden /> Mark all read
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {!data || data.notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nothing yet — new deals and execution updates land here.
            </p>
          ) : (
            <ul className="divide-y">
              {data.notifications.slice(0, 15).map((notification) => (
                <li
                  key={notification.id}
                  className={cn(
                    "group flex gap-2.5 px-3 py-2.5",
                    !notification.read && "bg-accent/40",
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    <NotificationIcon type={notification.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        onClick={() => markRead.mutate(notification.id)}
                        className="block"
                      >
                        <p className="text-sm font-medium hover:text-primary">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markRead.mutate(notification.id)}
                        className="block w-full text-left"
                      >
                        <p className="text-sm font-medium">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                      </button>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {timeAgo(notification.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() => dismiss.mutate(notification.id)}
                    className="invisible mt-0.5 shrink-0 text-muted-foreground hover:text-foreground group-hover:visible"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
