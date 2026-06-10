# ArbitrageIQ Web Frontend

Next.js 16 (App Router) frontend for ArbitrageIQ — retail arbitrage discovery,
margin analysis, and deal execution. Built per TDD §5.9 with TypeScript,
Tailwind CSS v4, shadcn/ui, TanStack Query v5, React Hook Form + Zod, and
Recharts.

See `docs/frontend-implementation-plan.md` at the repository root for the full
implementation plan and architecture notes.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you will be redirected to the login page.

**Demo credentials (mock gateway):**

| Account                    | Plan     | Password       | MFA code |
| -------------------------- | -------- | -------------- | -------- |
| `demo@arbitrageiq.com`     | Business | `Demo!Pass123` | `000000` |
| `pro@arbitrageiq.com`      | Pro      | `Demo!Pass123` | `000000` |
| `starter@arbitrageiq.com`  | Starter  | `Demo!Pass123` | `000000` |

Registration also works — new accounts go through the same MFA challenge.

**Demo controls:** the wrench button (bottom-right, mock mode only) can
surface a deal on cue, open/close the Tesco scraper circuit breaker, advance
the simulated clock 20 minutes (staleness/409 paths), switch the signed-in
user's plan tier, and reset all demo data. A scripted 10-minute walkthrough
lives at `docs/demo-script.md`.

**Live simulation:** the mock gateway ticks lazily on every request — prices
drift, deals surface and expire, scan jobs fire at plan cadence, and
notifications fan out to the bell. State persists for the server lifetime and
reseeds on restart or reset.

## Architecture

The browser only ever calls Next.js route handlers (`src/app/api/**`) — the
**BFF layer** (TDD §5.9.1). JWTs live in httpOnly, SameSite=Strict cookies and
never reach browser JavaScript. The BFF talks to a **gateway client**:

```
Browser ── /api/v1/* ──► BFF route handlers ──► Gateway client
                                                ├── MockGateway (default)
                                                └── HttpGateway (YARP, TDD §3.4)
```

- **Mock mode (default):** an in-memory store (`src/lib/gateway/mock/`)
  implements the TDD §6 API contracts, including the approval state machine,
  margin re-checks (409), daily spend cap (402), MFA enforcement (403),
  cursor pagination, and CSV export. State persists for the dev-server
  lifetime and reseeds on restart.
- **Real mode:** set `GATEWAY_MODE=real` and `API_GATEWAY_URL=<yarp-url>` to
  forward requests to the platform API Gateway with the session token as a
  Bearer header. No UI changes required.

### Environment variables

| Variable          | Default      | Purpose                                |
| ----------------- | ------------ | -------------------------------------- |
| `GATEWAY_MODE`    | `mock`       | `mock` or `real`                       |
| `API_GATEWAY_URL` | —            | YARP gateway base URL (real mode only) |
| `SESSION_SECRET`  | dev fallback | HMAC key for BFF session cookies       |

### Screens

| Route           | Screen                                                  |
| --------------- | ------------------------------------------------------- |
| `/dashboard`    | Live deal feed (+ Saved tab), circuit-breaker banner    |
| `/deals/[id]`   | Deal detail: margin breakdown, price history            |
| `/catalogue`    | SKU catalogue with scores and watchlist filter          |
| `/scan-jobs`    | Scan job CRUD with plan limits and lifecycle states     |
| `/approvals`    | Approval queue: caps, staleness, mark-sold, execution log |
| `/analytics`    | ROI dashboard — reacts to deals you close               |
| `/settings/api` | API keys, webhooks, delivery log (plan-tiered)          |
| `/auth/*`       | Login, register, MFA challenge                          |

## Commands

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm run lint     # ESLint
npm test         # Vitest unit tests
npm run e2e      # Playwright E2E (boots its own dev server on :3210)
```

## Container

```bash
docker compose --profile frontend up web   # from the repo root, mock mode
# or: docker build -t arbitrageiq-web src/demo && docker run -p 3000:3000 arbitrageiq-web
```

## Deferred (needs real backend services)

PWA / Web Push notifications, sell-channel OAuth connections, Stripe billing
UI, and XLSX export are intentionally deferred until the corresponding
platform services are available. See the plan document for details.
