import { NextResponse } from "next/server";
import { getMfaPending, setSessionCookies } from "@/lib/auth";
import { toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { mfaVerifyRequestSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const pending = await getMfaPending();
    if (!pending) {
      return NextResponse.json(
        {
          type: "/errors/mfa-session-expired",
          title: "MFA session expired",
          status: 401,
          detail: "Your sign-in attempt has expired. Please log in again.",
        },
        { status: 401 },
      );
    }

    const body = mfaVerifyRequestSchema.safeParse(await request.json());
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

    const user = await getGateway().verifyMfa(pending.sub, body.data.code);
    await setSessionCookies(user);

    return NextResponse.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
