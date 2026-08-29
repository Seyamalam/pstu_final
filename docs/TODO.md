# SheshHisab release checklist

## Current expansion pass

### Functionality

- [ ] Add favorite and recent recipients to web and native Send flows.
- [ ] Add amount- and note-prefilled QR payment requests and share links.
- [ ] Add a complete native request-money lifecycle.
- [ ] Add notification inboxes with unread, read, and read-all states.
- [ ] Add organization creation, switching, membership, and audit history on web.
- [ ] Add simulated MFS, bank, and card rails on web.
- [ ] Add organization member removal with server-side role enforcement.
- [ ] Add scheduled transfers with cancellation and retry-safe execution.
- [ ] Add split bills with explicit contribution and settlement states.
- [ ] Add lightweight category budgets and progress views.
- [ ] Add password recovery and email verification when delivery credentials are configured.

### Experience and motion

- [ ] Standardize hierarchical, modal, and tab transitions across both clients.
- [ ] Add skeleton-to-content handoffs for wallet data.
- [ ] Add restrained payment success feedback and native haptics.
- [ ] Add clear QR detection, success, and failure feedback.
- [ ] Add continuity when switching personal and organization wallets.
- [ ] Polish loading, empty, offline, validation, and permission-denied states.
- [ ] Verify dark mode, large text, keyboard safety, reduced motion, and screen readers.
- [ ] Profile the native release build and remove motion that misses frame targets.

### Release proof

- [ ] Pass web lint, types, unit tests, and production build.
- [ ] Pass native types, unit tests, Expo Doctor, and production export/build.
- [ ] Pass Convex code generation and backend edge-case tests.
- [ ] Capture and review every native route on an Android emulator.
- [ ] Run the judge demo path three consecutive times without resetting data manually.
- [ ] Record a short fallback demo.
- [ ] Deploy Convex and Vercel production from the verified commit.

## Completed

- [x] Initialize Git, add the remote, and push `main`.
- [x] Review the challenge and hackathon rules.
- [x] Lock a modular-monolith architecture around one Convex backend.
- [x] Upgrade and verify Next.js 16.3.3 with Cache Components and Partial Prefetching.
- [x] Connect Better Auth email/password to Convex.
- [x] Restrict trusted origins and add server-side authorization to private operations.
- [x] Store balances and amounts as integer poisha.
- [x] Implement atomic, idempotent transfers and paired ledger entries.
- [x] Implement request creation, acceptance, decline, and cancellation.
- [x] Build responsive home, send, request, activity, receipt, scan, statements, and settings screens.
- [x] Add five-item bottom navigation for mobile web.
- [x] Add light/dark themes and reduced-motion behavior.
- [x] Add QR generation, strict QR parsing, camera scan, and manual fallback.
- [x] Preserve safe QR pay intent through sign-in.
- [x] Add statement analytics and seven-, thirty-, and ninety-day ranges.
- [x] Add receipt and statement PDF export.
- [x] Generate and apply the logo, favicon, PWA artwork, and native app icons.
- [x] Remove developer-oriented and test-oriented copy from product screens.
- [x] Install and apply the requested design and animation skills.
- [x] Add the Expo SDK 57 application with PanelUI.
- [x] Add native Home, Activity, Scan, and Settings tabs.
- [x] Share the existing Better Auth and Convex backend with native.
- [x] Store native auth state in SecureStore.
- [x] Add native camera scanning and personal QR display.
- [x] Add biometric transfer confirmation when the device supports it.
- [x] Reuse idempotency keys for unchanged native transfer retries.
- [x] Add native statements, analytics, receipts, PDF generation, and sharing.
- [x] Cover money rules, auth redirects, QR parsing, biometric decisions, PDF escaping, and payment-intent retries with tests.
- [x] Pass web lint, types, tests, and production build.
- [x] Pass native types, 17 tests, 21 Expo Doctor checks, dependency checks, and all-platform production export.
- [x] Deploy Convex production functions and indexes.
- [x] Connect the GitHub repository to Vercel.
- [x] Deploy and alias the production web app at `https://sheshhisab.vercel.app`.
- [x] Verify the production landing page, auth endpoint, QR redirect, and security headers.
- [x] Push every completed milestone to GitHub.

## Physical-device release gate

These checks require a real iOS or Android device and should be completed before distributing a binary:

- [ ] Sign up, sign in, sign out, and restore a session after relaunch.
- [ ] Open an HTTPS payment link and a `sheshhisab://pay/v1/...` deep link.
- [ ] Grant, deny, and re-grant camera permission.
- [ ] Scan a valid code and reject a foreign or malformed code.
- [ ] Confirm a transfer with Face ID, Touch ID, or Android biometrics.
- [ ] Cancel biometric confirmation and verify that no transfer occurs.
- [ ] Retry after an uncertain connection and verify one receipt and one balance change.
- [ ] Export and share a receipt PDF and a statement PDF.
- [ ] Check light/dark mode, large text, VoiceOver, and TalkBack.

## Demo readiness

- [x] Production URL opens without authentication.
- [x] GitHub `main` matches the deployed source.
- [x] No secret or local environment file is tracked.
- [x] Web and native setup commands are documented.
- [ ] Create two judge accounts through the normal sign-up flow.
- [ ] Run the complete demo path three times on the venue network.
- [ ] Record a short local fallback demo.
- [ ] Stop development at the organizer's announced code-freeze time.
