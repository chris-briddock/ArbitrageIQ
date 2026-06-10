import { type NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function GET(): Promise<Response | NextResponse> {
  try {
    const session = await requireSession();
    const csv = await getGateway().exportCatalogueCsv(session.sub);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="catalogue-export.csv"',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
