# SheshHisab project plan

## Outcome

SheshHisab is a closed-loop BDT wallet for the PSTU National Hackathon. It gives each account an opening balance, then lets people send or request funds, pay from a QR code, inspect activity, export statements, and save receipts.

The product ships as two clients over one backend:

- a responsive Next.js web app at `https://sheshhisab.vercel.app`;
- an Expo React Native app in `mobile/`;
- one Convex deployment for authentication, wallet data, transactions, and live updates.

The experience should feel immediate and calm: short labels, clear next actions, no developer explanations in product screens, and motion that confirms state without delaying work.

## Constraints

- The challenge requires a closed ecosystem with simulated BDT, not real payment rails.
- Stored money must use integer poisha; floating point is never valid for balances.
- The user-facing app, business logic, and data storage must be demonstrable.
- The architecture must remain simple enough for the team to explain under judging.
- Development must stop at the organizer's code-freeze time.

## Product scope

### Shipped

- Better Auth email/password sign-up and sign-in.
- One idempotently-created wallet and opening balance per identity.
- Send by handle with review and safe retry.
- Request, accept, decline, and cancel flows.
- QR payment links, personal QR display, browser camera scanning, and native camera scanning.
- Face ID, Touch ID, or device-biometric confirmation before native transfers when available.
- Live balance, recent activity, pending requests, full history, and receipt lookup.
- Seven-, thirty-, and ninety-day statement summaries and daily analytics.
- Browser print-to-PDF statements and receipts; native PDF generation and sharing.
- Responsive bottom navigation on mobile web and native tabs in Expo.
- Light and dark themes, reduced-motion support, app icons, favicon, and PWA metadata.
- Personal and organization wallets with role-aware membership.
- Simulated Bangladesh MFS, bank, and card add-money/withdrawal flows.
- Favorites, scheduled transfers, category budgets, and split bills.
- Web and native notification inboxes with Web Push and Expo/FCM delivery.
- Better Auth email verification and password recovery through Brevo SMTP.

### Explicitly out of scope

- Real banks, cards, payment gateways, cash settlement, KYC, and real funds.
- Microservices, queues, event buses, or a second application database.
- Offline transfer completion. Success is shown only after a server commit.
- Admin panels, refunds, disputes, fees, recurring transfers, and multi-currency support.

## Primary flows

### First run

1. Create an account with email and password.
2. Choose a unique handle and display name.
3. Convex creates the wallet once and returns the current balance.
4. Enter the home screen.

### Send

1. Search for a handle or arrive from a validated QR link.
2. Enter BDT and an optional note.
3. Review the recipient and exact amount.
4. On native, confirm with the device biometric when available.
5. Submit one payment intent with a stable idempotency key.
6. Open the committed receipt.

### Request

1. Choose a payer, amount, and optional note.
2. The payer receives a live pending request.
3. The payer accepts or declines once.
4. Acceptance moves funds and closes the request in the same transaction.

### Scan

1. Request camera permission only after the user taps the scanner action.
2. Accept only the versioned SheshHisab scheme or the configured HTTPS origin.
3. Resolve the handle without moving funds.
4. Continue through the normal send and confirmation flow.

## Architecture

```text
Next.js web ───────┐
                   ├── Better Auth + Convex JWT
Expo mobile ───────┘            │
                                v
                        Convex functions
                     auth, validation, policy,
                     transactions, live queries
                                │
                                v
                         Convex database
```

This is a modular monolith. Next.js and Expo own presentation and navigation. Convex owns identity-linked data, authorization, mutation boundaries, and reactive reads. Better Auth data is stored in its Convex component. There is no custom REST layer between the clients and wallet functions.

### Web

- Next.js 16.3.3 App Router and React 19.2.8.
- React Compiler, Cache Components, Partial Prefetching, route loading states, and partial prerendering.
- Tailwind CSS 4, shadcn/Base UI, and source-owned BeUI motion primitives.
- Same-origin `/api/auth/*` proxy for Better Auth.

### Native

- Expo SDK 57 and React Native 0.86.
- Expo Router native tabs.
- PanelUI with the Grass theme.
- SecureStore-backed auth, Expo Camera, Local Authentication, Print, Sharing, and File System.

## Correctness contract

1. Balances and amounts are `bigint` integer poisha.
2. A completed transfer subtracts and adds the same amount.
3. The two balances, transfer, and paired ledger entries commit atomically.
4. No account may become negative.
5. `(sender, idempotencyKey)` identifies one immutable payment intent.
6. An unchanged client retry reuses its idempotency key.
7. A sender cannot pay themselves.
8. Only a pending request can change state.
9. Only the intended payer can accept or decline; only the requester can cancel.
10. A receipt is readable only by its sender or recipient.
11. QR parsing rejects unknown origins, versions, extra query fields, fragments, and malformed handles.
12. Client-provided user IDs are never trusted for authorization.

## Security model

- Every private query and mutation derives the caller from the verified auth token.
- Better Auth accepts only configured origins and passwords between 8 and 128 characters.
- Mobile auth tokens use SecureStore.
- Auth, transfer, and request actions are rate-limited.
- Receipt lookup returns the same not-found result for missing and unauthorized IDs.
- Redirect continuation accepts only internal `/app` paths.
- Security headers deny framing and unnecessary browser capabilities; camera is limited to the same origin.
- Secrets exist only in Convex or Vercel deployment environments and are not committed.
- Native biometrics are a local confirmation gate, not a replacement for server authorization.

## Performance plan

- Keep route shells server-rendered and client islands narrow.
- Prefetch only likely navigation targets and rely on Next.js partial prefetching.
- Use indexed Convex queries with fixed limits or cursor pagination.
- Avoid global counters and unbounded table scans.
- Keep interaction motion under 300 ms in normal UI, use transform and opacity, and honor reduced motion.
- Use native tabs and platform camera/biometric modules instead of web views.
- Keep PanelUI styling static so Uniwind can compile it efficiently.

## Verification gates

### Web

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
- phone and desktop visual pass in light and dark themes
- live landing, auth-session, redirect, and security-header checks

### Native

- `npm run typecheck`
- `npm test`
- `npx expo-doctor`
- `npx expo install --check`
- production export for iOS, Android, and web
- physical-device pass for camera, deep link, biometrics, PDF sharing, and dark mode before store distribution

## Demo path

1. Sign in and show the live balance.
2. Open Scan, show the personal QR, and scan it from the other client.
3. Review and confirm a transfer.
4. Open its receipt and export the PDF.
5. Show activity and the thirty-day statement chart.
6. Create and resolve a money request.
7. Briefly explain integer poisha, atomic mutation writes, and stable idempotency keys.

## Submission freeze

Version 1.0.0 is the submission scope. After the local signed-APK smoke flow,
full web/native checks, production deployment verification, and GitHub Release
upload pass, feature work stops. Any later work should begin on a post-hackathon
branch and must not alter the submitted tag.
