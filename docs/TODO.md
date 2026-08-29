# SheshHisab build checklist

## Working agreement

- Suggested mode: autonomous build with visible checkpoints after items 4, 8, and 11.
- Time budget: 315 minutes of planned work and 45 minutes of buffer.
- Git cadence: commit after each checkpoint, not after every tiny file.
- Stop adding product features at 2:00 PM.
- Keep the local demo working even if deployment fails.
- Core order: correctness, one complete flow, Trust Lab, visual polish, framework polish.

## Scope gates

- 20 minutes: if production auth is not connected, use the labeled demo identity picker. **Resolved:** Better Auth is connected.
- 90 minutes: if atomic transfer tests do not pass, stop all frontend work and fix them.
- 120 minutes: the dashboard to send to receipt path must work end to end.
- 180 minutes: if requests are incomplete, ship send money and Trust Lab first.
- 240 minutes: cut QR, sharing, localization, filters, and PWA work.
- 300 minutes: only demo fixes, documentation, and rehearsal remain.

## Checklist

- [x] **1. Protect the baseline**
  Plan ref: `PROJECT_PLAN.md > Build status`
  Estimate: 15 minutes
  What to build: Add the starter, challenge, rules, and planning files to Git. Record a clean baseline commit. Confirm `.env.local`, `.next`, and `node_modules` remain ignored.
  Acceptance: The repository contains no secrets and `git status` is clean after the commit.
  Verify: `git status --short`, `git diff --cached`, and `git log -1 --oneline`.

- [x] **2. Lock identity and demo state**
  Plan ref: `PROJECT_PLAN.md > Onboarding and identity`
  Estimate: 20 minutes
  What to build: Connect Better Auth email/password to Convex. Add idempotent user and account initialization with ৳100,000 and use normal signup to create judge demo accounts.
  Acceptance: Opening the same identity twice produces one user, one account, and one opening balance.
  Verify: Run initialization twice and inspect the user and account tables in Convex.

- [x] **3. Define the schema and money helpers**
  Plan ref: `PROJECT_PLAN.md > Data model` and `Correctness contract`
  Estimate: 25 minutes
  What to build: Add the five tables, indexes, validators, integer-poisha parser, formatter, and request-state helper. Keep reusable validation in `convex/lib` and pure display helpers in `src/domain`.
  Acceptance: Schema deployment passes. Valid BDT round-trips through poisha. Invalid amounts fail with named errors.
  Verify: `bunx convex dev --once`, `bun test tests/money.test.ts`, and `bun run lint`.

- [x] **4. Build and break the transfer mutation**
  Plan ref: `PROJECT_PLAN.md > Transfer transaction order`
  Estimate: 30 minutes
  What to build: Implement authenticated send with indexed recipient lookup, balance checks, idempotency, paired ledger entries, and receipt output in one mutation. Write the failure-path tests before UI work.
  Acceptance: Normal send, duplicate key, self-send, malformed amount, missing recipient, and insufficient funds all produce the specified database state.
  Verify: Run the transfer integration tests and inspect one transfer with its two ledger entries.

### Checkpoint 1

Show the team a passing duplicate-key test and one balanced transfer. If this is not solid, do not move on.

- [x] **5. Build the request state machine**
  Plan ref: `PROJECT_PLAN.md > Request money`
  Estimate: 25 minutes
  What to build: Implement create, accept, decline, and cancel. Acceptance must reuse the transfer helper inside the same mutation and set the request to paid atomically.
  Acceptance: Only allowed actors can change a pending request. Repeated or concurrent accepts create one transfer.
  Verify: Run request integration tests and inspect terminal states in Convex.

- [x] **6. Establish the visual system and app shell**
  Plan ref: `PROJECT_PLAN.md > Visual direction`
  Estimate: 25 minutes
  What to build: Replace starter metadata and fonts, map the six color tokens into Tailwind variables, create the responsive app shell, and add accessible desktop and mobile navigation.
  Acceptance: The app has no create-next-app content, works at 360 px and 1440 px, and has visible keyboard focus.
  Verify: `bun run lint`, manual keyboard pass, and screenshots at both target sizes.

- [x] **7. Complete the dashboard vertical slice**
  Plan ref: `PROJECT_PLAN.md > Product requirements`
  Estimate: 25 minutes
  What to build: Connect the Convex provider and render live balance, primary actions, pending request preview, recent activity, loading state, empty state, and offline label.
  Acceptance: Switching or signing into a seeded user updates all dashboard data without a reload.
  Verify: Change one balance through Convex and watch the dashboard update.

- [x] **8. Complete send, review, and receipt**
  Plan ref: `PROJECT_PLAN.md > Send money` and `Signature element`
  Estimate: 25 minutes
  What to build: Add recipient search, money input, review, stable intent key, pending state, safe retry, success receipt, and actionable failures.
  Acceptance: A user can send money in under 20 seconds. Double-clicking confirm creates one transfer. The receipt shows a zero ledger difference.
  Verify: Run the flow with normal, duplicate-click, offline-before-send, and insufficient-balance cases.

### Checkpoint 2

Demo dashboard to send to receipt on a phone-sized viewport. Record a short fallback clip. Commit the working vertical slice.

- [x] **9. Complete request handling**
  Plan ref: `PROJECT_PLAN.md > Request money`
  Estimate: 20 minutes
  What to build: Add request creation and payer review with accept and decline actions. Show status consistently on both users' screens.
  Acceptance: Accept moves money and marks paid once. Decline moves no money. Handled requests cannot be acted on again.
  Verify: Use two demo identities and run create, accept, and decline paths.

- [x] **10. Add activity and receipt lookup**
  Plan ref: `PROJECT_PLAN.md > Activity and receipts`
  Estimate: 25 minutes
  What to build: Add cursor-paginated activity, sent and received direction labels, receipt links, and authorized public-ID lookup.
  Acceptance: Activity stays newest first, paginates at 20, and never exposes a receipt to an unrelated user.
  Verify: Seed more than 20 transfers, paginate once, and test unauthorized receipt access.

- [x] **11. Build the Trust Lab**
  Plan ref: `PROJECT_PLAN.md > Trust Lab`
  Estimate: 25 minutes
  What to build: Add controlled duplicate and overspend race tests with before, attempts, committed results, after, and invariant proof. Keep seed or reset functions internal or development-only.
  Acceptance: Five duplicate calls show one receipt. Two racing ৳70,000 sends from ৳100,000 show one success, one rejection, no negative balance, and conserved funds.
  Verify: Run each test three times without manually cleaning the database.

### Checkpoint 3

Run the 90-second judge demo. If the proof is confusing, fix its copy before adding any more features.

- [x] **12. Make navigation instant and motion meaningful**
  Plan ref: `PROJECT_PLAN.md > Next.js 16.3 plan`
  Estimate: 25 minutes
  What to build: Enable Cache Components and Partial Prefetching, add route shells and Suspense boundaries, clear navigation warnings, then add the review-to-receipt amount morph and reduced-motion handling.
  Acceptance: Primary navigation paints useful UI immediately in a production build. Unsupported browsers get the same content without animation.
  Verify: Use the Navigation Inspector, test `bun run build && bun run start`, and run with reduced motion enabled.

- [ ] **13. Freeze, verify, deploy, and prepare the handoff**
  Plan ref: `PROJECT_PLAN.md > Test plan` and `Demo script`
  Estimate: 30 minutes
  What to build: Run lint, tests, production build, mobile QA, and the demo rehearsal. Update README with setup, architecture, invariants, tradeoffs, screenshots, and local fallback. Deploy only after the local build passes.
  Acceptance: Three unchanged demo passes complete within 90 seconds. The repository has no secrets or uncommitted code. The public URL or local fallback works after a fresh start.
  Verify: `bun run lint`, `bun test`, `bun run build`, `git status --short`, and a fresh browser rehearsal.

  Status: local freeze checks and browser rehearsal pass; production deployment and fallback recording remain.

## Parallel team lanes

If three people are available after item 3:

- Backend lane owns items 4, 5, mutation tests, and scale explanation.
- Frontend lane owns items 6, 7, 8, 9, and responsive states.
- Proof and delivery lane owns item 10, item 11, README, screenshots, deployment, and rehearsal.

Everyone joins item 12 only after the core flow works. One person should own each file at a time to avoid merge conflicts during the six-hour window.

If one person is building, follow the numbered order and cut item 9, then item 10 filters, before cutting Trust Lab.

## Final freeze checklist

- [ ] System clock is before 3:00 PM for the last code change.
- [ ] Main branch contains the final build.
- [x] No `.env` files or tokens are tracked.
- [ ] Demo users and seed instructions work.
- [x] Fake funds label is visible.
- [x] Send path works on mobile.
- [ ] Request accept path works, if included.
- [ ] Trust Lab passes twice without reset.
- [x] Production build passes.
- [x] Local demo command is written down.
- [ ] Public URL opens in a private browser window, if deployed.
- [ ] Screenshots and fallback recording are saved.
- [ ] Each teammate can explain integer poisha, idempotency, atomic mutations, OCC, indexes, and the main tradeoff.
