import { NextResponse } from "next/server";
import { requireSession } from "@/lib/bff";
import { getMockStore } from "@/lib/gateway";
import type { MockStore } from "@/lib/gateway/mock/store";
import type { SessionClaims } from "@/lib/auth";

/**
 * Guard for /api/demo/* endpoints: they exist only in mock mode and require
 * an authenticated session. In real-gateway mode they 404.
 */
export async function requireDemoStore(): Promise<
  | { store: MockStore; session: SessionClaims }
  | { error: NextResponse }
> {
  const store = getMockStore();
  if (!store) {
    return {
      error: NextResponse.json(
        {
          type: "/errors/not-found",
          title: "Not found",
          status: 404,
          detail: "Demo controls are only available in mock mode.",
        },
        { status: 404 },
      ),
    };
  }

  const session = await requireSession();
  return { store, session };
}
