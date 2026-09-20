# PPT pls

PPT pls is a premium ordering app for students who need a polished, custom medical presentation delivered quickly.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/ppt-pls/src/App.tsx` — customer ordering flow and confirmation view
- `artifacts/ppt-pls/src/index.css` — PPT pls visual language and responsive styles
- `lib/api-spec/openapi.yaml` — source of truth for catalog, order, and checkout contracts
- `artifacts/api-server/src/routes/catalog.ts` — subject groups and price catalog
- `artifacts/api-server/src/routes/orders.ts` — order capture and hosted checkout handoff

## Architecture decisions

- Customer briefs are captured before payment so a request is not lost if hosted checkout is unavailable.
- Whop remains the payment source of truth; the app only keeps the short-lived order context needed to return the customer to the brief.
- Prices are modeled by subject group and slide range, with USD, INR, and GEL display values.

## Product

- Students choose a medical subject group, subject, slide range, currency, and service mode.
- Students submit a topic, requirements, and delivery email.
- The order flow creates a one-time Whop hosted checkout under the configured company and provides a mail fallback when the payment connector is unavailable.
- The studio promise is presented as delivery within one hour after payment and brief review.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `WHOP_COMPANY_ID` identifies the Whop company receiving hosted checkout payments. The connected Whop integration can provide it automatically; the app creates one-time checkout plans per order and never fakes payment success.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
