import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toErrorResponse } from "@/lib/bff";
import { requireDemoStore } from "@/lib/demo-bff";

const circuitRequestSchema = z.object({
  retailer: z.string().min(1),
  open: z.boolean(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireDemoStore();
    if ("error" in guard) {
      return guard.error;
    }

    const body = circuitRequestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        {
          type: "/errors/validation",
          title: "Validation failed",
          status: 400,
          detail: "retailer and open are required.",
        },
        { status: 400 },
      );
    }

    guard.store.demoSetCircuit(body.data.retailer, body.data.open);
    return NextResponse.json({ open_circuits: guard.store.openCircuits() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
