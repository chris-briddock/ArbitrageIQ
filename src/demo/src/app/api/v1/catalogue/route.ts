import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway, type CatalogueFilters } from "@/lib/gateway";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;

    const filters: CatalogueFilters = {
      search: params.get("search") ?? undefined,
      category: params.get("category") ?? undefined,
      min_score: params.has("min_score")
        ? Number(params.get("min_score"))
        : undefined,
      retailer: params.get("retailer") ?? undefined,
      after: params.get("after") ?? undefined,
      limit: params.has("limit") ? Number(params.get("limit")) : undefined,
      watched_only: params.get("watched_only") === "true",
    };

    return NextResponse.json(
      await getGateway().listCatalogue(session.sub, filters),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
