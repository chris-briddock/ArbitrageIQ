import { NextResponse } from "next/server";
import { setMfaPendingCookie, setSessionCookies } from "@/lib/auth";
import { toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { loginRequestSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = loginRequestSchema.safeParse(await request.json());
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

    const result = await getGateway().login(
      body.data.email,
      body.data.password,
    );

    if (result.mfa_required) {
      await setMfaPendingCookie(result.user);
      return NextResponse.json({ mfa_required: true });
    }

    await setSessionCookies(result.user);
    return NextResponse.json({ mfa_required: false, user: result.user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
