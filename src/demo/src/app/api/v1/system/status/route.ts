import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    return NextResponse.json(await getGateway().getSystemStatus(session.sub));
  } catch (error) {
    return toErrorResponse(error);
  }
}
