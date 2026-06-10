import type { ProblemDetails } from "@/lib/schemas";

/**
 * Browser-side fetch wrapper for the BFF routes. Parses RFC 7807 problem
 * bodies into ApiError so components can branch on status codes
 * (409 margin drift, 402 spend cap / plan gate, 403 MFA).
 */
export class ApiError extends Error {
  public readonly problem: ProblemDetails;

  public constructor(problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = "ApiError";
    this.problem = problem;
  }

  public get status(): number {
    return this.problem.status;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    window.location.href = "/auth/login";
    throw new ApiError({
      type: "/errors/unauthenticated",
      title: "Unauthenticated",
      status: 401,
    });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | ProblemDetails
      | null;
    throw new ApiError(
      payload ?? {
        type: "/errors/unknown",
        title: "Request failed",
        status: response.status,
        detail: `Request failed with HTTP ${response.status}.`,
      },
    );
  }

  return (await response.json()) as T;
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" });
}
