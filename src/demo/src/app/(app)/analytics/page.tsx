import type { Metadata } from "next";
import { AnalyticsDashboardView } from "@/components/analytics/analytics-dashboard";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Deal history, ROI performance, and accounting export
        </p>
      </div>
      <AnalyticsDashboardView />
    </div>
  );
}
