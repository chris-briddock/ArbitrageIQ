import type { Metadata } from "next";
import { CircuitBanner } from "@/components/layout/circuit-banner";
import { ScanJobs } from "@/components/scan-jobs/scan-jobs";

export const metadata: Metadata = { title: "Scan Jobs" };

export default function ScanJobsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Scan Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Configured retailer/category monitors that drive price ingestion
        </p>
      </div>
      <CircuitBanner />
      <ScanJobs />
    </div>
  );
}
