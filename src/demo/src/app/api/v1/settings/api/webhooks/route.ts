import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { webhookEventSchema } from "@/lib/schemas";

const registerWebhookSchema = z.object({
  url: z.string().url("Enter a valid HTTPS URL").startsWith("https://", {
    message: "Webhook URLs must use HTTPS",
  }),
  events: z.array(webhookEventSchema).min(1, "Select at least one event"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = registerWebhookSchema.safeParse(await request.json());
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

    const webhook = await getGateway().registerWebhook(
      session.sub,
      body.data.url,
      body.data.events,
    );

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
