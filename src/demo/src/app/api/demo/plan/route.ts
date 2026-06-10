import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { setSessionCookies } from "@/lib/auth";
import { toErrorResponse } from "@/lib/bff";
import { requireDemoStore } from "@/lib/demo-bff";
import { planSchema } from "@/lib/schemas";

const planRequestSchema = z.object({ plan: planSchema });

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const guard = await requireDemoStore();
    if ("error" in guard) {
      return guard.error;
    }

    const body = planRequestSchema.safeParse(await request.json());
    if (!body.success) {
      return NextResponse.json(
        {
          type: "/errors/validation",
          title: "Validation failed",
          status: 400,
          detail: "plan must be starter, pro, or business.",
        },
        { status: 400 },
      );
    }

    // The session cookie carries the plan claim — re-issue it (plan.changed).
    const user = guard.store.demoSetPlan(guard.session.sub, body.data.plan);
    await setSessionCookies(user);

    return NextResponse.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
