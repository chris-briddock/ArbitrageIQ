import type { Metadata } from "next";
import { CatalogueBrowse } from "@/components/catalogue/catalogue-browse";

export const metadata: Metadata = { title: "Product Catalogue" };

export default function CataloguePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Product Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          System-populated SKU database with composite scoring and High
          Opportunity badges
        </p>
      </div>
      <CatalogueBrowse />
    </div>
  );
}
