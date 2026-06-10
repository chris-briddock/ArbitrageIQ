import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/v1/deals/[id]">,
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    return NextResponse.json(await getGateway().getDeal(session.sub, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
