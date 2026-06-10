import { type NextRequest, type NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway, type AnalyticsFilters } from "@/lib/gateway";
import type { SellChannel } from "@/lib/schemas";

export async function GET(
  request: NextRequest,
): Promise<Response | NextResponse> {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;
    const period = Number(params.get("period") ?? 30);
    const filters: AnalyticsFilters = {
      period: ([30, 90, 365] as const).find((value) => value === period) ?? 30,
      retailer: params.get("retailer") ?? undefined,
      channel: (params.get("channel") as SellChannel) ?? undefined,
    };

    const csv = await getGateway().exportAnalyticsCsv(session.sub, filters);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="deal-history-export.csv"',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
