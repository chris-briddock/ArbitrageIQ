/* eslint-disable @typescript-eslint/no-empty-object-type -- mirrors Next.js generated routes.d.ts */
// Committed fallback for Next.js auto-generated route types.
// When .next/types/routes.d.ts exists (after next build/dev), both files
// declare identical global interfaces and TypeScript merges them cleanly.
// When .next/ is absent (fresh clone, CI), this file provides the types.

type AppRoutes =
  | "/"
  | "/analytics"
  | "/approvals"
  | "/auth/login"
  | "/auth/mfa"
  | "/auth/register"
  | "/catalogue"
  | "/dashboard"
  | "/deals/[id]"
  | "/scan-jobs"
  | "/settings"
  | "/settings/api";

type AppRouteHandlerRoutes =
  | "/api/auth/login"
  | "/api/auth/logout"
  | "/api/auth/mfa"
  | "/api/auth/register"
  | "/api/auth/session"
  | "/api/demo/circuit"
  | "/api/demo/plan"
  | "/api/demo/reset"
  | "/api/demo/surface"
  | "/api/demo/timewarp"
  | "/api/v1/analytics"
  | "/api/v1/analytics/export"
  | "/api/v1/approvals"
  | "/api/v1/approvals/[id]"
  | "/api/v1/approvals/[id]/approve"
  | "/api/v1/approvals/[id]/close"
  | "/api/v1/approvals/[id]/refresh"
  | "/api/v1/catalogue"
  | "/api/v1/catalogue/[id]/watch"
  | "/api/v1/catalogue/export"
  | "/api/v1/deals"
  | "/api/v1/deals/[id]"
  | "/api/v1/deals/[id]/dismiss"
  | "/api/v1/deals/[id]/refresh"
  | "/api/v1/deals/[id]/save"
  | "/api/v1/deals/[id]/unsave"
  | "/api/v1/execution-log/[id]"
  | "/api/v1/execution-log/[id]/retry"
  | "/api/v1/history"
  | "/api/v1/notifications"
  | "/api/v1/notifications/[id]"
  | "/api/v1/notifications/[id]/read"
  | "/api/v1/notifications/read-all"
  | "/api/v1/scan-jobs"
  | "/api/v1/scan-jobs/[id]"
  | "/api/v1/scan-jobs/[id]/pause"
  | "/api/v1/scan-jobs/[id]/resume"
  | "/api/v1/settings/api"
  | "/api/v1/settings/api/keys"
  | "/api/v1/settings/api/keys/[id]"
  | "/api/v1/settings/api/webhooks"
  | "/api/v1/settings/api/webhooks/[id]"
  | "/api/v1/system/status"
  | "/api/v1/user"
  | "/api/v1/user/backup-codes"
  | "/api/v1/user/channels/[channel]"
  | "/api/v1/user/export"
  | "/api/v1/user/notifications"
  | "/api/v1/user/settings";

type PageRoutes = never;
type LayoutRoutes = "/";
type RedirectRoutes = never;
type RewriteRoutes = never;
type Routes =
  | AppRoutes
  | PageRoutes
  | LayoutRoutes
  | RedirectRoutes
  | RewriteRoutes
  | AppRouteHandlerRoutes;

interface ParamMap {
  "/": {};
  "/analytics": {};
  "/api/auth/login": {};
  "/api/auth/logout": {};
  "/api/auth/mfa": {};
  "/api/auth/register": {};
  "/api/auth/session": {};
  "/api/demo/circuit": {};
  "/api/demo/plan": {};
  "/api/demo/reset": {};
  "/api/demo/surface": {};
  "/api/demo/timewarp": {};
  "/api/v1/analytics": {};
  "/api/v1/analytics/export": {};
  "/api/v1/approvals": {};
  "/api/v1/approvals/[id]": { id: string };
  "/api/v1/approvals/[id]/approve": { id: string };
  "/api/v1/approvals/[id]/close": { id: string };
  "/api/v1/approvals/[id]/refresh": { id: string };
  "/api/v1/catalogue": {};
  "/api/v1/catalogue/[id]/watch": { id: string };
  "/api/v1/catalogue/export": {};
  "/api/v1/deals": {};
  "/api/v1/deals/[id]": { id: string };
  "/api/v1/deals/[id]/dismiss": { id: string };
  "/api/v1/deals/[id]/refresh": { id: string };
  "/api/v1/deals/[id]/save": { id: string };
  "/api/v1/deals/[id]/unsave": { id: string };
  "/api/v1/execution-log/[id]": { id: string };
  "/api/v1/execution-log/[id]/retry": { id: string };
  "/api/v1/history": {};
  "/api/v1/notifications": {};
  "/api/v1/notifications/[id]": { id: string };
  "/api/v1/notifications/[id]/read": { id: string };
  "/api/v1/notifications/read-all": {};
  "/api/v1/scan-jobs": {};
  "/api/v1/scan-jobs/[id]": { id: string };
  "/api/v1/scan-jobs/[id]/pause": { id: string };
  "/api/v1/scan-jobs/[id]/resume": { id: string };
  "/api/v1/settings/api": {};
  "/api/v1/settings/api/keys": {};
  "/api/v1/settings/api/keys/[id]": { id: string };
  "/api/v1/settings/api/webhooks": {};
  "/api/v1/settings/api/webhooks/[id]": { id: string };
  "/api/v1/system/status": {};
  "/api/v1/user": {};
  "/api/v1/user/backup-codes": {};
  "/api/v1/user/channels/[channel]": { channel: string };
  "/api/v1/user/export": {};
  "/api/v1/user/notifications": {};
  "/api/v1/user/settings": {};
  "/approvals": {};
  "/auth/login": {};
  "/auth/mfa": {};
  "/auth/register": {};
  "/catalogue": {};
  "/dashboard": {};
  "/deals/[id]": { id: string };
  "/scan-jobs": {};
  "/settings": {};
  "/settings/api": {};
}

export type ParamsOf<Route extends Routes> = ParamMap[Route];

// NOTE: LayoutProps and LayoutSlotMap are intentionally omitted because
// type aliases in `declare global` cannot be merged — they would cause
// "Duplicate identifier" errors when .next/types/routes.d.ts also exists.

export type {
  AppRoutes,
  PageRoutes,
  LayoutRoutes,
  RedirectRoutes,
  RewriteRoutes,
  ParamMap,
  AppRouteHandlerRoutes,
};

declare global {
  /**
   * Props for Next.js App Router page components
   * @example
   * ```tsx
   * export default function Page(props: PageProps<'/blog/[slug]'>) {
   *   const { slug } = await props.params
   *   return <div>Blog post: {slug}</div>
   * }
   * ```
   */
  interface PageProps<AppRoute extends AppRoutes> {
    params: Promise<ParamMap[AppRoute]>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }

  /**
   * Context for Next.js App Router route handlers
   * @example
   * ```tsx
   * export async function GET(request: NextRequest, context: RouteContext<'/api/users/[id]'>) {
   *   const { id } = await context.params
   *   return Response.json({ id })
   * }
   * ```
   */
  interface RouteContext<AppRouteHandlerRoute extends AppRouteHandlerRoutes> {
    params: Promise<ParamMap[AppRouteHandlerRoute]>;
  }
}
