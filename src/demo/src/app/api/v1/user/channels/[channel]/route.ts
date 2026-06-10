import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { sellChannelSchema } from "@/lib/schemas";

function parseChannel(value: string) {
  const parsed = sellChannelSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function POST(
  _request: NextRequest,
  context: RouteContext<"/api/v1/user/channels/[channel]">,
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { channel } = await context.params;
    const parsed = parseChannel(channel);
    if (!parsed) {
      return NextResponse.json(
        {
          type: "/errors/validation",
          title: "Validation failed",
          status: 400,
          detail: "Unknown sell channel.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await getGateway().connectChannel(session.sub, parsed),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/v1/user/channels/[channel]">,
): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const { channel } = await context.params;
    const parsed = parseChannel(channel);
    if (!parsed) {
      return NextResponse.json(
        {
          type: "/errors/validation",
          title: "Validation failed",
          status: 400,
          detail: "Unknown sell channel.",
        },
        { status: 400 },
      );
    }

    await getGateway().disconnectChannel(session.sub, parsed);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
