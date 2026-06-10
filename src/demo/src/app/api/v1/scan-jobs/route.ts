import { NextResponse, type NextRequest } from "next/server";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";
import { createScanJobRequestSchema } from "@/lib/schemas";

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireSession();
    return NextResponse.json(await getGateway().listScanJobs(session.sub));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = createScanJobRequestSchema.safeParse(await request.json());
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

    const job = await getGateway().createScanJob(session.sub, {
      retailer: body.data.retailer,
      category: body.data.category,
      keywords:
        body.data.keywords
          ?.split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean) ?? [],
      min_margin_pct: Number(body.data.min_margin_pct),
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
