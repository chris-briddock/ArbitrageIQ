import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway, type AnalyticsFilters } from "@/lib/gateway";
import type { SellChannel } from "@/lib/schemas";

function parseAnalyticsFilters(params: URLSearchParams): AnalyticsFilters {
  const period = Number(params.get("period") ?? 30);

  return {
    period: ([30, 90, 365] as const).find((value) => value === period) ?? 30,
    retailer: params.get("retailer") ?? undefined,
    channel: (params.get("channel") as SellChannel) ?? undefined,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const filters = parseAnalyticsFilters(request.nextUrl.searchParams);
    return NextResponse.json(await getGateway().getAnalytics(session.sub, filters));
  } catch (error) {
    return toErrorResponse(error);
  }
}
