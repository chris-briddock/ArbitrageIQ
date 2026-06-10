import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/bff";
import { requireDemoStore } from "@/lib/demo-bff";

export async function POST(): Promise<NextResponse> {
  try {
    const guard = await requireDemoStore();
    if ("error" in guard) {
      return guard.error;
    }

    const title = guard.store.demoSurfaceDeal();
    return NextResponse.json({ surfaced: title });
  } catch (error) {
    return toErrorResponse(error);
  }
}
