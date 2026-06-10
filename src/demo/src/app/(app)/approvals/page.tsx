import type { Metadata } from "next";
import { ApprovalQueue } from "@/components/approvals/approval-queue";

export const metadata: Metadata = { title: "Approval Queue" };

export default function ApprovalsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Approval Queue</h1>
        <p className="text-sm text-muted-foreground">
          Staged deals awaiting your approval before automated purchase
          executes
        </p>
      </div>
      <ApprovalQueue />
    </div>
  );
}
