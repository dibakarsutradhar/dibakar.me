# TheGarageOS / Jemeti `core` — Codebase Writeup

> **Internal document — not for publication.**
> Repo: `/Users/dibakar/Downloads/Projects/thegarageos/core`
> Analysis date: 2026-10-02 · History span: 2026-05-08 → 2026-09-22 · 1,623 commits (44 merges)
> Purpose: source of truth for deriving CV bullets, LinkedIn material, and blog posts. Derived artifacts may name the product openly (per owner decision, 2026-10-02).

---

# Part I — Narrative & Achievement View

## 1. TL;DR

**Jemeti** (launched as *TheGarageOS*, rebranded 2026-07-01, commit `f29429a6`) is a multi-tenant SaaS for vehicle workshop management — job cards, CRM, fleet/vehicle catalog, inventory, POS/sales, accounting, staff/payroll, messaging (WhatsApp/SMS/email), subscriptions and billing — built as a Rust/Axum + PostgreSQL monorepo with three SvelteKit 5 SSR frontends. Dibakar Sutra Dhar designed and built it **solo** in under five months: 1,607 of 1,623 commits (99.0%), 2026-05-08 → 2026-09-22, taking the system from empty repo to a five-surface AWS production deployment (two musl Rust binaries on EC2, three SvelteKit Lambdas behind CloudFront) with row-level-security multi-tenancy, four payment gateways, and a 12-state workshop job state machine.

Ready-to-adapt CV summary sentence:
> *Sole architect and developer of Jemeti, a multi-tenant vehicle-workshop SaaS (Rust/Axum, PostgreSQL RLS, SvelteKit): shipped 251 SQL migrations, ~200+ tenant API endpoints, 4 payment gateways, and a 5-surface AWS production deployment in under 5 months (1,600+ commits).*

## 2. The product

Positioning per `CLAUDE.md:1-7` and `docs/ARCHITECTURE.md` §1: *"Multi-tenant enterprise SaaS for vehicle workshop management."* Three user surfaces: workshop staff on `{tenant}.jemeti.app` (owner/admin/manager/staff/mechanic/viewer roles), internal platform ops on `platform.jemeti.app`, and end customers via an OTP job portal. Geography: Bangladesh first (VAT 15%), Malaysia (SST 8%/10%), 7 countries seeded for Stripe. The design doc `plans/39-consolidated-customer-vehicle-intake.md` §1 captures the product thesis in one line: *"A service advisor on a 10–12 hour shift. The dominant event of their day is: a customer walks in with a car."*

| Feature | What it does |
|---|---|
| Tenant provisioning | Invite-token onboarding, account-first signup, automated Route 53 CNAME + role provisioning (`pending → dns_ready → roles_ready → active`), SSE progress stepper |
| Jobs / workshop core | 12-state job FSM (`crates/os/src/handlers/jobs/fsm.rs`), DVI inspections, quotations, service catalog, labor, bays, mechanic time-clock, customer OTP portal |
| CRM | Customers, memberships, cross-tenant `customer_identities` federation, ledgers |
| Vehicles | Global make/model catalog with platform approval queue, tenant fleet, odometer history, 7-step refactor (migrations 201–209) |
| Inventory | Vendors, categories, products with moving-average costing, purchase orders, warranties, stock ledger |
| Sales / POS | POS checkout with idempotency-key replay, invoices, receipts, challan/gate-pass documents |
| Accounting | Double-entry journal (`journal::write` invariant), chart of accounts, trial balance, P&L in tenant timezone |
| Staff / HR | Employees, shifts, attendance (incl. device punch), leave, payroll with payslip rendering |
| Payments | `PaymentGateway` trait: Stripe, SSLCommerz (BD), bKash (BD), Polar.sh; per-country geo router; immutable `payment_events` audit |
| Subscriptions | Plans, entitlements, quotas, 402 → `/billing-required` gate, subscription tokens |
| Messaging | Credit-ledger engine, 5 channels (Resend email, BulkSMS BD, Mobius, Telegram, Meta WhatsApp with pgcrypto-encrypted tenant tokens) |
| Dashboards | 3 Postgres materialized views, 5-min refresh, `kv_cache` + NOTIFY invalidation |
| Document templates | Tenant-customizable invoice/payslip template engine (`packages/doc-templates`) |

## 3. Architecture (summary level)

Dual workspace: **Cargo** (`crates/shared` — DB pool/JWT/cache/SQS/media; `crates/os` — tenant API `jemeti-os` :8080, ~63k lines; `crates/platform` — admin+provisioning API `jemeti-platform` :8081, ~28k lines) and **pnpm** (`apps/web` ~95 routes, `apps/admin` 26 routes, `apps/onboard` landing/onboarding, `packages/http` typed API SDK, `packages/doc-templates`). Aggregate ~230k LOC (cloc, excluding generated): Svelte 81k, Rust 75k, TypeScript 56k, plus 13k lines of markdown docs.

Production (per `CLAUDE.md` "Production Deployment", `deploy/production/docker-compose.yml`): one **EC2 t4g.small** (ap-southeast-1) runs both Rust binaries as `FROM scratch` musl images (~15 MB); Postgres is **Supabase** (60-connection budget shared by two apps + MV role); the three SvelteKit apps are **Lambdas** behind API Gateway + one **CloudFront** wildcard distribution. Tenant isolation is enforced in three places: JWT tenant claim → `SET LOCAL app.current_tenant_id` per transaction → Postgres RLS policies. Every feature request passes six middleware layers (origin secret, rate limit, quota gate, subscription gate, JWT auth, tenant resolution).

Deep detail in Part II.

## 4. The story: how the project evolved

Six epochs reconstructed from git (dates = commit dates; all hashes verifiable in-repo):

| Epoch | Dates | Theme | Evidence |
|---|---|---|---|
| 0 · Bootstrap | May 8–17 | Initial commit `f8d4222b` drops 155 files / +24,482 lines: Rust platform crate + SvelteKit apps already wired for provisioning, RBAC. Feature-gated routes (`8b3784b1`), roles/permissions admin (`f2e7c123`) | git log |
| 1 · Domain sprint | May 18–25 | 288 commits. Inventory merge `72cc7d8f`; **73 commits on May 19 alone** (CRM cycle 1, POs, vehicles backend); the **jobs epic** lands May 23 in five numbered cycles (`cfca55ff` seeds the plan, 7,042 insertions); bays, locale/currency refactor `195b60ec` | git log |
| 2 · Billing & platform depth | June | 597 commits — busiest month. Payment engine trait + 3 gateways `9f75416f`; bKash integration series (~25 commits, June 25); unified messaging with credit ledger `ef7f3b4c` (+7,380); payroll `2e3d1701`; onboarding wizard; forgot/reset password | git log |
| 3 · Rebrand + AWS migration | July | 354 commits. **Rebrand commit `f29429a6` (07-01)**: thegarageos → jemeti, Cloudflare+Atlas dropped for Route 53 + AWS. Squash-merge PR era begins (#1 on 07-15). Lambda/CloudFront deploys (PRs #3, #4, 07-19). Massive vehicle refactor (migrations 201–206, 07-26). Dashboard MV system (07-22–24). **July 15 Lambda deploy outage** → postmortem runbook | git log, `docs/RUNBOOKS/lambda-deploy-issue-2026-07-15.md` |
| 4 · Accounting, sales, print | August | 179 commits, mostly direct-to-main. Chart of accounts, journal, financial reports (08-24–25); POS terminal; unified receipts/invoices (08-17); document template engine `168a4b0d` (7,759 churn); payroll redesign `972add28`; graphify knowledge-graph artifacts tracked then (later untracked) | git log |
| 5 · PR discipline + payments + media | September | 205 commits, **40 PR merges (#10→#97)**, direct pushes stop 09-03. Polar.sh gateway (PR #69 + fixes #74/#75/#80); unified media pipeline (PRs #58/#70/#92/#93/#95/#96); Hurl smoke suite (PR #16/#31); typed platform TS clients `87653fd0` (+6,099). Final merge: **PR #97 `67b937d1` (09-22), unified walk-in intake**, whose feature commit `c8a079e8` is the last large change | git log |

**Tenure boundary:** first commit `f8d4222b` 2026-05-08; last `67b937d1` 2026-09-22. **No commits after September 22, 2026** — the project is complete/paused as of this analysis; there is no post-tenure activity by others to account for. Version milestone: tag `v1.3-payments-local`.

## 5. The user's contributions in detail

### 5.1 Ownership map

1,607/1,623 commits (99.0%) by Dibakar (two identities, same email: "Dibakar Sutra Dhar" 1,564 + "Dibakar" 43). Other identities are single-day, single-theme sessions, not ongoing collaborators:

- `TheGarageOS Dev` (4 commits, 06-18): `CacheStore` trait `5e769eb9` + 3 dashboard materialized views `7b0cb180`.
- `jemeti deploy bot` (7 commits, 07-16): live CI debugging of the Lambda zip bundle.
- `Jemeti Agent` (3 commits, 07-20): transactional tenant-registration fix `87e82d37`, bodies carry `Co-Authored-By: Claude`.
- `puku` (2 commits, 07-18): platform-admin design doc.

Directory touch counts (files touched, `git log --name-only`): `apps/web` 2,575 · `crates/os` 1,472 · `crates/platform` 781 · `apps/admin` 569 · `packages/http` 490 · `apps/onboard` 252 · `docs/superpowers` 161 · `packages/doc-templates` 149 · `.github/workflows` 136 · `docs/audits` 94. He also authored 44 of 56 merges. Reading: **greenfield owner of the entire stack** — backend, frontend, infra, CI, docs — with no meaningful external code contribution.

### 5.2 Thematic breakdown (all major work streams)

1. **Platform core, multi-tenancy, RBAC** — bootstrap `f8d4222b`; feature-gated routes `8b3784b1`; roles/permissions `f2e7c123`; RLS hardening migrations (020, 113, 213); forced runtime role split `jemeti_super`/`jemeti_app`/`jemeti_mv`.
2. **Workshop domain (jobs/DVI/inventory/vehicles)** — jobs in five cycles (May 23, ~45 commits, tables+FSM+DVI+quotations+payments+portal); vehicle refactor migrations 201–209 (July 26); consolidated walk-in intake `c8a079e8` (Sept 21, +6,358/−2,204).
3. **Payments** — engine trait + Stripe/SSLCommerz/bKash `9f75416f` (June 16) with 22 unit tests; bKash series (June 25); Polar.sh gateway (PRs #69/#72/#74/#75, Sept 12–13) + webhook runbook after the 208×404 incident.
4. **Messaging** — unified credit-ledger service `ef7f3b4c` (+7,380/−6); five channels; Meta WhatsApp with encrypted tokens and `META_ENABLED` kill switch.
5. **Frontend buildout** — admin vehicles `ee86886c` (+7,260); CRM/memberships; staff payroll redesign `972add28` (+6,437/−1,898); document/print stack `168a4b0d`, `e8e7613d`.
6. **Typed SDK** — `87653fd0` (Sept 6): 59 files, +6,099 — all Platform APIs ported as 3-layer typed TypeScript clients in `packages/http/src/platform/`.
7. **Infra, CI, deployment** — rebrand/migration `f29429a6`; Cloudflare→AWS cutover (PRs #3/#4); 39 `fix(workflows)` commits; musl cross-compilation via `cross`; SSM-based deploy; RLS; PG17.
8. **Docs & planning discipline** — 164 `docs:` commits; nearly every epic opens with a dated design spec + plan pair in `docs/superpowers/{specs,plans}/` (51 specs, 83 plans) before code.

### 5.3 Signature engineering moments (with the user's own reasoning)

- **The payment engine as a trait, not a tangle** (`9f75416f`, June 16): `PaymentGateway` trait (`create_session`, `verify_ipn`), a `PaymentRouter` with auto/explicit resolution, a per-country geo-gate (documented as fail-open on missing/XX detection), audit helpers, and migration 131 adding `payment_gateways`, `subscription_plan_prices`, `payment_transactions`, `payment_events`. This is why a fourth gateway (Polar) and later a fifth were days-not-weeks additions.
- **The rebrand + cloud migration in one commit** (`f29429a6`, July 1): renamed the product, replaced Cloudflare Tunnel/DNS with Route 53 (new `crates/platform/src/services/route53.rs` wrapping `aws-sdk-route53` "in the same shape as the old `shared::cloudflare` shim" — a deliberate seam-preserving swap), and deleted the Atlas Cloudflare Worker product entirely. Commit body reads like a migration doc.
- **Fixing intake by watching the UI fail** (`c8a079e8`, Sept 21; plan `plans/39-consolidated-customer-vehicle-intake.md`): the plan was authored "after driving the live UI" and counts 17 controls across four intake panels; the commit body quantifies the defect — a step rail whose second card didn't render until step 1 validated, a 10-row client-side preload where "Yamaha" answered "No catalog entries match" while four Yamahas sat past position ten, and a jobs form whose only affordance for a vehicle-less customer was a full navigation that discarded the job. Resolution: shared atomic endpoints (`insert_customer_in_tx` / `insert_vehicle_in_tx` / `insert_job_in_tx`) instead of a new route.
- **The Lambda bundle crisis and postmortem** (`docs/RUNBOOKS/lambda-deploy-issue-2026-07-15.md`): a 502 outage traced through pnpm's virtual store, Node 24 removing callback handlers, and Sentry+OTel closure (~117 MB of a 156 MB bundle against Lambda's 250 MB unzipped limit); fixed by `nodeLinker=hoisted` (1.5 GB → 156 MB) and removing frontend Sentry (its re-add path is documented, not forgotten).
- **Auditing himself before production** (`docs/audits/`, 21 files, June 10–July 4): per-feature security audits with live pentests — CRM 11 findings (2 High), Jobs 17 (6 High, headline: recurring cross-tenant bare-FK IDOR), Staff 14 (3 High, payroll TOCTOU over-pay), a production-readiness verdict of "**NOT READY FOR PRODUCTION**" (3 P0s) — then a fixes synthesis (`wiki/syntheses/jobs-security-audit-fixes.md`) pinning 8 load-bearing fixes with tests and DB constraints (composite FKs in migration 137, `no_double_book` EXCLUDE constraint, portal pre-auth financial cap).
- **The CPU census** (`crates/os/CPU_HEAVY_TASKS_AUDIT.md`, ~860 lines, June 29): 49 hot-path tasks classified by severity and by three remediation lenses (browser-offload feasibility: 22 fully / 12 partial / 15 server-only), with an "5 cheapest big-win code changes" list (e.g. 30-minute `WHERE` scoping of `load_one`, 5-minute `Vec::contains`→`HashSet` in POS) and honest caveats (multi-row INSERT planning cost; rollups shift CPU to the write path; `try_join!` is wall-clock, not CPU).

### 5.4 Commit hygiene

Conventional Commits throughout: 783 `feat`, 423 `fix`, 164 `docs`, 93 `refactor`, 43 `chore`, 25 `test`, plus custom `graphify:`/`llmwiki:` types; only ~5 non-conventional in 1,607. Top scopes: `platform` 75, `web` 64, `os` 57, `staff` 47, `workflows` 39, `jobs` 36, `db` 33. **43% of commits have bodies**, and the bodies carry real engineering reasoning (transaction boundaries, SQL sketches, edge cases). Workflow evolved: local branch merges (May–June) → squash PRs (July) → full PR flow for the final three weeks (40 merges, PRs #10–#97).

## 6. Engineering practices observed

- **Testing:** 647 Rust `#[test]`/`#[tokio::test]` functions across `crates/`; 24 integration test files (14 in `crates/os/tests/`, 10 in `crates/platform/tests/`); 75 `*.test.ts` files across apps/packages (vitest); a dependency-free Node smoke suite against the deployed environment (`tests/smoke/`) plus 13 Hurl API test files (`tests/smoke/hurl/`); scripted GUI walkthroughs (`gui-test-screenshots/`, Playwright).
- **CI/CD:** cross-compile `aarch64-unknown-linux-musl` via `cross` → ECR immutable tags → SSM `docker compose pull` on EC2; frontend build → S3 bundle → terraform apply → alias update → CloudFront invalidation; lint/type-check/security-gate workflow (`web.yml`). Three OIDC deploy roles.
- **Planning culture:** design spec + implementation plan per feature (`docs/superpowers/`), issue-grounded proposals in `plans/`, a security-fix register with a "≥90 days fixed → remove row" policy (`docs/backlog/security-fixes.md`).
- **Docs culture:** `CLAUDE.md` as canonical architecture doc (729 lines, verified highly accurate — its one stale number is the migration count, 192 vs actual 250); `docs/os-api-reference.md` with an explicit "code wins" contract; runbooks with owner/action/verify/rollback format; an LLM-maintained wiki (`wiki/`, 55 pages) and a code knowledge-graph (`graphify-out/`, later untracked — see §9).
- **Recorded tech debt (honest):** no distributed tracing (spans to stdout only, P1 per `CLAUDE.md`); no frontend Sentry since 2026-07-15; `docs/ARCHITECTURE.md` and `docs/port-mapping.md` stale; some audit rows "NEEDS VERIFY".

## 7. Numbers worth quoting

| Metric | Value | Source |
|---|---|---|
| Commits | 1,623 total; 1,607 (99.0%) by Dibakar; 44 merges | `git shortlog -sne HEAD`, `git log --merges` |
| Active build span | 113 active days, 2026-05-08 → 2026-09-22 (<5 months) | `git log --format='%ad'` deduped |
| Real insertions (Dibakar) | ≈967k ins / ≈148k del excluding lockfiles & graphify artifacts; raw 6.9M is ~91% generated | `git log --numstat` with pathspec excludes (verified 2026-10-02) |
| Aggregate code size | ~230k LOC: Svelte 81k, Rust 75k, TS 56k, docs 13k | cloc excl. generated |
| Rust crates | 3 crates, 294 files / ~83k lines incl. tests; `jobs/` handler domain alone 47 files | `wc` over `crates/` |
| SQL migrations | 250 numbered files; 177 distinct tables + 3 materialized views | `ls migrations/*.sql` (verified) |
| API endpoints | OS ~200+ under `/api/*` + portal; Platform ~107 under `/api/platform/v1/` | router inventory, `crates/*/src/{main,lib}.rs` |
| Tests | 647 Rust test fns; 24 Rust integration files; 75 TS test files; 13 Hurl files | `grep`/`find` (verified) |
| Security audits | 21 audit docs; Jobs 17 findings (6 High); one "NOT READY FOR PRODUCTION" verdict + remediation | `docs/audits/` |
| Feature design docs | 51 specs + 83 implementation plans | `ls docs/superpowers/{specs,plans}` |
| Production footprint | 5 surfaces on 1 EC2 t4g.small + 3 Lambdas; Rust images ~15 MB (`FROM scratch`); Lambda bundles 156 MB (from a 1.5 GB start) | `CLAUDE.md`, `docs/RUNBOOKS/lambda-deploy-issue-2026-07-15.md` |
| Payment gateways | 4 (Stripe, SSLCommerz, bKash, Polar.sh) behind 1 trait + geo router | `crates/platform/src/payments/` |
| Job FSM | 12 states incl. customer sign-off loop (`verify_qc` accept/reject) | `crates/os/src/handlers/jobs/fsm.rs` |
| Messaging | 5 channels; WhatsApp broadcasts up to 5,000 sequential sends per request (flagged HIGH in CPU audit) | `crates/platform/src/messaging/`, `CPU_HEAVY_TASKS_AUDIT.md` #29 |
| PR cadence (final epoch) | 40 squash-merge PRs (#10→#97) in 19 days | `git log --merges` |

Footnote: the raw numstat (6.9M insertions) is inflated ~91% by `Cargo.lock`, `pnpm-lock.yaml`, and tracked `graphify-out/` knowledge-graph artifacts (~4.3M lines churn in `56561ab3`/`8c08ce00` alone). Always quote the excluded figure.

## 8. Raw material for derived artifacts

### CV bullet candidates

- Architected and sole-built Jemeti, a multi-tenant vehicle-workshop SaaS (Rust/Axum, PostgreSQL with row-level-security tenancy, SvelteKit 5 SSR) — 1,600+ commits from empty repo to production in under five months.
- Designed a `PaymentGateway` trait with a per-country routing layer unifying Stripe, SSLCommerz, bKash, and Polar.sh, with immutable `payment_events` audit trail and sandbox fail-closed configs.
- Enforced tenant isolation at three layers (JWT claims, per-transaction `SET LOCAL` context, Postgres RLS) after self-run security audits surfaced cross-tenant IDOR classes, then pinned the fixes with composite foreign keys, EXCLUDE constraints, and regression tests.
- Migrated the stack from Cloudflare Workers/Tunnel to AWS (EC2 musl `FROM scratch` images, Lambda+CloudFront SSR, Route 53 DNS provisioning), cutting the Rust deployable to ~15 MB and frontends to 156 MB Lambdas via a documented postmortem.
- Shipped 250 SQL migrations across 13+ domains (jobs FSM, inventory costing, double-entry accounting, payroll) with a plan-doc-before-code workflow (134 design docs and implementation plans).
- Built a five-surface CI/CD pipeline (cross-compile → ECR → SSM deploys; S3 → terraform → Lambda alias → CloudFront invalidation) with three OIDC deploy roles and a post-deploy Hurl smoke suite.

### Blog-post angles

- **"Auditing yourself into production"** — the repo contains a full arc: self-run pentests, a written "NOT READY FOR PRODUCTION" verdict against his own code, and a fixes synthesis that pins every security fix with a test or DB constraint. Rare, citable material.
- **"The 502 that shrank a Lambda bundle from 1.5 GB to 156 MB"** — the July 15 postmortem is a complete pnpm-hoisting/Node-24/Sentry-closure detective story with numbers.
- **"One trait, four payment gateways, two countries"** — how designing the gateway seam early made bKash and Polar drop-in additions.
- **"Fixing UX by driving your own UI"** — plans #39/#41 were written from live-browser observation with control counts and failure transcripts, then resolved with atomic shared endpoints.
- **"No Redis: caching on Postgres, DashMaps, and NOTIFY"** — the deliberate no-Redis decision, entitlements invalidation in <1s, and MV-based dashboards on a 60-connection budget.

### LinkedIn headline candidates

- "Solo-built and shipped a multi-tenant Rust/Axum + SvelteKit SaaS to AWS production in under 5 months — 250 migrations, 4 payment gateways, 300+ endpoints."
- "From empty repo to multi-tenant SaaS on AWS: Rust, PostgreSQL RLS, SvelteKit, Stripe/SSLCommerz/bKash/Polar, and the security audits in between."
- "I built the operating system for vehicle workshops: 99% of a 1,600-commit codebase, solo."

## 9. Caveats for accuracy

- **Attribution:** 99% is genuinely Dibakar's. The four minor identities are his own one-day ops/agent sessions, but `Jemeti Agent` commits are AI-assisted (`Co-Authored-By: Claude`) — don't claim those three fixes as unaided hand-written work. The `TheGarageOS Dev` commits (CacheStore trait, dashboard MVs) are his under an ops identity.
- **Never quote the raw 6.9M insertions** — ~91% generated (`Cargo.lock`, `pnpm-lock.yaml`, `graphify-out/`). Use ≈970k/148k excluding generated files, or "~100k+ lines of real product code" conservatively (the ~970k includes docs and plans).
- **Naming:** the product is **Jemeti** since 2026-07-01 (`f29429a6`); "TheGarageOS" appears only in pre-Q3 docs, which `CLAUDE.md:8-16` declares superseded. The repo *directory* is still named `thegarageos/core` — say "the Jemeti core repo" publicly.
- **Stale docs:** `docs/ARCHITECTURE.md` (May 7) and `docs/port-mapping.md` describe the pre-AWS, Cloudflare-era topology; don't cite them for current architecture. Truth order: code > `CLAUDE.md` > RUNBOOKS > stale docs.
- **Migration-count drift across docs:** 157 → 192 → 220 → 250; use 250 (verified 2026-10-02).
- **Security-flagged behavior still present in code:** WhatsApp broadcasts up to 5,000 sequential sends per request (`CPU_HEAVY_TASKS_AUDIT.md` #29, HIGH); geo-gate is fail-open on missing/XX country detection (documented in `9f75416f` body); some audit register rows remain "NEEDS VERIFY". Don't describe the system as fully remediated.
- **Post-tenure:** no commits after 2026-09-22; no handoff or external validation to report. Frame as "built and shipped to production; project paused at v1.3-payments-local."

---

# Part II — Technical Reference

*Standalone reference extracted from source at analysis date (2026-10-02). Paths relative to repo root. Section numbering continues from Part I.*

## 10. System topology

```
                         ┌──────────────────────────── AWS ap-southeast-1 ────────────────────────────┐
 Browser ──► CloudFront (*.jemeti.app wildcard, WAF 2000 req/5min/IP)                                  │
              │  injects X-Origin-Secret (origin_custom_header)                                        │
              ├─► API Gateway ─► Lambda jemeti-prod-web (1024MB)     apps/web    (SvelteKit SSR)       │
              ├─► API Gateway ─► Lambda jemeti-prod-admin (512MB)    apps/admin                       │
              ├─► API Gateway ─► Lambda jemeti-prod-onboard (512MB)  apps/onboard                     │
              │                                                                                       │
              │  SG: 8080/8081 open ONLY to CloudFront origin prefix list; SSH closed (SSM only)      │
              └─► EC2 t4g.small ─ docker compose (network_mode: host)                                 │
                    ├─ jemeti-os       :8080  crates/os       (tenant workshop API)                   │
                    └─ jemeti-platform :8081  crates/platform (admin + provisioning API)              │
                         │           │                    │                                           │
                         ▼           ▼                    ▼                                           │
                   Supabase Postgres   S3 (5 buckets)   SQS (provisioning, email, dashboard-invalid.)│
                   (RLS multi-tenant,  Route53 (CNAME provisioning)   Resend / BulkSMS BD /          │
                    roles jemeti_super   Stripe / SSLCommerz / bKash / Polar webhooks                 │
                    / jemeti_app / jemeti_mv)           Meta WhatsApp Cloud API / Telegram            │
                         │                                                                             │
                         └── CloudWatch alarms ─► SNS ─► Node forwarder Lambda ─► Sentry               │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Who talks to what:
- **Lambdas never touch Postgres.** They proxy to OS/Platform over HTTPS via the `viewerHost()` header cascade (`apps/web/src/lib/server/viewerHost.ts`, contract in `docs/architecture/viewer-host-contract.md` — "add a new slot to the cascade; do not replace"). Platform is reached at `platform.internal.jemeti.app`, a Route 53 **private** zone — Lambdas can't resolve it, so SSR traffic to Platform goes back through CloudFront/API Gateway (`docs/onboard-aws-deploy-report.md` §1.3: no VPC-attached Lambdas, to avoid cold-start + NAT cost).
- **`X-Origin-Secret`** (≥32 chars, injected by CloudFront) gates all direct origin access (`crates/os/src/middleware/origin_guard.rs`, `crates/platform/src/middleware/{origin_guard,secret_origin}.rs`).
- **`X-Internal-Secret`** gates web→Platform trusted calls (`crates/platform/src/middleware/internal_secret_guard.rs`) plus a Host allow-list.
- Dev topology differs: docker-compose (root) runs postgres:17, ElasticMQ (JVM build deliberately chosen over `-native` for an aws-sdk-sqs 1.98 long-poll bug), MinIO, and legacy nginx. Prod has no nginx; dev `*.localhost` routing is vestigial (`CLAUDE.md:435-459`).
- AWS infra itself (VPC, EC2, ECR, Lambda, CloudFront, WAF, ACM, SSM) lives in a sibling repo (`jemeti/infra`); this repo holds `infra/scripts/bootstrap-parameters.sh` and all app-level deploy workflows.
- **Dev hazard:** `MOCK_*` env flags (`MOCK_ROUTE53`, `MOCK_RESEND`) are fail-closed in production (`APP_ENV` checks) — a misconfigured prod env exits rather than silently mocking.

## 11. End-to-end data flows

**Flow 1 — Tenant provisioning (Platform + onboard):**
1. Invite token lands on `apps/onboard` `/`; Platform `GET /api/public/tokens/<token>/preview` validates (origin-secret gated); token stored in `onboard_token` cookie.
2. Account-first: `POST /api/accounts` creates `jemeti-account` (migration 171); email verification token consumed (170); only then `POST /api/tenants` creates the tenant row and one-shot-redeems the token.
3. `crates/platform/src/services/provisioning/` runs an in-process tokio task (SQS job designed but not required): Route 53 CNAME create → poll propagation → system role provisioning. State machine `pending → dns_ready → roles_ready → active` persisted with `provisioning_logs` (migrations 002, 7339a3b7).
4. Progress streams over SSE `GET /api/tenants/{id}/provision/stream` via `provision_tx: broadcast::Sender` in Platform state; `/status/[id]` renders the stepper. Manual re-trigger: `POST /api/tenants/{id}/provision` (rate-limited; UUIDv4 unguessability is the only auth).
5. Failure: polling budgets 40×30s (CNAME), 40×15s (SSL), 40×30s (TXT) (`CLAUDE.md` env `PROVISION_*`); state remains retryable; logs persisted for the admin UI.

**Flow 2 — Walk-in job intake (OS, the domain core):**
1. Customer/vehicle/job created — post-PR #97, one consolidated surface: `POST /api/crm/customers` accepts optional `vehicles[]`; shared `insert_customer_in_tx` / `insert_vehicle_in_tx` / `insert_job_in_tx` make single, batch, and job paths atomic and drift-proof (`crates/os/src/handlers/jobs/core/`, `c8a079e8`).
2. Job follows the FSM in `crates/os/src/handlers/jobs/fsm.rs`: `draft → intake → (dvi) → quoted → approved → in_progress ⇄ on_hold / quality_check / verify_qc → pending_delivery → completed → closed`, `cancelled` from most states; `verify_qc` is the customer sign-off (accept → `pending_delivery`, reject → `in_progress`).
3. Stages touch: DVI templates (059), quotations (063), parts/labor/service catalog, bays/time-clock (075/076), payments/ledger (064/065), reminders (135, idempotent).
4. Every handler passes `feature_gate::check` + `check_permission` (`crates/os/src/middleware/`); tax computed per country (BD VAT 15%, MY SST 8%/10% — `tax_rules` table).

**Flow 3 — Payment (Platform):**
1. Checkout session created via `PaymentRouter` (`crates/platform/src/payments/gateway.rs`): geo-gate `is_gateway_allowed` picks the gateway by country (fail-open on missing/XX detection).
2. Gateway impls: `stripe_gateway.rs`, `sslcz_gateway.rs`, `bkash/` (via `bkash-rs`), `polar/`. All webhook variants land at `/api/platform/v1/webhooks/{stripe,sslcz,polar}` (`handlers/webhooks.rs`) with signature verification; Stripe skew `STRIPE_MAX_SKEW_SECONDS` (default 300s).
3. Outcomes write immutable `payment_events` + `payment_transactions` (migration 131); audit helpers `record_event` / `upsert_transaction` / `update_transaction` in the payments module. 22 unit tests cover trait/geo-gate/router.

**Flow 4 — Subscription gating (OS):**
1. Per-request middleware chain: `require_origin_secret → rate_limit_tenant → quota_gate → subscription_gate → require_os_auth → resolve_tenant` (`CLAUDE.md:366-385`).
2. Quota checks hit usage counters (`crates/os/src/services/usage_increment.rs`); entitlements come from an in-process `DashMap<TenantId, TenantEntitlements>` invalidated by Postgres `NOTIFY feature_changed` in <1s (`crates/os/src/services/onboarding_cache.rs` + `AppState`).
3. Subscription gate returns **402** → frontend redirects to `/billing-required` (`apps/web/src/routes/(workshop)/billing-required`).

**Flow 5 — Messaging (Platform engine, OS triggers):**
1. OS triggers (invoice sent, payment received, job ready, daily cron, manual broadcast) call the messaging engine.
2. Engine debits a per-tenant credit ledger (`ef7f3b4c`; monthly allotments idempotent via a GENERATED `period` column, migration 163–164) and dispatches to channels: Resend (email), BulkSMS BD, Mobius, Telegram, Meta WhatsApp (`crates/platform/src/messaging/channels/`).
3. WhatsApp tenant tokens are pgcrypto-encrypted at rest (`WA_TOKEN_ENCRYPTION_KEY`); `META_ENABLED` is the kill switch. Email queue is SQS-backed (`SQS_QUEUE_EMAIL`, ElasticMQ in dev, Resend fail-closed in prod unless configured).

**Flow 6 — Dashboard analytics (OS):**
1. Three materialized views (`mv_dashboard_user_stats`, `mv_dashboard_role_stats`, `mv_dashboard_inventory_stats`, migrations 159–161) refreshed every 5 min by `crates/os/src/services/dashboard_refresh.rs` under the BYPASSRLS `jemeti_mv` role.
2. Writes to the base tables trigger `NOTIFY mv_dashboard_changed` → OS LISTEN task wipes `dash.tile_cache` keys (`crates/os/src/main.rs:132-136`); CloudFront URL invalidations go through an SQS queue that **fails closed** if `SQS_QUEUE_DASHBOARD_INVALIDATIONS` is unset outside dev (`handlers/dashboard/publisher.rs`).

## 12. Data model reference

**Store inventory:**

| Engine | Database/namespace | Contents |
|---|---|---|
| Supabase Postgres (prod) / postgres:17 (dev) | single shared schema, RLS | 177 tables + 3 MVs; 250 numbered migrations in `migrations/` |
| Postgres `kv_cache` | table (migration 008) | shared `CacheStore` (`crates/shared/src/cache.rs`) |
| In-process DashMaps | `AppState` | entitlements, features, rate limits, onboarding, subdomains, countries, S3 URL TTLs |
| S3 (prod) / MinIO (dev) | `tenant-assets`, `vehicle-models` (+ static-assets, lambda-bundles, logs bucket per runbook) | presigned-PUT only for tenant uploads; OAC read-only for static assets |
| SQS (prod) / ElasticMQ (dev) | `provisioning`, `email`, `dashboard-invalidations` | async jobs |
| — (no Redis) | deliberate: "no Redis" is a recorded foundational decision (`wiki/syntheses/migrations-evolution.md` Phase 0) | |

**Tenancy mechanics (hard rules):** every tenant table has `tenant_id UUID NOT NULL`; `shared::db::set_tenant_context` runs `SET LOCAL app.current_tenant_id` per transaction; RLS `USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)` (migration 020, hardened 113 `FORCE RLS` + runtime role, 213 nullif fix). Three DB roles: `jemeti_super` (DDL, `MIGRATE_DATABASE_URL`), `jemeti_app` (NOBYPASSRLS runtime, `DATABASE_URL`), `jemeti_mv` (BYPASSRLS, MV refresh; renamed from `jemeti_maintenance` in migration 194). Platform tables (tenants, platform_users, features, subscription_plans, payment_transactions, accounts, messaging_*) intentionally have no RLS.

**Domain table groups (by migration range):** platform core 001–013; soft delete 014; inventory 026–033/127/237–238; CRM 034–044/080–085/165; vehicles 045–054/201–208/246/249–250 (7-step `vehicle_refactor`); jobs 055–075/135–139/221–231; sales/POS 086–096/139–147/230–231; staff/HR 097–107/148–157; accounting 108–112/232–233; subscriptions/payments 114/121–122/131/166–171/175–184/189–199/235–236/242–245; accounts/email 124–126/170–174/185; dashboard 158–161/176/195–198/210/214–216/219; messaging 132/163–164/242–245; region gating 129–130; security hardening 133–134/137/148–157 (PII permissions, idempotency keys, cross-tenant composite FKs, money check constraints).

**Notable constraints:** `no_double_book` EXCLUDE constraint on appointments; composite cross-tenant FKs (migration 137) killing the IDOR class; money check constraints; GENERATED `period` column for idempotent monthly messaging allotments.

## 13. Pipeline / processing reference

Background tasks (all `tokio::spawn` in `crates/os/src/main.rs`): dashboard MV refresh (5 min), job-due reminder cron (daily, `services/job_due_cron.rs`), password-reset sweeper, media sweeper; plus NOTIFY watchers (onboarding/feature cache, `dash.tile_cache`).

Rate limits (env-tunable `RL_*`, defaults per `CLAUDE.md`): tenant API 300 RPM; login 10/5min (20/email); password reset 3/5min; registration 20/hr + burst 5/min; public 120 RPM; WAF edge 2000 req/5min/IP on `/api/*`. JWT lifetimes: OS 7 days, Platform 1 day.

Body-size caps (`docs/os-api-reference.md` §1.5): vehicles reference 16 KiB, catalog model 64 KiB, odometer 8 KiB, cover image 2 KiB.

CPU profile: 49 hot-path tasks cataloged with severities and remediation lenses in `crates/os/CPU_HEAVY_TASKS_AUDIT.md`; projected wins — PDF/HTML rendering offload ~20–30% CPU, dashboard aggregation ~30%, entitlements rebuild 5–10× fewer rebuilds; claimed index speedups trigram GIN 50–1000×, journal-lines covering index 5–20×.

## 14. Algorithms & invariants

- **Job FSM** (`handlers/jobs/fsm.rs`, 84 lines): the exact transition table above; enforcement is code-level, plus DB constraints for integrity (e.g. `no_double_book`).
- **Moving-average inventory costing** (`docs/superpowers/plans/2026-05-17-inventory-management-part*.md`): PO receipts re-cost product averages into the stock ledger.
- **Double-entry invariant** (`wiki/topics/double-entry-ledger-pattern.md`): `journal::write` refuses unbalanced entries; 5 seeded account codes; three posters only — invoice, payment, credit note. Trial balance / P&L filter on `entry_date` interpreted in tenant timezone (`AGENTS.md` §11).
- **Payment routing** (`payments/gateway.rs` + `geo_gate.rs`): auto resolution by `cf-ipcountry`-derived country with explicit override; **fail-open** on missing/XX detection (documented decision in `9f75416f` body).
- **Tax engine**: per-country `tax_rules` — BD VAT 15%; MY SST 8% (service) + 10% (goods) (`CLAUDE.md:628-640`).
- **Connection budget** (documented in `deploy/production/docker-compose.yml`): `jemeti_app` 25 + `jemeti_mv` 5 + `postgres` 2 = 32 idle of Supabase's 60 ceiling (≥28 headroom); compose comments show the earlier OS-20/MV-10/Platform-15 arithmetic.

## 15. External services catalog

| Operation | Service | Notes |
|---|---|---|
| Tenant DNS provisioning | Route 53 (`crates/platform/src/services/route53.rs`) | `upsert_cname`/`delete_cname`/`poll_for_record`; `MOCK_ROUTE53` in dev |
| Email | Resend (`messaging/channels/resend.rs`) | `MOCK_RESEND` dev-only, fail-closed prod |
| SMS (BD) | BulkSMS BD, Mobius | channel impls in `platform/src/messaging/channels/` |
| WhatsApp | Meta Cloud API | tenant-owned WABA; tokens pgcrypto-encrypted; `META_ENABLED` kill switch |
| Telegram | Bot API | channel impl |
| Payments | Stripe, SSLCommerz, bKash (`bkash-rs`), Polar.sh | trait impls in `platform/src/payments/`; `SSLCZ_SANDBOX=false` fatal in prod; Polar requires BOTH `PAYMENTS_ENABLED=true` and `POLAR_ENABLED=true` or webhooks 404/500 (compose comment re issue #72) |
| Storage | S3 + CloudFront OAC / MinIO dev | presign via `crates/shared/src/media.rs` |
| Queues | SQS / ElasticMQ dev | ElasticMQ JVM image deliberately chosen (aws-sdk-sqs 1.98 long-poll bug in `-native`) |
| Observability | Sentry 0.41 (pinned, rustls+ureq) per-binary DSNs; CloudWatch alarms → SNS → forwarder Lambda → Sentry | tracing JSON → CloudWatch; **no trace shipping** (P1); frontend Sentry removed 2026-07-15 (bundle), re-add path documented |
| LLM/AI | **none in the product** — `llm-wiki.md` and `wiki/` are developer-side knowledge tooling, not product features | |

## 16. API & auth reference

Six auth layers, in request order on OS (`CLAUDE.md:366-385`):
1. `X-Origin-Secret` (CloudFront→origin) — `os/middleware/origin_guard.rs`; Platform equivalent `platform/middleware/{origin_guard,secret_origin}.rs`.
2. `rate_limit_tenant` middleware.
3. `quota_gate` (usage counters).
4. `subscription_gate` (402 → `/billing-required`).
5. `require_os_auth` — OS JWT cookie `os_token`, `OS_JWT_SECRET`, 7-day, claims sub/tenant_id/role_id (`os/middleware/auth.rs`).
6. `resolve_tenant` — `SET LOCAL app.current_tenant_id`.

Platform order: `rate_limit_public → origin secret → onboard origin allow-list → internal secret → platform auth` — Platform JWT `platform_token`, 1-day, `require_role(SuperAdmin|Admin)` (`platform/middleware/{auth,authz}.rs`).

Route groups: OS ~200+ endpoints under `/api/*` (inventory 26, crm 12, vehicles 27, jobs 47-file domain, sales 19, staff 42, accounting 11, invoices 14, user_roles 9, dashboard, media, storage, onboarding, workspace) + `/portal/*` (customer **OTP** auth, not JWT, with a pre-auth quotation financial cap) + `/api/staff/attendance/device-punch` (X-Device-Key). Platform ~107 routes under `/api/platform/v1/` (tenants 30, plans 18, features 7, messaging 6, tokens 5, auth 5, webhooks 4, public 4, payments 4, accounts 4, coupons/referrers/roles/domains/countries/internal). No OpenAPI file; the contract is `docs/os-api-reference.md` ("code wins") mirrored by typed TS clients (`packages/http/src/os/`, `src/platform/`).

Frontend access: hard auth gate in `apps/web/src/hooks.server.ts` (`os_token` cookie); server-side `ROUTE_FEATURES` redirect map in `src/routes/(workshop)/+layout.server.ts`; sidebar filtering via `/api/entitlements`; security headers (X-Frame-Options DENY, HSTS, COOP/CORP, Permissions-Policy) set in hooks (`CLAUDE.md:288-295`).

## 17. Scheduling & queues

| Schedule/mechanism | Job | File |
|---|---|---|
| 5 min | Dashboard MV refresh (`jemeti_mv` role) | `crates/os/src/services/dashboard_refresh.rs` |
| Daily | Job-due reminders (idempotent, migration 135) | `crates/os/src/services/job_due_cron.rs` |
| Continuous | Password-reset token sweeper | `crates/os/src/services/password_reset*` |
| Continuous | Orphaned-media sweeper | `crates/os/src/services/media_sweeper*` |
| LISTEN/NOTIFY | feature_changed, countries_changed, mv_dashboard_changed cache invalidation | `crates/os/src/main.rs:22-44` |

Queues: SQS `provisioning` (designed for async provisioning; currently in-process tokio task) and `email` (messaging); `dashboard-invalidations` (CloudFront URL invalidation, **fails closed** if unconfigured outside dev). Message contracts live in `crates/shared/src/sqs.rs` (publisher) and the platform provisioning/email services. Dev uses ElasticMQ :9324/:9325 (`elasticmq.conf`).

## 18. Bindings, secrets & deployment

**Secrets inventory (names only, never values):** `jemeti-database-url`, `jemeti-migrate-database-url`, `jemeti-mv-database-url` (SSM; fetched at boot by `jemeti-fetch-secrets.service` into `/etc/jemeti/jemeti-secrets.env`), `jemeti-internal-caller-secret`, `OS_JWT_SECRET`, `PLATFORM_JWT_SECRET`, `ORIGIN_SECRET` (≥32 chars enforced), `X-Internal-Secret`, `WA_TOKEN_ENCRYPTION_KEY`, `STRIPE_*`, `SSLCZ_*`, `POLAR_*`, `SENTRY_DSN_OS`/`SENTRY_DSN_PLATFORM`, `SQS_QUEUE_*`, `S3_ENDPOINT_URL`, `MOCK_*` flags. `.env.example` documents 101 variables; `scripts/build_jemeti_secrets_env.py` assembles them.

**CI/CD:** `.github/workflows/{os,platform}.yml` — `cross`-compile `aarch64-unknown-linux-musl` (`Cross.toml`; rustls everywhere so no OpenSSL/musl hacks) → ECR immutable tags → SSM `docker compose pull && up -d --no-deps` with `${IMAGE_TAG}` sed'd on the runner. Frontends: `{web,admin,onboard}-deploy.yml` — build (adapter-node zip) → S3 `jemeti-prod-lambda-bundles` → `terraform apply` → publish-version → `update-alias live` → CloudFront invalidation ("the operator never runs terraform manually for a frontend deploy"). `web.yml` adds lint/type-check/security gates. Three OIDC roles: frontend-deploy, terraform-deploy, crates-deploy (diagram: `docs/onboard-aws-deploy-report.md` §1.5).

**Migration policy:** numbered SQL in `migrations/`, run by the **Platform** binary at boot via `MIGRATE_DATABASE_URL` (as `jemeti_super`); `make migrate / migrate-revert / db-reset`; destructive role changes use `rotate-db-roles.sh` (two operator confirmations, refuses non-interactive; rollback log in the 07-22 role-isolation spec).

**Alarming prod quirks:** both Rust containers run `network_mode: host` so sqlx can reach the Supabase session pooler over the ENI IPv4; a custom static `deploy/production/resolv.conf` is bind-mounted because musl's scratch image can't use systemd-resolved's link-local DNS.

## 19. Operational gotchas & key file map

**Gotchas (the sharp edges):**
1. **Polar webhooks 404 unless both flags set** — route only mounted when `PAYMENTS_ENABLED=true` AND `POLAR_ENABLED=true`; incident: 208 consecutive 404 deliveries, then a sandbox endpoint auto-disabled after 228×401 signature mismatches and deleted (`docs/RUNBOOKS/polar-webhooks.md`, issue #72).
2. **Lambda can't resolve private-zone hostnames** — SSR calls to Platform must route via CloudFront/API Gateway; VPC-attached Lambda was evaluated and rejected (cold start + NAT cost).
3. **Function URLs rejected browser form POSTs** with `403 InvalidSignatureException` (OAC SigV4) — reason for the API Gateway hop (`onboard-aws-deploy-report.md`).
4. **Lambda bundle ceiling** — unzipped 250 MB limit; Sentry+OTel closure ~117 MB; pnpm `nodeLinker=hoisted` is load-bearing; Node 24 removed callback-style handlers (broke `adapter-node` once).
5. **viewerHost cascade is permanent** — every SSR request carries a header cascade identifying origin host; "add a slot, never replace" (`docs/architecture/viewer-host-contract.md`).
6. **musl scratch image DNS** — needs the bind-mounted static resolv.conf; `network_mode: host` is deliberate for the Supabase pooler.
7. **Portal is OTP, not JWT** — pre-auth portal endpoints have a dedicated financial cap; don't assume portal routes share OS auth middleware.
8. **Fail-closed env checks** — missing `SQS_QUEUE_DASHBOARD_INVALIDATIONS`, unset `ORIGIN_SECRET`, `SSLCZ_SANDBOX=false` in prod, or a missing `MIGRATE_DATABASE_URL` (Platform exits after 30s `pool timed out`) all crash at startup by design.
9. **Stale docs trap** — `docs/ARCHITECTURE.md`, `docs/port-mapping.md`, `docs/backlog/pipeline.md` describe the pre-AWS/Cloudflare era; `docs/MIGRATION_TO_AWS.md`, `GOS_ARCHITECTURE_PROD.md`, `CODEBASE.md` were removed from docs/ and survive only as wiki summaries (`wiki/sources/*.md`) — a dangling-reference hazard when runbooks cite them.
10. **`graphify-out/` churn** — 465k-line generated artifacts were tracked (Aug), reverted for reviewability, and untracked (Sept 12, −4.3M lines); don't count them as code, and don't re-commit them.

**Key file map (where to look first):**

| Topic | File |
|---|---|
| Canonical architecture + conventions | `CLAUDE.md` (729 lines, current) |
| API contract | `docs/os-api-reference.md`; typed mirror `packages/http/src/{os,platform}/` |
| Job domain & FSM | `crates/os/src/handlers/jobs/` (esp. `fsm.rs`, `core/`, `dvi/`, `quotations/`, `portal/`) |
| Tenancy/RLS | `crates/shared/src/db.rs`; migrations 020/113/213; `wiki/topics/` multi-tenancy |
| Payments | `crates/platform/src/payments/` (+ `docs/RUNBOOKS/polar-webhooks.md`) |
| Provisioning | `crates/platform/src/services/provisioning/`; `apps/onboard/src/routes/status/[id]` |
| Deployment | `deploy/production/docker-compose.yml` (with its load-bearing comments); `.github/workflows/`; `docs/RUNBOOKS/aws-cutover.md` |
| Security posture | `docs/audits/` (21 files); `docs/backlog/security-fixes.md`; `wiki/syntheses/jobs-security-audit-fixes.md` |
| Performance research | `crates/os/CPU_HEAVY_TASKS_AUDIT.md`; `docs/audits/2026-07-04-ec2-to-browser-offload-plan.md` |
| Plans/specs | `docs/superpowers/{specs,plans}/`; `plans/` |
| Postmortems | `docs/RUNBOOKS/lambda-deploy-issue-2026-07-15.md`; `docs/onboard-aws-deploy-report.md` §3 |
| Intake UX rationale | `plans/39-consolidated-customer-vehicle-intake.md`; commit `c8a079e8` body |

*End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially.*
