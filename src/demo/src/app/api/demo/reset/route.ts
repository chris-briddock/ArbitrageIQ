import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/bff";
import { getMockStore, resetMockStore } from "@/lib/gateway";

/**
 * Re-seeds the demo. Unlike the other demo endpoints this one does not
 * require a session (the pristine store has no verified sessions to check
 * against) — it is still mock-mode only and returns 404 in real mode.
 */
export async function POST(): Promise<NextResponse> {
  try {
    if (!getMockStore()) {
      return NextResponse.json(
        {
          type: "/errors/not-found",
          title: "Not found",
          status: 404,
          detail: "Demo controls are only available in mock mode.",
        },
        { status: 404 },
      );
    }

    resetMockStore();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
