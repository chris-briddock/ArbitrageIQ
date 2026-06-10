import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/v1/approvals/[id]/approve">,
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const result = await getGateway().approve(session.sub, id);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
