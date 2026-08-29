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

- Email/password account creation, sessions, password reset, and email verification
- Live wallet balance and pending requests
- Send and request flows with atomic mutations
- QR generation and browser camera scanning
- Activity history, date-range analytics, and statements
- Participant-only receipts and print-to-PDF export
- Responsive five-item mobile navigation
- Installable PWA with an offline fallback and home-screen shortcuts
- Browser notification controls with permission and feature checks
- Personal/organization wallets, simulated Bangladesh rails, favorites, scheduling, budgets, and split bills
- Light/dark themes, reduced motion, and generated brand artwork

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
NEXT_PUBLIC_VAPID_PUBLIC_KEY # optional until remote push delivery is connected
```

### Convex environment

```text
BETTER_AUTH_SECRET
SITE_URL
RAIL_REFERENCE_PEPPER
PUSH_VAPID_SUBJECT        # optional until Web Push delivery is enabled
PUSH_VAPID_PUBLIC_KEY     # optional until Web Push delivery is enabled
PUSH_VAPID_PRIVATE_KEY    # optional until Web Push delivery is enabled
EXPO_ACCESS_TOKEN         # optional; required for authenticated Expo Push delivery
AUTH_EMAIL_RELAY_URL      # deployed HTTPS /api/internal/auth-email endpoint
AUTH_EMAIL_RELAY_SECRET   # shared bearer secret, 32+ characters
```

Set server-only values with `bunx convex env set NAME VALUE`. Never expose them through a `NEXT_PUBLIC_*` variable or commit them.

The Vercel deployment owns the SMTP connection and requires these encrypted variables:

```text
AUTH_EMAIL_RELAY_SECRET
BREVO_SMTP_HOST
BREVO_SMTP_PORT
BREVO_SMTP_USER
BREVO_SMTP_PASSWORD
AUTH_EMAIL_FROM           # verified Brevo sender
```

Reset and verification screens are always available. Better Auth creates the short-lived action token, Convex calls the bearer-protected relay, and the relay sends through Brevo using TLS. Existing sign-ins are not gated on verification.

Web Push uses VAPID credentials in Convex. The PWA settings screen registers an
authenticated browser subscription with `notifications.registerEndpoint`;
Convex then delivers inbox events through the Web Push endpoint and revokes
expired subscriptions.

## PWA cache policy

The service worker caches the offline page, brand icons, and immutable
`/_next/static/` files. It always sends page navigations to the network and
uses the offline page only when navigation fails. It never stores auth API
responses, Convex traffic, wallet pages, receipts, statements, balances, or
transaction data.

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
src/lib/pwa.ts                   web push capability and payload helpers
public/sw.js                     narrow static cache and notification handling
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

Before a demo, run the four checks above, confirm the production auth-session endpoint returns successfully, and rehearse send, request, QR, receipt, statement, and password-recovery flows with two normal accounts.
