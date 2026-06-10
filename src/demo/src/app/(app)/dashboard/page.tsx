import type { Metadata } from "next";
import { DealFeed } from "@/components/deals/deal-feed";
import { CircuitBanner } from "@/components/layout/circuit-banner";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live deal feed with filters and alert controls
        </p>
      </div>
      <CircuitBanner />
      <DealFeed />
    </div>
  );
}
