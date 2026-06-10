"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { apiPost } from "@/lib/api-client";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/approvals", label: "Approval Queue" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function TopNav({ email }: { email: string }) {
  const router = useRouter();

  async function handleLogout() {
    await apiPost("/api/auth/logout");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="flex h-14 items-center gap-6 px-6">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          ArbitrageIQ
        </Link>
        <span className="hidden h-5 w-px bg-primary-foreground/30 sm:block" />
        <nav className="hidden items-center gap-5 text-sm sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-primary-foreground/85 transition-colors hover:text-primary-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <ThemeToggle />
          <NotificationBell />
          <span className="hidden text-primary-foreground/75 md:block">
            {email}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
