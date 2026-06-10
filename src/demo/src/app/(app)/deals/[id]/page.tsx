import type { Metadata } from "next";
import { DealDetailView } from "@/components/deals/deal-detail";

export const metadata: Metadata = { title: "Deal Detail" };

export default async function DealDetailPage({
  params,
}: PageProps<"/deals/[id]">) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <DealDetailView dealId={id} />
    </div>
  );
}
