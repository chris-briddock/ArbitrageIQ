import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession, toErrorResponse } from "@/lib/bff";
import { getGateway } from "@/lib/gateway";

const createKeySchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  permissions: z.enum(["read", "read_write"]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireSession();
    const body = createKeySchema.safeParse(await request.json());
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

    const created = await getGateway().createApiKey(
      session.sub,
      body.data.label,
      body.data.permissions,
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
