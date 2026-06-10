import { NextResponse } from "next/server";
import { setMfaPendingCookie, setSessionCookies } from "@/lib/auth";
import { toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { registerRequestSchema } from "@/lib/schemas";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = registerRequestSchema.safeParse(await request.json());
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

    const result = await getGateway().register(
      body.data.email,
      body.data.password,
    );

    if (result.mfa_required) {
      await setMfaPendingCookie(result.user);
      return NextResponse.json({ mfa_required: true }, { status: 201 });
    }

    await setSessionCookies(result.user);
    return NextResponse.json(
      { mfa_required: false, user: result.user },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
