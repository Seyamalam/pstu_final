# SheshHisab web

Next.js client for the SheshHisab closed-loop BDT wallet.

- Production: `https://sheshhisab.vercel.app`
- Backend: Convex with Better Auth
- Native client: `../mobile`
- Full architecture and release plan: `../docs/PROJECT_PLAN.md`

## Stack

- Next.js 16.3.3 and React 19.2.8
- React Compiler, Cache Components, Partial Prefetching, and partial prerendering
- Convex 1.45 with Better Auth 1.6.30
- Tailwind CSS 4, shadcn/Base UI, Motion, and BeUI-derived primitives
- Bun 1.4, Biome, TypeScript, and Vitest

## Features

- Email/password account creation and sessions
- Live wallet balance and pending requests
- Send and request flows with atomic mutations
- QR generation and browser camera scanning
- Activity history, date-range analytics, and statements
- Participant-only receipts and print-to-PDF export
- Responsive five-item mobile navigation
- Light/dark themes, reduced motion, PWA metadata, and generated brand artwork

## Architecture

```text
Next.js App Router
  ├─ server-rendered public and route shells
  ├─ same-origin /api/auth/* proxy
  └─ focused Convex client screens
                │
                v
        Better Auth + Convex
  auth, authorization, validation,
  atomic transfers, requests, receipts,
  statements, and reactive data
```

Convex is the transaction boundary and the only application database. Transfer mutations read the authenticated sender, validate the recipient and integer-poisha amount, check the stable idempotency key, update both balances, and write the transfer and paired ledger entries atomically.

## Local setup

Prerequisites: Bun and access to a Convex deployment.

```bash
bun install
bunx convex dev
```

Configure the development Convex environment:

```bash
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set SITE_URL "http://localhost:3000"
```

Keep Convex running and start Next.js in another terminal:

```bash
bun dev
```

Open `http://localhost:3000`.

### Next.js environment

```text
CONVEX_DEPLOYMENT
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_CONVEX_SITE_URL
NEXT_PUBLIC_SITE_URL
```

### Convex environment

```text
BETTER_AUTH_SECRET
SITE_URL
```

Never expose `BETTER_AUTH_SECRET` through a `NEXT_PUBLIC_*` variable or commit it.

## Checks

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

The test suite covers amount and request rules, authenticated Convex integration paths, QR validation, and safe internal auth redirects.

## Important paths

```text
src/app/                         App Router pages and route shells
src/components/features/        wallet screens
src/components/motion/          source-owned interaction primitives
src/lib/auth-*.ts                Better Auth browser and server integration
src/lib/pay-link.ts              strict payment-link parsing
convex/schema.ts                 wallet tables and indexes
convex/lib/transfers.ts          shared transfer transaction logic
convex/transfers.ts              authenticated send mutation
convex/requests.ts               request state machine
convex/statements.ts             bounded statement analytics
convex/receipts.ts               participant-only receipt lookup
tests/                           unit and Convex integration tests
```

## Release

The Vercel project is linked to the repository and deploys `main` with `sheshhisab/` as its root directory. The production alias is `https://sheshhisab.vercel.app`.

Before a demo, run the four checks above, confirm the production auth-session endpoint returns successfully, and rehearse send, request, QR, receipt, and statement flows with two normal accounts.
