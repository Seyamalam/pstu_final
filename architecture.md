# SheshHisab architecture

## Why this architecture

SheshHisab uses two thin clients over one transactional backend. The web app, native app, auth integration, and wallet domain stay in a single repository, while Convex owns persistence, authorization-sensitive business rules, real-time queries, and atomic mutations. This keeps the system small enough to explain and change quickly without weakening the money-movement invariants.

```mermaid
flowchart LR
    U[User]
    W[Next.js 16.3 PWA<br/>Vercel]
    M[Expo React Native<br/>iOS / Android]
    A[Better Auth<br/>email + password]
    C[Convex<br/>queries · mutations · HTTP]
    D[(Convex database)]
    E[Vercel auth-email relay<br/>Brevo SMTP]
    P[Web Push / Expo Push]

    U --> W
    U --> M
    W --> A
    M --> A
    W <--> C
    M <--> C
    A <--> C
    C <--> D
    C -->|Bearer-authenticated payload| E
    E -->|reset / verification email| U
    C --> P
    P --> W
    P --> M
```

## Repository layout

```text
pstu_final/
├── sheshhisab/              Next.js web/PWA
│   ├── src/app/             routes, manifest, loading boundaries
│   ├── src/components/      product UI and motion primitives
│   ├── src/lib/             auth, PWA, formatting, validation helpers
│   ├── convex/              schema and backend functions
│   └── public/              service worker and static assets
├── mobile/                  Expo application
│   ├── app/                 Expo Router routes
│   ├── components/          PanelUI application components
│   ├── lib/                 auth, biometric, QR, rail, PDF helpers
│   └── tests/               native domain and routing tests
├── challenge.md             challenge brief
└── National_Hackathon.md    event rules
```

## Client responsibilities

The clients own presentation, input affordances, local loading state, and platform capabilities. They do not decide whether money may move.

- Next.js renders the landing page, auth UI, responsive wallet shell, PWA installation, Web Push controls, camera QR scanning, analytics, and print views.
- Expo renders native tabs, native camera scanning, biometric confirmation, simulated external rails, organization management, and PDF sharing.
- Both clients generate an idempotency key for a stable user intent and submit normalized-looking input to Convex. The backend normalizes and validates it again.

## Backend responsibilities

Convex is the domain boundary:

- maps the Better Auth identity to a SheshHisab user;
- authorizes every query and mutation;
- stores money as signed 64-bit integer poisha;
- applies wallet-role permissions;
- validates balances, limits, state transitions, and idempotency;
- commits balances, transfer records, ledger entries, and inbox events atomically;
- schedules future transfers and re-checks access and funds at execution time;
- tracks category spending inside the same transaction as a categorized payment;
- records immutable organization membership audit events;
- serves indexed real-time queries to both clients;
- stores and revokes notification endpoints.

## Transfer write path

```mermaid
sequenceDiagram
    actor User
    participant Client as Web or Expo client
    participant Auth as Better Auth
    participant Mutation as Convex transfer mutation
    participant DB as Convex database

    User->>Client: Confirm payment
    Client->>Auth: Read authenticated session
    Client->>Mutation: recipient, amountPoisha, note, idempotencyKey
    Mutation->>DB: Resolve identity, active wallet, and recipient
    Mutation->>DB: Find sender + idempotency key
    alt Existing matching intent
        DB-->>Mutation: Existing transfer
        Mutation-->>Client: Existing receipt
    else New intent
        Mutation->>Mutation: Validate amount, permissions, limits, balance
        Mutation->>DB: Insert transfer
        Mutation->>DB: Update sender and recipient balances
        Mutation->>DB: Insert debit and credit ledger entries
        Mutation->>DB: Insert notification events
        DB-->>Mutation: Commit one transaction
        Mutation-->>Client: Receipt
    end
```

Convex mutations are transactional. If validation fails or a write throws, the mutation commits none of its writes. Concurrent writes that touch the same account are resolved against current database state, so the committed balance and its ledger entry remain consistent.

## Core data model

```mermaid
erDiagram
    USERS ||--|| ACCOUNTS : owns_personal
    USERS ||--o{ WALLET_MEMBERSHIPS : joins
    ACCOUNTS ||--o{ WALLET_MEMBERSHIPS : grants_access
    USERS ||--o{ TRANSFERS : sends
    USERS ||--o{ TRANSFERS : receives
    TRANSFERS ||--|{ LEDGER_ENTRIES : posts
    ACCOUNTS ||--o{ LEDGER_ENTRIES : records
    USERS ||--o{ MONEY_REQUESTS : requests
    USERS ||--o{ MONEY_REQUESTS : pays
    ACCOUNTS ||--o{ EXTERNAL_RAIL_TRANSACTIONS : uses
    EXTERNAL_RAIL_TRANSACTIONS ||--|| EXTERNAL_RAIL_LEDGER_ENTRIES : posts
    USERS ||--o{ NOTIFICATION_ENDPOINTS : registers
    USERS ||--o{ NOTIFICATION_INBOX : receives
    USERS ||--o{ FAVORITE_RECIPIENTS : saves
    ACCOUNTS ||--o{ SCHEDULED_TRANSFERS : funds
    ACCOUNTS ||--o{ BUDGETS : controls
    ACCOUNTS ||--o{ ORGANIZATION_AUDIT_EVENTS : records
    USERS ||--o{ SPLIT_BILLS : creates
    SPLIT_BILLS ||--o{ SPLIT_PARTICIPANTS : assigns
    SPLIT_BILLS ||--o{ SPLIT_CONTRIBUTIONS : collects
    TRANSFERS ||--o| SPLIT_CONTRIBUTIONS : proves

    USERS {
      string tokenIdentifier
      string handleNormalized
      id activeAccountId
    }
    ACCOUNTS {
      string kind
      int64 balancePoisha
      string currency
    }
    TRANSFERS {
      string publicId
      string idempotencyKey
      int64 amountPoisha
      string category
    }
    LEDGER_ENTRIES {
      string direction
      int64 amountPoisha
      int64 balanceAfterPoisha
    }
    MONEY_REQUESTS {
      string status
      int64 amountPoisha
    }
    WALLET_MEMBERSHIPS {
      string role
    }
    SCHEDULED_TRANSFERS {
      int64 amountPoisha
      number executeAt
      string status
      string idempotencyKey
    }
    BUDGETS {
      string category
      int64 limitPoisha
      int64 spentPoisha
    }
    SPLIT_BILLS {
      int64 totalPoisha
      string status
      string idempotencyKey
    }
    SPLIT_PARTICIPANTS {
      int64 sharePoisha
      int64 contributedPoisha
      string status
    }
```

## Authorization model

```mermaid
flowchart TD
    I[Authenticated identity] --> U[Resolve current user]
    U --> K{Wallet kind}
    K -->|Personal| O[Owner access]
    K -->|Organization| R{Membership role}
    R -->|Owner / Admin| MG[Manage members]
    R -->|Owner / Admin / Treasurer| MM[Move money]
    R -->|Viewer| RO[Read only]
    MG --> MM
    O --> MM
```

Client-side disabled buttons improve usability, but the Convex function repeats the permission check. A forged request therefore cannot bypass wallet membership, ownership, or role rules.

## Reliability invariants

1. Amounts are positive integer poisha and never JavaScript floating-point currency values.
2. A transfer has exactly one debit and one matching credit ledger entry.
3. The sender balance cannot become negative.
4. A sender/idempotency-key pair identifies one intent; reusing it with different details is rejected.
5. A money request follows an explicit pending → paid, declined, or cancelled transition.
6. External rails produce their own immutable transaction and ledger records.
7. Raw MFS, bank, and card references are not stored; only a masked value and keyed fingerprint are persisted.
8. Receipt lookup returns data only to an authorized transfer participant.
9. Scheduled execution re-checks wallet access and available funds immediately before transfer.
10. Categorized spend updates its active budget in the same mutation as the ledger write.
11. Organization membership changes append audit events that normal product operations never rewrite.
12. A split contribution posts a normal transfer, receipt, contribution row, and participant progress atomically.
13. A split settles only after every participant has paid their exact share.

## Read path and scaling

```mermaid
flowchart LR
    Q[Client query] --> AU[Authenticate]
    AU --> IX[Indexed lookup]
    IX --> PR[Project bounded result]
    PR --> RT[Convex realtime subscription]
    RT --> UI[Minimal client update]
```

- Activity uses sender/recipient plus creation-time indexes and pagination.
- Handle search uses the normalized-handle index and bounded results.
- Receipts use a public-ID index plus participant authorization.
- Memberships and organization roles use compound indexes.
- Rail history and ledger reads are scoped by account and creation time.
- Favorites, schedules, budgets, inbox state, and organization audit reads begin from compound indexes.
- Limits prevent unbounded lists and oversized organization membership sets.

Ten million users do not require ten million records to be scanned; the hot paths begin from an authenticated user, handle, public ID, account ID, or compound index.

## Performance design

### Web

- Next.js 16.3 App Router with Cache Components and partial prefetching
- Server layout resolves the auth token before authenticated Convex queries start
- Route-level loading boundaries keep navigation responsive
- React Compiler reduces unnecessary component work
- Client code is split by route; links use Next.js prefetch behavior
- PWA service worker caches the application shell and static assets
- Native View Transition styling is short and disabled for reduced motion

### Native

- Expo Router route splitting and native tabs
- PanelUI imported through component subpaths to avoid Metro loading the full library export graph
- PanelUI loaders and input animation run on the UI thread and respect reduced-motion settings
- Convex queries begin concurrently and stream updates instead of polling
- Lists use `FlatList` with bounded pages
- Safe-area handling is centralized in shared layout components

## Security boundaries

```mermaid
flowchart LR
    IN[Untrusted input] --> N[Normalize + validate]
    N --> AUTH[Identity + wallet authorization]
    AUTH --> LIMIT[Rate and domain limits]
    LIMIT --> TX[Atomic mutation]
    TX --> SAFE[Masked response / receipt]
```

- Better Auth manages email/password sessions; secrets are not stored in application tables.
- Better Auth owns reset and verification tokens. Convex sends a bounded payload to a private Vercel route using a shared bearer secret; that route delivers through Brevo SMTP over TLS.
- SMTP credentials exist only in encrypted Vercel environments, while Convex stores only the relay URL and bearer secret.
- Redirect targets and native notification routes are allowlisted.
- Security headers deny framing, prevent MIME sniffing, constrain referrers, and limit browser permissions.
- Push subscriptions are user-scoped and revocable.
- Rail references are HMAC-SHA-256 fingerprinted using a server-side pepper.
- Sensitive decisions live in Convex functions, not UI state.

## Deployment topology

```mermaid
flowchart TB
    GH[GitHub main]
    V[Vercel production<br/>Next.js + PWA]
    ED[Vercel auth-email route<br/>Brevo SMTP]
    CD[Convex dev<br/>stoic-akita-240]
    CX[Convex production<br/>lovely-dolphin-835]
    LC[Local EAS CLI build]
    GR[GitHub Release APK]
    AND[Android / iOS devices]

    GH --> V
    V --> ED
    CD --> ED
    CX --> ED
    GH --> CX
    GH --> LC
    LC --> GR
    V <--> CX
    GR --> AND
    AND <--> CX
```

The deployed web app is [sheshhisab.vercel.app](https://sheshhisab.vercel.app). Web and native environments point to the same production Convex deployment so a payment made on one client appears on the other in real time. Development and production Convex deployments use the same authenticated mail-relay contract, but keep their other deployment state separate.

Android release builds run locally with EAS CLI and the remote release
keystore. The resulting signed APK is verified locally, uploaded as a GitHub
Release asset, and linked from the README. There is no GitHub Actions build
path.

## Notification path

```mermaid
sequenceDiagram
    participant Domain as Convex domain mutation
    participant Inbox as Notification inbox
    participant Delivery as Scheduled push action
    participant Endpoint as Web Push or Expo/FCM
    participant Client as Web PWA or Android app

    Domain->>Inbox: Insert user-scoped event
    Domain->>Delivery: Schedule delivery after commit
    Delivery->>Inbox: Resolve active endpoints
    Delivery->>Endpoint: Send title, body, and allowlisted route
    Endpoint-->>Client: Display system notification
    Client->>Inbox: Open inbox or mark read
```

Inbox state is the durable source of truth. Push is an optional delivery
channel: permission denial, an offline device, or an expired endpoint never
loses the in-app event.

## Testing strategy

- Convex tests cover money validation, transfer idempotency, concurrency-sensitive balance behavior, request transitions, QR handling, rail limits, membership authorization, receipts, and notifications.
- Web tests cover client-side parsing, redirects, PWA capability decisions, notification routing, and UI helpers.
- Native tests cover biometric decisions, intent reuse, QR parsing, rail normalization, PDF escaping, notification deep links, and wallet routes.
- Type checking and production builds run for both clients.
- Native visual QA runs on an Android emulator with screen-by-screen screenshots and safe-area inspection.
