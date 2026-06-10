import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

const closeRequestSchema = z.object({
  sell_price_gbp: z.string().regex(/^\d+(\.\d{1,2})?$/, "Enter a valid price"),
});

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/v1/approvals/[id]/close">,
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { id } = await context.params;
    const body = closeRequestSchema.safeParse(await request.json());
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

    await getGateway().closeApproval(
      session.sub,
      id,
      Number(body.data.sell_price_gbp),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
