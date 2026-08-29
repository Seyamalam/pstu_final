# SheshHisab

**Fake funds. Real correctness.**

SheshHisab is a closed-loop BDT wallet built for the PSTU National Hackathon. A registered user gets ৳100,000 in simulated funds, then can send money by handle, request money, resolve requests, inspect activity, and verify a receipt against its ledger entries.

This project never moves real money. It has no bank, card, mobile financial service, or payment-gateway integration.

## Judge demo

1. Open `/` and continue to `/login`.
2. Create two users with distinct handles. `users.ensureCurrent` creates one wallet and one ৳100,000 opening balance per authenticated identity.
3. Send fake BDT from one handle to the other and open the resulting receipt.
4. Retry the same transfer with the same idempotency key. The backend returns the first receipt instead of charging twice.
5. Create a money request, sign in as the payer, then accept or decline it. A request can leave `pending` only once.
6. Inspect the receipt proof. Its debit and credit amounts match, and the ledger difference is zero.

For the engineering discussion, show [`convex/lib/transfers.ts`](convex/lib/transfers.ts) and [`convex/schema.ts`](convex/schema.ts). Those files contain the money movement rules and the indexes that keep lookups bounded.

## Architecture

```text
Browser
  |-- Next.js App Router pages and BeUI motion components
  |-- same-origin /api/auth/* proxy
  |-- Convex React client with a Better Auth token
          |
          v
Convex
  |-- Better Auth component: users, credentials, sessions, JWTs
  |-- wallet functions: onboarding, transfers, requests, receipts, activity
  `-- wallet tables: users, accounts, transfers, ledgerEntries, moneyRequests
```

Next.js renders the app and proxies authentication. Convex owns the auth data, wallet data, live queries, and transaction boundary. There is no second database, ORM, microservice, queue, or custom API server.

Main stack:

- Next.js 16.3.3, React 19.2.8, React Compiler
- Convex 1.45.0
- Better Auth 1.6.30 with `@convex-dev/better-auth` 0.12.5
- Tailwind CSS 4, shadcn, Base UI, Motion, and BeUI-derived components
- Bun 1.4 and Biome

Better Auth stays on 1.6.30 because the installed Convex adapter currently accepts Better Auth `>=1.6.11 <1.7.0`.

## Correctness and security

| Rule | Enforcement |
| --- | --- |
| No floating-point money | Every amount and balance is integer `poisha` stored as Convex `int64`. |
| No negative balance | `calculateTransferBalances` rejects an amount above the sender balance before writes occur. |
| Conservation | One mutation subtracts the amount from the sender and adds the same amount to the recipient. |
| Atomic commit | The transfer, both balances, and both ledger entries are written inside one Convex mutation. An accepted request updates in that same transaction. |
| Duplicate safety | `(senderId, idempotencyKey)` is indexed. The same intent returns its existing receipt; a different intent using that key fails. |
| Balanced receipt | A valid receipt must load exactly one matching debit and one matching credit for the transfer amount. |
| One request outcome | Only `pending` can transition to `paid`, `declined`, or `cancelled`. |
| Server-derived identity | Wallet functions derive the caller from the Convex auth token. They do not trust a client-supplied user ID. |
| Ownership checks | Only a payer can accept or decline a request, only a requester can cancel it, and only transfer participants can read a receipt. |
| Bounded reads | Dashboard lists use fixed limits, activity uses cursor pagination, and handle, account, receipt, transfer, and request lookups use indexes. |
| Abuse resistance | Better Auth rate-limits sign-in/sign-up, while Convex limits each user to 20 transfers and 10 request creations per minute. |

Better Auth uses email and password with an 8 to 128 character password policy. Auth requests stay on the application origin through `/api/auth/*`. The server accepts only the configured `SITE_URL` as a trusted origin. Keep `BETTER_AUTH_SECRET` in the Convex deployment environment, never in a public Next.js variable or source control.

## Local setup

Prerequisites are Bun and access to a Convex deployment.

```bash
bun install
bunx convex dev
```

The first `convex dev` run creates the local deployment entries in `.env.local`. Configure Better Auth on that Convex deployment:

```bash
bunx convex env set BETTER_AUTH_SECRET "$(openssl rand -base64 32)"
bunx convex env set SITE_URL "http://localhost:3000"
```

Keep Convex running, then start Next.js in a second terminal:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment names

Next.js `.env.local`:

```text
CONVEX_DEPLOYMENT
NEXT_PUBLIC_CONVEX_URL
NEXT_PUBLIC_CONVEX_SITE_URL
NEXT_PUBLIC_SITE_URL
```

Convex deployment environment:

```text
BETTER_AUTH_SECRET
SITE_URL
```

Set the production `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to the deployed application origin. Configure the Better Auth secret separately for each Convex deployment.

## Checks

```bash
# Pure money and request-state tests
bun test tests/backend-domain.test.ts

# Formatting and lint rules
bun run lint

# TypeScript
bunx tsc --noEmit

# Production build
bun run build
```

The domain suite checks integer conservation, insufficient-fund and overflow rejection, handle and note normalization, and terminal request states. The in-app Trust Lab exercises the deployed Convex mutations directly: five same-key calls must return one receipt, and two competing overspends must produce one commit and one rejection.

## Scale story

The ten-million-user scenario does not require a global user scan or balance counter.

- User, account, receipt, idempotency, and request access paths start from indexes.
- A transfer touches two accounts, one transfer record, and two ledger entries.
- Activity grows as append-only ledger entries and is cursor-paginated with a maximum page size of 50.
- Dashboard work is capped at five pending requests and eight recent entries.
- Data is partitionable by user or account because no global document receives a write for every payment.
- Convex retries conflicting mutations against fresh state, so concurrent spends cannot both commit from the same stale balance.

## Deliberate tradeoffs

- Funds are simulated and BDT-only.
- Email verification and password recovery are not included in the hackathon build.
- The product has no KYC, real payment rails, cash in or cash out, fees, refunds, disputes, or admin panel.
- Receipt IDs currently use the transfer's Convex ID. Access still requires the sender or recipient.
- Automated tests cover deterministic domain rules. End-to-end auth and concurrent mutation tests should follow before any production use.

## Folder map

```text
src/app/
  page.tsx                       landing page
  (auth)/login/page.tsx          email/password entry
  api/auth/[...all]/route.ts     same-origin Better Auth proxy
src/components/
  app/                           wallet, activity, receipt, and Trust Lab UI
  auth/                          accessible sign-in and signup form
  motion/                        BeUI-derived motion primitives
  providers/                     Convex and Better Auth provider
src/lib/
  auth-client.ts                 browser auth client
  auth-server.ts                 SSR and route helpers
convex/
  schema.ts                      wallet tables and indexes
  auth.ts, auth.config.ts        Better Auth and Convex JWT setup
  users.ts, viewer.ts            onboarding and current wallet
  transfers.ts, requests.ts      public money mutations
  dashboard.ts, activity.ts      bounded wallet reads
  receipts.ts                    participant-only receipt lookup
  lib/                           validation and transaction rules
tests/
  backend-domain.test.ts         money and request-state unit tests
```
