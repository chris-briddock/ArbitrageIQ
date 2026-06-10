import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const user = await getGateway().getSessionUser(session.sub);
    return NextResponse.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
