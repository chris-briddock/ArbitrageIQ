import { NextResponse } from "next/server";
import { getSession, type SessionClaims } from "@/lib/auth";
import { GatewayError } from "@/lib/gateway";

/**
 * Shared helpers for the BFF route handlers: session enforcement and
 * RFC 7807 error translation.
 */

export async function requireSession(): Promise<SessionClaims> {
  const session = await getSession();
  if (!session) {
    throw new GatewayError({
      type: "/errors/unauthenticated",
      title: "Unauthenticated",
      status: 401,
      detail: "Sign in to continue.",
    });
  }

  return session;
}

/** Translates thrown errors into JSON responses; GatewayError keeps its status. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof GatewayError) {
    return NextResponse.json(error.problem, { status: error.problem.status });
  }

  console.error("Unhandled BFF error", error);
  return NextResponse.json(
    {
      type: "/errors/internal",
      title: "Internal error",
      status: 500,
      detail: "Something went wrong. Please try again.",
    },
    { status: 500 },
  );
}
