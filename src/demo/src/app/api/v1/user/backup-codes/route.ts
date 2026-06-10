import { NextResponse } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

export async function POST(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    return NextResponse.json(
      await getGateway().regenerateBackupCodes(session.sub),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
