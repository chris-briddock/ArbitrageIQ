import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth";

export async function POST(): Promise<NextResponse> {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
