import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { notificationPrefsSchema } from "@/lib/schemas";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = notificationPrefsSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        {
          type: "/errors/validation",
          title: "Validation failed",
          status: 400,
          detail: body.error.issues[0]?.message ?? "Invalid request.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await getGateway().updateNotificationPrefs(session.sub, body.data),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
