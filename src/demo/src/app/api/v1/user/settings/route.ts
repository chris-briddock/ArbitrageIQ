import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { updateProfileRequestSchema } from "@/lib/schemas";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    return NextResponse.json(await getGateway().getUserSettings(session.sub));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = updateProfileRequestSchema.safeParse(await request.json());
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

    const settings = await getGateway().updateProfile(session.sub, {
      vat_registered: body.data.vat_registered,
      min_margin_pct:
        body.data.min_margin_pct === undefined
          ? undefined
          : Number(body.data.min_margin_pct),
      daily_spend_cap_gbp:
        body.data.daily_spend_cap_gbp === undefined
          ? undefined
          : Number(body.data.daily_spend_cap_gbp),
      quantity_cap_per_deal: body.data.quantity_cap_per_deal,
    });

    return NextResponse.json(settings);
  } catch (error) {
    return toErrorResponse(error);
  }
}
