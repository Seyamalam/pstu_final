# SheshHisab feature map

SheshHisab is a closed-loop BDT wallet with a responsive Next.js PWA and an Expo app sharing one Convex backend. All balances and payment rails are simulated as required by the challenge.

## Core wallet

- Email/password account creation and sign-in with Better Auth
- First-time wallet onboarding with a unique handle
- BDT personal wallet with an opening balance
- Send money by handle with an optional note
- Request money and accept, decline, or cancel a request
- Retry-safe request creation and payment acceptance
- Favorite recipients for fast repeat payments
- Search users by normalized handle
- Real-time balances and activity through Convex subscriptions
- Stable payment receipts with public receipt IDs
- Separate debit and credit ledger entries for each transfer
- Idempotent payment submission so a retry cannot create a second transfer
- Server-side amount, balance, note, handle, and permission validation
- Rate limits on transfers, requests, external rails, and organization changes

## QR payments

- Personal payment QR generation
- Camera-based QR scanning on web and native
- Manual handle or QR-link fallback on web
- Strict QR payload and allowed-origin validation
- Scanned recipient handoff directly into the Send flow
- Amount- and note-prefilled request QR codes in the native app
- Cross-platform amount- and note-prefilled payment links on web

## Activity, receipts, and insights

- Recent activity on the dashboard
- Paginated transfer history
- Incoming and outgoing payment states
- Receipt detail with sender, recipient, amount, note, date, and proof state
- 30-day statement with money in, money out, net movement, and transaction count
- Daily movement visualization on web
- PDF export for receipts and statements on native
- Print-ready receipt and statement views on web

## Personal and organization wallets

- Personal wallet plus multiple organization wallets
- Fast active-wallet switching
- Organization creation with a unique handle
- Owner, admin, treasurer, and viewer roles
- Role-aware payment and member-management permissions
- Add or update members by handle
- Member and wallet limits enforced by the backend
- Member removal with owner/admin rules and an immutable organization audit trail

Organization creation, switching, and member management are available on both clients. Audit history is enforced and queryable in the shared backend.

## Simulated Bangladesh money rails

- Add money from bKash, Nagad, Rocket, Upay, supported Bangladeshi banks, Visa, and Mastercard
- Withdraw to mobile wallets, banks, and cards
- Masked external account or mobile references
- HMAC fingerprints instead of storing raw payment references
- Per-operation idempotency, wallet balance caps, and daily rail limits
- Dedicated external-rail transaction and ledger records

These rails are available on both clients and are deliberately simulated; no real bank, MFS, or card network is contacted.

## Planning and controls

- Scheduled transfers with server-side execution, cancellation, access re-checks, and retry safety
- Category budgets with atomic spend tracking on categorized transfers
- Bounded favorite-recipient lists
- Organization membership audit events
- Split bills with partial contributions, receipts, and guarded settlement

## Native app

- Expo SDK 57 and React Native 0.86
- PanelUI components with native-thread loading animation and reduced-motion handling
- Native bottom tabs for Home, Activity, Scan, Inbox, and Settings
- Safe-area-aware phone layouts
- Biometric or device-credential confirmation before sends and withdrawals
- Native push-notification registration and notification deep links
- Native notification inbox with unread and read-all states
- Native request creation, request QR sharing, and request settlement
- Favorite/recent recipients, scheduled transfers, budget progress, and split bills
- Organization member removal and audit history
- Light and dark themes
- Shareable PDF documents
- Two-step first-run onboarding

## Web app and PWA

- Next.js 16.3 App Router
- Responsive desktop and bottom-tab mobile layouts
- Installable manifest and service worker
- Web Push subscription management
- Web notification inbox with unread states
- Web personal/organization wallet switching and member management
- Web simulated MFS, bank, and card rails
- Password reset and email verification through Better Auth and the protected Brevo SMTP relay
- Camera QR scanning where the browser supports `BarcodeDetector`
- Light and dark themes
- Native View Transition styling with reduced-motion fallback
- Cache Components, partial prefetching, React Compiler, and Turbopack-ready scripts
- Security headers for framing, MIME sniffing, referrers, and browser permissions

## Reliability and security

- Integer poisha amounts; no floating-point money arithmetic
- Atomic Convex mutations for balance and ledger writes
- Indexed idempotency keys for transfer and rail retry safety
- Indexed idempotency keys for requests and scheduled transfers
- Explicit request-state transitions
- Authentication checked inside backend functions
- Organization membership and role checks inside backend functions
- Indexed handle, receipt, history, membership, and notification lookups
- Deep-link allowlisting for native notifications
- Safe redirect validation after web authentication
- Payment reference masking and keyed hashing
- Push endpoint registration and revocation

## Platform coverage

| Capability | Web/PWA | Expo app | Shared backend |
| --- | :---: | :---: | :---: |
| Email/password auth | ✓ | ✓ | ✓ |
| First-time onboarding | ✓ | ✓ | ✓ |
| Send by handle | ✓ | ✓ | ✓ |
| Request lifecycle | ✓ | ✓ | ✓ |
| QR generate/scan | ✓ | ✓ | ✓ |
| Receipts | ✓ | ✓ | ✓ |
| Statements | ✓ | ✓ | ✓ |
| PDF/print export | Print | PDF | — |
| Organization wallets | ✓ | ✓ | ✓ |
| Simulated MFS/bank/card rails | ✓ | ✓ | ✓ |
| Notification inbox | ✓ | ✓ | ✓ |
| Favorites | ✓ | ✓ | ✓ |
| Scheduled transfers | ✓ | ✓ | ✓ |
| Category budgets | ✓ | ✓ | ✓ |
| Split bills | ✓ | ✓ | ✓ |
| Organization audit/removal | ✓ | ✓ | ✓ |
| Password recovery | ✓ | ✓ | Better Auth + Brevo |
| Biometric payment confirmation | — | ✓ | — |
| Push notifications | ✓ | ✓ | ✓ |
| Installable app | PWA | Native | — |
| Light/dark theme | ✓ | ✓ | — |

## Demo path

1. Create two accounts and finish wallet onboarding.
2. Generate or scan a payment QR.
3. Send money and open the resulting receipt.
4. Retry the same payment intent and show that it resolves to the original transfer.
5. Create and settle a money request on web.
6. Add simulated funds from bKash in the native app.
7. Create an organization wallet, add a treasurer, and switch wallet context.
8. Export a statement or receipt and enable payment alerts.
