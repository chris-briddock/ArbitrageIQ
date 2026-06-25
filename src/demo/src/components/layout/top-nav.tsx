"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { apiPost } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/scan-jobs", label: "Scan Jobs" },
  { href: "/approvals", label: "Approval Queue" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
  { href: "/settings/api", label: "API Settings" },
];

export function TopNav({ email }: { email: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await apiPost("/api/auth/logout");
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="flex h-14 items-center gap-4 px-4 lg:gap-6 lg:px-6">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          ArbitrageIQ
        </Link>
        <span className="hidden h-5 w-px bg-primary-foreground/30 lg:block" />
        <nav className="hidden items-center gap-5 text-sm lg:flex">
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
        <div className="ml-auto flex items-center gap-2 text-sm lg:gap-4">
          <ThemeToggle />
          <NotificationBell />
          <span className="hidden text-primary-foreground/75 md:block">
            {email}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center gap-1.5 rounded-md px-2 py-1 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground lg:flex"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md p-1.5 text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground lg:hidden"
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Mobile + tablet navigation overlay */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-x-0 top-14 z-40 border-b bg-primary text-primary-foreground transition-all duration-200 lg:hidden",
          menuOpen
            ? "max-h-screen opacity-100"
            : "max-h-0 overflow-hidden opacity-0",
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-md px-3 py-2.5 text-sm text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-primary-foreground/20 pt-2">
            <span className="block px-3 py-2 text-sm text-primary-foreground/75">
              {email}
            </span>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void handleLogout();
              }}
              className="flex w-full items-center gap-1.5 rounded-md px-3 py-2.5 text-sm text-primary-foreground/85 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
