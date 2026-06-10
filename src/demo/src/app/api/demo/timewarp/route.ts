import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/bff";
import { requireDemoStore } from "@/lib/demo-bff";

const timewarpRequestSchema = z.object({
  minutes: z.number().int().min(1).max(24 * 60),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireDemoStore();
    if ("error" in guard) {
      return guard.error;
    }

    const body = timewarpRequestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        {
          type: "/errors/validation",
          title: "Validation failed",
          status: 400,
          detail: "minutes must be between 1 and 1440.",
        },
        { status: 400 },
      );
    }

    guard.store.demoAdvanceClock(body.data.minutes);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
