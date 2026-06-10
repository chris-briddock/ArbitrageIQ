"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckSquare,
  KeyRound,
  LayoutDashboard,
  Library,
  Radar,
  Settings,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { ApprovalQueueResponse } from "@/lib/schemas";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalogue", label: "Catalogue", icon: Library },
  { href: "/scan-jobs", label: "Scan Jobs", icon: Radar },
  { href: "/approvals", label: "Approval Queue", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings/api", label: "API Settings", icon: KeyRound },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
  const pathname = usePathname();

  const { data } = useQuery({
    queryKey: ["approvals"],
    queryFn: () => apiFetch<ApprovalQueueResponse>("/api/v1/approvals"),
    refetchInterval: 15_000,
  });

  const pendingCount =
    data?.items.filter((item) => item.status === "pending").length ?? 0;

  return (
    <aside className="hidden w-60 shrink-0 bg-sidebar text-sidebar-foreground lg:block">
      <nav className="flex flex-col gap-1 p-4">
        {ITEMS.map((item) => {
          // Longest-prefix match so /settings/api doesn't also light /settings.
          const matches = ITEMS.filter(
            (candidate) =>
              pathname === candidate.href ||
              pathname.startsWith(`${candidate.href}/`),
          ).sort((a, b) => b.href.length - a.href.length);
          const active = matches[0]?.href === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span>{item.label}</span>
              {item.href === "/approvals" && pendingCount > 0 ? (
                <span className="ml-auto rounded-full bg-sidebar-primary px-2 py-0.5 text-xs font-medium text-sidebar-primary-foreground">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
