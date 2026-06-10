import { type NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

/** GDPR data export (TDD §8.6: GET /api/v1/user/export). */
export async function GET(): Promise<Response | NextResponse> {
  try {
    const session = await requireSession();
    const payload = await getGateway().exportUserData(session.sub);

    return new Response(payload, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="arbitrageiq-data-export.json"',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
