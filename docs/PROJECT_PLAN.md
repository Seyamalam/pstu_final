# SheshHisab project plan

## The call

Build a small closed-loop wallet for simulated BDT. A person can register, receive an opening balance of ৳100,000, send money, request money, accept or decline a request, and inspect a receipt.

The part judges should remember is the Trust Lab. It runs duplicate and concurrent payment attempts in front of them, then proves three facts:

- one intent creates one transfer, even when the client retries it;
- an account never spends below zero;
- every completed transfer debits and credits the same amount.

A polished wallet without this proof is easy to copy. The proof gives the engineering story a visible ending.

## Build status

The application lives in `sheshhisab/`. The core product is implemented and verified locally.

- Next.js 16.3.3 App Router with React 19.2.8, React Compiler, Cache Components, and Partial Prefetching
- Better Auth email/password sessions backed by Convex
- Convex wallet schema, atomic transfers, requests, receipts, activity, and per-user rate limits
- Tailwind CSS 4, shadcn/Base UI, and source-owned BeUI motion components
- Responsive landing, authentication, dashboard, send, request, activity, receipt, and Trust Lab routes
- Passing lint, typecheck, domain tests, Convex code generation, production build, desktop QA, and phone QA

Next.js 16.3.3 is the current stable release. Do not move to a 16.4 canary during the hackathon.

## Constraints from the brief

- The build window is six hours, 9:00 AM to 3:00 PM.
- Work must stop at 3:00 PM.
- The product must have a user-facing application, backend logic, and data storage.
- Fake money is required. Real bank, card, gateway, or financial-network integrations are out.
- Generic starters and UI libraries are allowed. The money-specific business logic must be built during the event.
- Judges may inspect the code and ask about architecture, concurrency, scale, algorithms, and future changes.
- Internet and third-party services may fail at the venue. The demo needs a local fallback and seeded data.

## Product position

### Product name

`শেষহিসাব` / `SheshHisab`

The name means the final account or settled balance. It fits shared meals, rent, trips, club costs, and small everyday debts.

### Primary user

A university student who needs to settle a shared expense with another person in under 20 seconds and wants proof that it worked once.

### Product promise

Move fake money once, see who received it, and keep a receipt that balances.

### The judge-facing line

"Most wallet demos show the happy path. SheshHisab shows what happens when the user double-clicks, the network retries, or two payments race for the same balance."

## Scope

### Must ship

1. Registration or a clear demo identity fallback.
2. Automatic opening balance of ৳100,000.
3. Dashboard with live balance, actions, pending requests, and recent activity.
4. Recipient lookup by unique handle.
5. Send flow with review, pending, success, and failure states.
6. Request flow with accept and decline.
7. Transfer receipt with sender, recipient, amount, note, time, and public receipt ID.
8. Activity list with sent, received, and request filters.
9. Idempotent transfer processing.
10. Atomic balance updates and paired ledger entries.
11. Trust Lab with a duplicate retry test and an overspend race test.
12. Responsive mobile and desktop UI.

### Ship if the core is stable by 1:30 PM

- QR or shareable payment request link.
- Receipt sharing through the Web Share API with copy fallback.
- Search and date filters on activity.
- English and Bangla label toggle.
- Installable PWA shell.

### Do not build today

- Real-money integrations.
- Cash in, cash out, bank links, cards, fees, exchange rates, or multiple currencies.
- Admin panels, disputes, refunds, recurring payments, notifications, or KYC.
- Microservices, queues, event buses, blockchain, or a separate API server.
- Full offline transfers. The app must never show a completed payment without a server commit.
- A global balance counter. It creates an unnecessary write hotspot.

## Product requirements

### Onboarding and identity

- A new authenticated user chooses a unique handle and display name.
- The backend creates one account with exactly `10_000_000n` poisha, equal to ৳100,000.00.
- Repeating onboarding for the same identity returns the existing user and account. It does not add funds again.
- Handles are case-insensitive and stored in normalized form.
- The demo can create deterministic judge accounts through the normal signup flow; no privileged seed endpoint is exposed.

Authentication uses Better Auth email/password through the official Convex adapter. Passwords must be 8 to 128 characters, auth endpoints are same-origin, trusted origins are restricted to `SITE_URL`, and sign-in/sign-up routes have database-backed rate limits. Email verification and password recovery remain explicit hackathon tradeoffs.

### Send money

- The sender searches for a recipient by handle.
- The amount accepts BDT with at most two decimal places and converts to integer poisha before it reaches the mutation.
- The sender cannot select themselves, send zero or a negative amount, send more than their balance, or submit an unknown recipient.
- A review screen shows the exact sender, recipient, amount, and note before confirmation.
- Confirmation creates one idempotency key for that payment intent.
- A retry with the same key returns the original receipt and does not move money again.
- Success appears only after the Convex mutation commits.
- Failure keeps the entered values and tells the user what to change.

### Request money

- A requester selects a payer, amount, and optional note.
- The payer sees the request on the dashboard.
- The payer can accept or decline once.
- Accepting a request performs the transfer and marks the request paid in the same mutation.
- Concurrent accept attempts produce one payment.
- A paid, declined, or cancelled request cannot return to pending.

### Activity and receipts

- Activity sorts newest first and uses cursor pagination.
- Each completed payment has one public receipt ID and two ledger entries.
- The receipt shows the sender's debit and recipient's credit as a balanced pair.
- The UI never calls a pending operation "sent" or "paid".

### Trust Lab

The Trust Lab is part of the product demo, not a developer console.

Test one sends the same ৳500 intent five times in parallel. Expected result:

- all calls resolve to one receipt ID;
- the sender loses ৳500 once;
- the recipient gains ৳500 once;
- two ledger entries exist for the transfer.

Test two starts two distinct sends, each worth about 70% of the same current balance. Expected result:

- one succeeds and one fails for insufficient funds;
- the sender never has a negative balance;
- total money across the involved accounts is unchanged.

The screen should show the before state, attempts, committed results, after state, and a plain explanation of what Convex serialized.

## Correctness contract

These invariants are more important than feature count.

1. Money uses integer poisha as `bigint`. Never use floating-point numbers for stored balances.
2. Every completed transfer has exactly one debit entry and one credit entry for the same amount.
3. A transfer either updates both accounts and writes its ledger entries, or writes nothing.
4. No account balance may be negative after a mutation.
5. The same sender and idempotency key identify one payment intent.
6. The sender and recipient must differ.
7. Only a pending request can be accepted, declined, or cancelled.
8. Only the intended payer can accept or decline a request.
9. Only the requester can cancel a request.
10. Opening funds are granted once per authenticated identity.

Convex mutations are atomic and serializable. Its optimistic concurrency control retries deterministic mutations when their read set changes. That handles two transfers racing on the same account. The application-level idempotency key handles repeated user intent and client retries.

## Architecture

Use a modular monolith. Next.js owns rendering and navigation. Convex owns identity-linked data, validation, authorization, transactions, and live updates.

```text
Browser
  |
  | Next.js route shells, client navigation, React UI
  v
Next.js App Router
  |
  | Convex React client, authenticated queries and mutations
  v
Convex functions
  |-- users and account lookup
  |-- transfer transaction
  |-- request state machine
  |-- activity and receipt queries
  `-- Trust Lab test calls
  |
  v
Convex database
  |-- users
  |-- accounts
  |-- transfers
  |-- ledgerEntries
  `-- moneyRequests
```

Do not put the money transfer inside a Next.js Server Action. A direct Convex mutation keeps the read, validation, debit, credit, ledger writes, and request update in one database transaction. It also gives the UI reactive balance and activity updates without another cache layer.

## Data model

### `users`

| Field | Type | Purpose |
| --- | --- | --- |
| `tokenIdentifier` | string | Stable authenticated identity |
| `handle` | string | Display handle |
| `handleNormalized` | string | Case-insensitive lookup key |
| `displayName` | string | Human name |
| `avatarSeed` | string | Deterministic local avatar color or initials |
| `createdAt` | number | Registration time |

Indexes:

- `by_tokenIdentifier`
- `by_handleNormalized`

### `accounts`

| Field | Type | Purpose |
| --- | --- | --- |
| `userId` | `Id<"users">` | One account owner |
| `balancePoisha` | bigint | Current available balance |
| `currency` | `"BDT"` | Closed single-currency system |
| `createdAt` | number | Account creation time |

Index: `by_userId`.

### `transfers`

| Field | Type | Purpose |
| --- | --- | --- |
| `publicId` | string | Shareable receipt reference |
| `idempotencyKey` | string | Stable key for one sender intent |
| `senderId` | `Id<"users">` | Debited user |
| `recipientId` | `Id<"users">` | Credited user |
| `amountPoisha` | bigint | Positive integer amount |
| `note` | string or undefined | Short payment reason |
| `requestId` | optional request ID | Source request when applicable |
| `createdAt` | number | Commit time |

Indexes:

- `by_senderId_and_idempotencyKey`
- `by_publicId`
- `by_senderId_and_createdAt`
- `by_recipientId_and_createdAt`

### `ledgerEntries`

| Field | Type | Purpose |
| --- | --- | --- |
| `transferId` | `Id<"transfers">` | Parent transfer |
| `accountId` | `Id<"accounts">` | Affected account |
| `direction` | `"debit"` or `"credit"` | Entry side |
| `amountPoisha` | bigint | Positive amount |
| `balanceAfterPoisha` | bigint | Receipt and audit snapshot |
| `createdAt` | number | Same logical transfer time |

Indexes:

- `by_transferId`
- `by_accountId_and_createdAt`

### `moneyRequests`

| Field | Type | Purpose |
| --- | --- | --- |
| `requesterId` | `Id<"users">` | Person asking for money |
| `payerId` | `Id<"users">` | Person expected to pay |
| `amountPoisha` | bigint | Requested amount |
| `note` | string or undefined | Reason |
| `status` | pending, paid, declined, or cancelled | State machine |
| `transferId` | optional transfer ID | Payment created on accept |
| `createdAt` | number | Creation time |
| `resolvedAt` | number or undefined | Terminal transition time |

Indexes:

- `by_payerId_and_status_and_createdAt`
- `by_requesterId_and_createdAt`

No unbounded arrays belong inside these documents.

## Backend contracts

### Public queries

- `viewer.get`: current user, account, and formatted capability flags.
- `users.search`: indexed handle lookup with a small result limit.
- `dashboard.get`: account summary, pending requests, and a short activity page in one consistent query where practical.
- `activity.list`: cursor-paginated sent and received transfers.
- `receipts.getByPublicId`: authorized receipt detail.
- `requests.list`: pending and resolved requests for the current user.

### Public mutations

- `users.ensureCurrent`: idempotent user and opening-account creation.
- `transfers.send`: validates and commits one transfer.
- `requests.create`: creates one pending request.
- `requests.accept`: commits payment and request transition together.
- `requests.decline`: pending to declined.
- `requests.cancel`: pending to cancelled.

Every public function validates all arguments and derives the caller from `ctx.auth.getUserIdentity()`. It must not trust a client-supplied sender ID.

### Transfer transaction order

1. Authenticate the caller.
2. Validate and normalize the amount, recipient, note, and idempotency key.
3. Query the sender's existing transfer by idempotency key. Return it if found.
4. Load sender, recipient, and account documents through indexes.
5. Reject self-transfer, missing recipient, invalid amount, or insufficient funds.
6. Insert the transfer.
7. Patch sender and recipient balances.
8. Insert paired ledger entries with balance snapshots.
9. Return the receipt payload.

Keep those operations in one mutation. Do not split them into actions or multiple client calls.

## Route and component plan

```text
src/
  app/
    layout.tsx                    metadata, fonts, providers
    page.tsx                      redirect or entry screen
    (auth)/sign-in/page.tsx       sign in or demo identity entry
    (wallet)/layout.tsx           persistent app shell and navigation
    (wallet)/dashboard/page.tsx   balance, actions, requests, activity
    (wallet)/send/page.tsx        recipient and amount form
    (wallet)/send/review/page.tsx confirmation state
    (wallet)/request/page.tsx     request form
    (wallet)/activity/page.tsx    paginated ledger activity
    (wallet)/receipt/[id]/page.tsx
    (wallet)/trust-lab/page.tsx
    error.tsx
    not-found.tsx
  components/
    wallet/app-shell.tsx
    wallet/balance-card.tsx
    wallet/money-input.tsx
    wallet/person-picker.tsx
    wallet/transaction-row.tsx
    wallet/request-card.tsx
    wallet/receipt-sheet.tsx
    wallet/trust-proof.tsx
    wallet/route-transition.tsx
    ui/...
  domain/
    money.ts                      parse, format, and invariant helpers
    request-status.ts             allowed request transitions
  lib/
    convex-client-provider.tsx
    auth.ts
    idempotency.ts
convex/
  schema.ts
  auth.config.ts                  only when real auth is selected
  users.ts
  dashboard.ts
  transfers.ts
  requests.ts
  receipts.ts
  seed.ts
  lib/auth.ts
  lib/money.ts
tests/
  money.test.ts
  transfer.integration.test.ts
  request.integration.test.ts
  trust-lab.test.ts
```

The route structure can collapse if time slips. Keep the component boundaries and use sheets inside the dashboard. Correctness matters more than proving that the router can make many pages.

## Next.js 16.3 plan

### Use now

- Keep `reactCompiler: true`.
- Enable `cacheComponents: true`.
- Enable `partialPrefetching: true`.
- Enable `typedRoutes: true` if the first build passes cleanly.
- Use static route shells and local skeletons around live Convex data.
- Use `<Link>` for app navigation so Next.js can prefetch route shells.
- Use `prefetch={true}` only for a small number of high-intent links. Do not prefetch every receipt in a long activity list.
- Add `loading.tsx` or focused Suspense boundaries so navigation paints a useful shell immediately.
- Use the Navigation Inspector in development and clear Instant Navigation warnings.
- Let Cache Components preserve recent route state with React Activity.
- Opt authenticated wallet pages out of instant-navigation validation because their client auth gate must resolve before live Convex queries run. Public routes retain the fast static/PPR path.

### Use carefully

The bundled Next.js 16.3.3 guide says React `<ViewTransition>` works in the App Router without a configuration flag. Use it as progressive enhancement.

- Morph the amount and recipient identity from review to receipt.
- Crossfade activity filters within the same route.
- Keep the app header and balance anchor still.
- Keep motion under 300 ms.
- Add `pointer-events: none` to the transition overlay.
- Disable positional motion for `prefers-reduced-motion`.
- The payment result must remain correct when a browser does not support view transitions.

Do not enable the older `experimental.viewTransition` flag unless the version-matched bundled docs or TypeScript types require it. The older web reference describes a previous integration path.

### Do not use for the sake of novelty

- Do not cache balances, pending requests, or receipts with `use cache`. Convex provides live authenticated data.
- Do not add Server Actions between the UI and Convex money mutations.
- Do not use optimistic balance updates. A pending animation is fine, but "sent" appears only after commit.
- Do not add experimental offline mutation replay. Show an offline message and preserve the draft.

## Visual direction

### Subject and page job

The subject is everyday Bangladeshi হিসাব, the running account people keep for meals, rent, rides, and shared purchases. The page's job is to make a money movement clear and verifiable in one glance.

### Palette

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#F6F8F7` | Main background |
| `ink` | `#102A33` | Text and strong controls |
| `rule` | `#C8D8D5` | Ledger lines and borders |
| `trust` | `#087A55` | Completed and verified states |
| `mark` | `#E0543E` | Ledger margin, destructive attention, one signature accent |
| `wash` | `#E7F0ED` | Selected and quiet surfaces |

This avoids the generic purple fintech dashboard. The red rule comes from a paper হিসাব খাতা. The green is reserved for a committed transfer, not general decoration.

### Type

- Display and Bangla: Anek Bangla variable.
- Body and controls: Noto Sans Bengali.
- Amounts, receipt IDs, and timings: Geist Mono, already installed through `next/font`.

Large amounts should use tabular numbers. Labels stay compact and literal. Use `টাকা পাঠান / Send money` once at the entry action, then keep later buttons short and consistent.

### Shape and spacing

- Mobile-first 4 px spacing base with 12, 16, 24, and 32 px steps.
- Cards use 14 px corners. Receipts use 6 px corners and a straight ledger edge.
- Inputs and primary buttons are at least 44 px tall.
- Desktop content maxes out near 1180 px. The wallet column stays readable rather than stretching.
- Borders and spacing carry hierarchy. Shadows are rare and soft.

### Signature element

The receipt opens into a two-line proof:

```text
Seyam      - ৳2,500.00     balance ৳97,500.00
Rafi       + ৳2,500.00     balance ৳102,500.00
             difference    ৳0.00  Verified
```

The two lines share one receipt ID. During review-to-receipt navigation, the amount and recipient move into this proof. This is the one memorable motion moment. Everything else stays quiet.

### Mobile wireframe

```text
+--------------------------------+
| শেষহিসাব             [avatar] |
| Available balance              |
| ৳ 100,000.00       [verified] |
|                                |
| [ Send money ] [ Request ]     |
|                                |
| Money requested from you       |
| Rafi needs ৳1,200  [Review]   |
|                                |
| Recent activity                |
| Jannat       -৳2,500   Today  |
| Tanvir       +৳1,200   Today  |
|                                |
| Home  Activity  Trust Lab      |
+--------------------------------+
```

### Desktop wireframe

```text
+--------------------------------------------------------------+
| শেষহিসাব   Home  Activity  Trust Lab              [avatar] |
|                                                              |
| +-------------------------+  +-----------------------------+ |
| | Available balance       |  | Requests                    | |
| | ৳ 100,000.00            |  | Rafi  ৳1,200  [Open]       | |
| | [Send] [Request]        |  | Jannat ৳700   [Open]       | |
| +-------------------------+  +-----------------------------+ |
|                                                              |
| Recent activity                                              |
| ------------------------------------------------------------ |
| Jannat      Shared lunch       -৳2,500          Completed    |
| Tanvir      Trip settlement    +৳1,200          Completed    |
+--------------------------------------------------------------+
```

## Speed plan

### User-visible targets

- A tap changes the UI within 100 ms through a route shell, pressed state, or pending label.
- Warm client navigation paints the destination shell immediately.
- The dashboard stays interactive while live data resolves.
- Transfer confirmation disables duplicate clicks but retains the same idempotency key for a safe retry.
- Lists render 20 items per page and paginate. No unbounded `.collect()` calls.

### Bundle and rendering rules

- Keep pages and layouts as Server Components unless they need Convex hooks or browser interaction.
- Put `"use client"` at narrow provider and interactive component boundaries.
- Use Lucide icons by named imports.
- Do not add a chart library. The product does not need charts.
- Use CSS for the receipt proof and transitions.
- Use local initials and colors instead of remote avatar images.
- Build once by the halfway mark. A development server can hide production failures.

### Measurement

- Run `bun run build` and inspect route output.
- Use the Next.js Navigation Inspector on every primary route.
- Test production navigation, because automatic prefetching is production-only.
- Check a mobile viewport at 360 by 800 and desktop at 1440 by 900.
- Run Lighthouse only after the money flow passes. Do not tune a broken app.

## Failure and recovery behavior

| Failure | UI response |
| --- | --- |
| Offline before send | Keep the draft, disable confirm, say "Connection needed to send" |
| Network drops after confirm | Keep the intent key and offer "Check payment status" or safe retry |
| Insufficient balance | Keep recipient and note, focus amount, show available balance |
| Recipient missing | Return to recipient selection with the typed handle intact |
| Duplicate submit | Return the original receipt with "Already completed" |
| Request already handled | Refresh the request and show its terminal state |
| Unexpected server error | Keep the draft and show a request ID from logs when available |

Never show a generic "Something went wrong" if the user can act on the cause.

## Security boundary

- Treat every Convex public function as an internet-facing endpoint.
- Derive identity inside the function. Never authorize from a client-supplied user ID.
- Validate all arguments, string lengths, amount bounds, and state transitions.
- Keep seed and Trust Lab reset functions internal or development-only.
- Escape notes through React's normal text rendering. Do not render user HTML.
- Do not log auth tokens or full personal data.
- Add a visible "Simulated funds" label so no one mistakes the demo for a real financial service.

If the demo identity fallback is used, say plainly that authentication is mocked and is outside the judged money-consistency core. Do not describe it as secure login.

## Test plan

### Domain tests

- BDT string to poisha parsing and formatting.
- Reject zero, negative, excessive precision, too-large values, and malformed input.
- Request state transitions.
- Paired ledger entries sum to zero.

### Mutation tests

- Opening funds are issued once.
- A normal transfer updates both balances and writes two entries.
- Insufficient funds write nothing.
- Self-transfer writes nothing.
- Reusing an idempotency key returns one transfer.
- Two concurrent overspend attempts never produce a negative balance.
- Request acceptance writes one transfer and moves the request to paid.
- Concurrent request acceptance pays once.
- Unauthorized users cannot read or mutate another user's private data.

### UI checks

- Keyboard-only send and request flows.
- Focus moves to the error summary after a failed confirmation.
- Screen reader labels include amount direction and status.
- Reduced motion removes positional transitions.
- Long names, ৳999,999.99, empty activity, loading, offline, and error states fit on mobile.
- Back navigation preserves form input where Cache Components keeps the route active.

### Demo rehearsal

- Run the exact 90-second path three times without database cleanup.
- Confirm idempotency still works with existing records.
- Keep a local screen recording and screenshots as fallback evidence.
- Export or seed known demo state before the presentation.

## Scale explanation for judges

The ten-million-user scenario does not require ten million seeded rows. The design needs to avoid work proportional to all users.

- User, account, receipt, and request access uses indexes.
- Activity uses cursor pagination.
- Ledger entries live in their own table instead of growing arrays inside accounts.
- Transfers touch only the sender, recipient, transfer, and two ledger documents.
- There is no global counter or total-balance document on the write path.
- Concurrent writes to one account serialize through Convex optimistic concurrency control.
- A celebrity or merchant account could become hot at very high write volume. A later system could separate available balance reservations, partition history, and process external settlement asynchronously. That complexity is not justified for this closed six-hour build.

## Demo script

### 0 to 15 seconds

Open the dashboard on mobile width.

"This is SheshHisab, a closed BDT wallet. Every new user starts with ৳100,000 in simulated funds."

### 15 to 40 seconds

Send ৳2,500 to another user. Pause on review, confirm, and open the receipt proof.

"The debit, credit, and request state commit in one serializable mutation. We store money as integer poisha, not floats."

### 40 to 60 seconds

Open a pending ৳1,200 request and accept it.

"A request can reach a terminal state once. A concurrent second acceptance returns the completed result."

### 60 to 85 seconds

Open Trust Lab and run both tests.

"Five retries produced one receipt. Two racing overspends produced one success, one rejection, and no negative balance."

### 85 to 90 seconds

End on the verified zero-difference ledger.

"The UI is the demo. This proof is the product."

## Six-hour execution plan

| Clock | Outcome | Cut line |
| --- | --- | --- |
| 9:00 to 9:20 | Baseline, schema sketch, auth gate | Fall back to demo identity if auth keys are not ready |
| 9:20 to 10:10 | Transfer mutation and tests | No UI polish yet |
| 10:10 to 11:00 | Dashboard to send to receipt vertical slice | This must work before adding requests |
| 11:00 to 11:40 | Request state machine and UI | Cut cancel and filters first |
| 11:40 to 12:20 | Trust Lab and concurrency proof | Keep it plain if visual work slips |
| 12:20 to 1:10 | Visual system, responsive shell, activity | Cut optional sharing and QR |
| 1:10 to 1:45 | Instant navigation and one view transition | Remove motion before risking correctness |
| 1:45 to 2:15 | Tests, errors, accessibility, production build | No new product features after 2:00 |
| 2:15 to 2:35 | Deploy and verify local fallback | Local demo remains acceptable |
| 2:35 to 3:00 | Rehearse, screenshots, README, freeze | Stop active development at 3:00 |

## Remaining delivery decisions

The implementation is complete. Before public deployment, choose the final Vercel URL, set the production `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to that exact origin, and decide whether the hackathon submission needs a hosted demo or the documented local fallback.

## Reference links

- [Next.js 16.3 release and current news](https://nextjs.org/blog)
- [Next.js linking and navigation](https://nextjs.org/docs/app/getting-started/linking-and-navigating)
- [Next.js Link transition types](https://nextjs.org/docs/app/api-reference/components/link#transitiontypes)
- [Next.js Cache Components](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [Next.js Partial Prefetching](https://nextjs.org/docs/app/api-reference/config/next-config-js/partialPrefetching)
- [Next.js view transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- [Convex atomicity and optimistic concurrency control](https://docs.convex.dev/database/advanced/occ)
- [Convex Next.js App Router guide](https://docs.convex.dev/client/nextjs/app-router/)
- [Convex authentication overview](https://docs.convex.dev/auth/overview)
