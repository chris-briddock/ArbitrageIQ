import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

/** GDPR erasure (TDD §8.6: DELETE /api/v1/user). Ends the session. */
export async function DELETE(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    await getGateway().deleteAccount(session.sub);
    await clearSessionCookies();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
