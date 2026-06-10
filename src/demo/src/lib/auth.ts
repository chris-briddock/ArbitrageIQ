import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/schemas";

/**
 * BFF session handling (TDD §5.9.1). Tokens are stored as httpOnly,
 * SameSite=Strict cookies and never exposed to browser JavaScript.
 * In mock mode the BFF signs its own HMAC session tokens; in real mode the
 * cookie carries the Identity Service JWT verbatim.
 */

export const JWT_COOKIE = "arbiq_jwt";
export const REFRESH_COOKIE = "arbiq_refresh";
/** Set between password login and MFA verification. */
export const MFA_PENDING_COOKIE = "arbiq_mfa_pending";

const JWT_MAX_AGE_SECONDS = 3_600;
const REFRESH_MAX_AGE_SECONDS = 2_592_000;
const MFA_PENDING_MAX_AGE_SECONDS = 600;

export interface SessionClaims {
  sub: string;
  email: string;
  plan: string;
  mfa_verified: boolean;
  exp: number;
}

function secret(): string {
  return process.env.SESSION_SECRET ?? "arbiq-dev-session-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Encodes and signs session claims as `base64url(payload).signature`. */
export function encodeToken(
  claims: Omit<SessionClaims, "exp">,
  maxAgeSeconds: number = JWT_MAX_AGE_SECONDS,
): string {
  const payload = Buffer.from(
    JSON.stringify({
      ...claims,
      exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
    }),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

/** Verifies signature and expiry; returns null on any failure. */
export function decodeToken(token: string): SessionClaims | null {
  const separator = token.lastIndexOf(".");
  if (separator <= 0) {
    return null;
  }

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SessionClaims;

    return claims.exp > Math.floor(Date.now() / 1000) ? claims : null;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/** Sets the JWT + refresh cookies for a fully authenticated user. */
export async function setSessionCookies(user: SessionUser): Promise<void> {
  const store = await cookies();
  const claims = {
    sub: user.user_id,
    email: user.email,
    plan: user.plan,
    mfa_verified: user.mfa_verified,
  };

  store.set(JWT_COOKIE, encodeToken(claims), {
    ...cookieOptions,
    maxAge: JWT_MAX_AGE_SECONDS,
  });
  store.set(REFRESH_COOKIE, encodeToken(claims, REFRESH_MAX_AGE_SECONDS), {
    ...cookieOptions,
    maxAge: REFRESH_MAX_AGE_SECONDS,
  });
  store.delete(MFA_PENDING_COOKIE);
}

/** Sets the short-lived pending cookie used between login and MFA verify. */
export async function setMfaPendingCookie(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(
    MFA_PENDING_COOKIE,
    encodeToken(
      {
        sub: user.user_id,
        email: user.email,
        plan: user.plan,
        mfa_verified: false,
      },
      MFA_PENDING_MAX_AGE_SECONDS,
    ),
    { ...cookieOptions, maxAge: MFA_PENDING_MAX_AGE_SECONDS },
  );
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(JWT_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(MFA_PENDING_COOKIE);
}

/**
 * Read-only session check safe to call from Server Components and layouts.
 * Does NOT write cookies — returns claims from the refresh token when the
 * access token has expired, without re-issuing a new JWT.
 * Use getSession() from Route Handlers when auto-refresh is desired.
 */
export async function readSession(): Promise<SessionClaims | null> {
  const store = await cookies();

  const jwt = store.get(JWT_COOKIE)?.value;
  if (jwt) {
    const claims = decodeToken(jwt);
    if (claims) {
      return claims;
    }
  }

  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return null;
  }

  return decodeToken(refresh);
}

/**
 * Returns the verified session claims, transparently re-issuing the access
 * token from the refresh token when the access token has expired.
 * Must only be called from Route Handlers or Server Actions — not Server
 * Components — because it writes a cookie on silent refresh.
 */
export async function getSession(): Promise<SessionClaims | null> {
  const store = await cookies();

  const jwt = store.get(JWT_COOKIE)?.value;
  if (jwt) {
    const claims = decodeToken(jwt);
    if (claims) {
      return claims;
    }
  }

  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) {
    return null;
  }

  const claims = decodeToken(refresh);
  if (!claims) {
    return null;
  }

  store.set(
    JWT_COOKIE,
    encodeToken({
      sub: claims.sub,
      email: claims.email,
      plan: claims.plan,
      mfa_verified: claims.mfa_verified,
    }),
    { ...cookieOptions, maxAge: JWT_MAX_AGE_SECONDS },
  );

  return claims;
}

/** Returns the pending-MFA claims set at password login, if any. */
export async function getMfaPending(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(MFA_PENDING_COOKIE)?.value;
  return token ? decodeToken(token) : null;
}
