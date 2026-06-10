import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway, type DealListFilters } from "@/lib/gateway";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;

    const filters: DealListFilters = {
      min_margin: params.has("min_margin")
        ? Number(params.get("min_margin"))
        : undefined,
      retailer: params.get("retailer") ?? undefined,
      category: params.get("category") ?? undefined,
      sort: (params.get("sort") as DealListFilters["sort"]) ?? undefined,
      after: params.get("after") ?? undefined,
      limit: params.has("limit") ? Number(params.get("limit")) : undefined,
      view: params.get("view") === "saved" ? "saved" : "live",
    };

    return NextResponse.json(await getGateway().listDeals(session.sub, filters));
  } catch (error) {
    return toErrorResponse(error);
  }
}
