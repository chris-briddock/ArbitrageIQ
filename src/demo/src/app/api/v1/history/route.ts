import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function GET(
  request: NextRequest,
): Promise<Response | NextResponse> {
  try {
    const session = await requireSession();

    // CSV export via Accept header per TDD §6.2 GET /api/v1/history.
    if (request.headers.get("accept")?.includes("text/csv")) {
      const csv = await getGateway().exportAnalyticsCsv(session.sub, {});
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="deal-history.csv"',
        },
      });
    }

    return NextResponse.json({
      deals: await getGateway().listHistory(session.sub),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
