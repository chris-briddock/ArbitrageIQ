import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { sellChannelSchema } from "@/lib/schemas";

const createApprovalSchema = z.object({
  deal_id: z.string().min(1),
  quantity: z.number().int().min(1),
  sell_channel: sellChannelSchema,
});

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    return NextResponse.json(await getGateway().getApprovalQueue(session.sub));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = createApprovalSchema.safeParse(await request.json());
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

    const result = await getGateway().createApproval(session.sub, body.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
