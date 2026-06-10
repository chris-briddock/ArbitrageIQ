import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    await getGateway().markAllNotificationsRead(session.sub);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
