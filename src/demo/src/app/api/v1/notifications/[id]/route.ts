import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/v1/notifications/[id]">,
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    await getGateway().dismissNotification(session.sub, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
