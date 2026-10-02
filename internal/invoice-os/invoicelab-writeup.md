# Invoice.Lab (InvoiceOS) — Codebase Writeup

> **Internal document — not for publication.**
> Repo: `/Users/dibakar/Downloads/Projects/aeroer-live/Invoice.Lab` (`github.com/Aeroer-Live/Invoice.Lab`, branch `staging` analyzed)
> Analysis date: 2026-10-02 · History: 464 commits, 2025-07-06 → 2026-07-01 · Parts I & II are a snapshot as of this date; regenerate both together if the codebase changes materially.
> Purpose: source of truth for deriving CV bullets, portfolio entries, LinkedIn content, and blog posts. Written for whole-project coverage **with honest attribution** (Dibakar ≈ 91% of commits; AeroerMak the remainder).

---

# Part I — Narrative & Achievement View

## 1. TL;DR

Invoice.Lab (marketed externally as **InvoiceOS**) is an AI-powered invoicing SaaS for Malaysian freelancers and small businesses: create branded invoices from a form or free-text AI parsing, track draft→paid status, share password-optional links with view analytics, and manage clients/products/analytics — with plan-based usage limits and MYR-first pricing. It is a pnpm + Turborepo monorepo: a Cloudflare Worker API (`apps/core`, tRPC v11 over ~100 procedures), a SvelteKit 2 + Svelte 5 web app (`apps/web`), and three shared packages (Zod schemas, types, pure money-math). Dibakar Sutra Dhar was co-founder/core engineer and effectively sole builder of the entire backend, frontend, CI/CD, and shared packages — 421 of 464 commits (90.7%) across two build-out phases (Jul–Dec 2025, then a Jun–Jul 2026 perf/security hardening campaign), roughly **87,500 hand-written insertions** after stripping generated files. Co-founder AeroerMak contributed early HTML prototypes, several apphub/Next.js pages, branding assets, and a date-based invoice-numbering feature (~33 commits, ~8–10k real insertions).

Ready-to-adapt CV summary: *"Co-founded and technically built InvoiceOS, an AI-powered invoicing SaaS on Cloudflare Workers + Supabase Postgres — sole author of a tRPC API (~100 procedures), a SvelteKit 5 frontend, and a Turbo monorepo; shipped two full platform rebuilds and a performance campaign that cut invoice-list latency from ~150–400 ms to ~10–30 ms."*

## 2. The product

**Positioning** (root `README.md`, 2025-07-06): "Effortless, AI-powered Invoice Generation" — targets freelancers, small businesses, startups. Malaysia-first: MYR default currency, SST tax planned, local payment rails (Maybank2u/FPX/Touch 'n Go) on the roadmap (`apps/core/BETA_FEATURES.md`), web README signs off "Invoice Lab Malaysia". The product story did not materially change during the tenure; the *architecture* changed radically (see §4).

**Feature table** (canonical inventory: `apps/core/CURRENT_FEATURES.md`, 2025-11-25):

| Feature | What it does |
|---|---|
| Auth & accounts | Email/password (bcrypt, 10 rounds), custom KV sessions with 2-hour TTL, per-user company profile with branding/bank details |
| Invoices | Full CRUD, 6-state lifecycle (draft→sent→viewed→paid→overdue→cancelled), tax/discount math, human-readable `INV-DD/MM/YYYY-NN` numbering |
| AI Invoice Parser | OpenAI `gpt-4o` (temp 0.1) extracts structured invoice JSON from free text, with confidence scores and retry/backoff |
| Clients & products | Client CRM, product catalog with categories and usage counters |
| Sharing & analytics | Password-optional share links, view tracking (IP/UA/location), real-time view notifications, revenue/status/trend dashboards |
| Subscriptions & billing | FREE/PRO (RM29)/ENTERPRISE (RM99) plans, monthly usage tracking, `gate()` middleware plan enforcement (Stripe provider stubbed) |
| Email | Resend delivery incl. invoice PDF attachments |
| PDF & QR | Client-side PDF export (jspdf + html2canvas), payment QR codes |
| Automation | Nightly cron flips sent→overdue, sends due-soon notices |

## 3. Architecture (summary level)

Two apps + three packages, one database, one edge runtime:

- **`apps/core`** — Cloudflare Worker (~55 files / ~21k LOC): tRPC v11 over a raw `fetch` handler (`src/index.ts`), 13 sub-routers / ~100 procedures, services layer over **Supabase Postgres** (`@supabase/supabase-js` REST client), 5 Cloudflare KV namespaces (sessions, invoice analytics, file storage, notifications, rate limits), daily cron, Resend email, OpenAI parser.
- **`apps/web`** — SvelteKit 2 + Svelte 5 (~142 files / ~29.6k LOC) on Cloudflare Pages: ~30 routes, ~80 domain components, TanStack Svelte Query over a typed tRPC client.
- **`packages/{schemas,types,utils}`** — shared Zod input + Postgres table schemas, TS types, and pure invoice-totals math used by both apps.
- 16 SQL migrations in `apps/core/drizzle/` (plus per-migration design docs — the repo's real architecture record).

Deep detail in Part II.

## 4. The story: how the project evolved

Dibakar's first commit: 2025-07-16 (`cbec8aa`). Last: 2026-07-01 (`7c753c8`). AeroerMak started the repo 2025-07-06 with static HTML prototypes. Six epochs, a five-month hiatus, one hardening campaign:

| Epoch | Window | Theme | Anchors |
|---|---|---|---|
| E1 Prototype + monorepo | 2025-07 | Aeroer's static login/invoice prototypes; Dibakar scaffolds the real product in 10 days: Turbo monorepo, Next.js "apphub", Hono/Chanfana public API on Workers, CI to Cloudflare Pages | `cbec8aa`, `36accd8` (+9,354), `b69b7a0` (+8,748), `7d85063` |
| E2 Public-API era | 2025-08 | Supabase Postgres, repository layer, Zod schemas, auth (JWT → KV sessions), MCP-server experiment; Aeroer builds apphub client/company pages | `0b569f2`, `bfa3fe5`, `dbd1460` |
| E3 The "core" rebuild | 2025-09 | Dibakar solo: new `apps/core` tRPC Worker, new SvelteKit `apps/web`, shared packages, sequential invoice numbers, alpha release pipeline → 9 version tags | `00510c1`, `4d57f09`, `e203943`, `83226b8` |
| E4 Feature explosion | 2025-10 | Dibakar's biggest month (101 commits): landing, dashboard, invoices/clients/templates UI, analytics, email/storage/notifications, AI parser, sharing + QR, Stripe-shaped billing; **public-api deleted** (−17,350) | `ec4efd6`, `55f72dc`, `f9f869d`, `ab4cf3b` |
| E5 Supabase domain migration | 2025-11 | All four domain services rewritten onto Supabase; notifications bell; PDF/print; `packages/utils` money math | `6362707`, `e084741`, `f1291a7`, `3685838`, `65b7d55` |
| E6 Finalize + consolidation | 2025-12 | Invoice finalize/send model, Resend email, overdue cron, SSR cookie fix, Svelte 5 runes; **apphub deleted** (−14,056) → clean two-app shape, then commits stop | `cb36edd`, `80b3ff3`/`80b6ff3`, `8c4119d`, `9ec026a`, `02383ba` |
| Hiatus | 2026-01→05 | No core development; only Aeroer logo/favicon commits (Mar–Apr) | `7872538`, `47f09fb` |
| E7 Hardening | 2026-06→07 | Dibakar returns Jun 30: 18 perf commits (N+1 kills, `invoice_items` normalization, SQL analytics pushdown, cache, pagination), security trio (stored XSS, ownership, CORS), unified `gate()` plan middleware, `INV-DDMMYYYY-NN` numbering via trigger, RLS-safe migrations | `c3cc4d8`, `62ddf29`, `1e5d7e2`, `7680d84`, `774e36a` |

The project's defining shape: **build big, tear down, rebuild smaller**. The public API (E2) and the Next.js apphub (E1/E2) were both fully built and later deleted by Dibakar in favor of the leaner tRPC + SvelteKit core — the repo's two largest diffs are deletions of his own earlier architecture (`ab4cf3b` −17,350; `02383ba` −14,056). After Jul 1, 2026 the repo goes quiet; the last commits are fix-ups to work Dibakar shipped in the June hardening campaign, so the tenure ended at a self-consistent, hardened state.

## 5. Dibakar's contributions in detail

### 5.1 Ownership map

Touch counts (commits touching files in each directory, `git log --author=iamdibakardipu --name-only`):

- `apps/core/src/services` — 88 touches · `apps/web/src/lib/components/invoices` — 74 · `apps/core/src/trpc/router` — 71 · `.github/workflows` — 38 · `packages/schemas` — 23
- He is effectively **sole owner of the backend, CI, shared packages, and ~all of the SvelteKit app**. AeroerMak's touches are confined to early prototypes, apphub frontend pages, brand assets, and two invoice-numbering commits in Jun 2026 (`f5850bb`, `27b427a`).

### 5.2 Thematic breakdown (421 commits)

1. **Platform & infra** — monorepo init (`cbec8aa` +7,801), Turbo pipeline, wrangler config (11 touches of `apps/core/wrangler.jsonc`), three generations of CI (`7d85063`, `21b61d0`, `83226b8` alpha-release workflow → bot-published `core-v0.1.0-alpha.1…7`, `core-v0.2.0-alpha.0`, `core-v0.3.0-alpha.*`, `web-v0.1.0-alpha.1` tags).
2. **API build-outs** — Hono/Chanfana public API era (Aug: repositories `0b569f2`, middleware `4bc60f1`, session auth `bfa3fe5`), then the tRPC core rebuild (Sep: `00510c1`, `6bc5add`, `1736c9e`) with 13 routers / ~100 procedures.
3. **Domain services** — invoice lifecycle (`e203943`, `6362707`, `fdece89`, `cb36edd` finalize model), analytics (`ec4efd6`, `fa61322`, `889d768`, SQL pushdown `62ddf29`), subscriptions/billing/usage (`a563844`, `b2dc017`, `64bb83a`), email/storage/notifications (`9643fa7`, `f99ed0b`, `16aafa2`, `40661b9`), AI parser (`55f72dc`).
4. **Frontend (SvelteKit)** — app scaffold (`4d57f09`), landing/auth (`b64534a`, `ef9f300`), the invoices UI as the most-touched area (74 component touches; `53673dd`, `1d063d3`, `ef77527`), products (`f217e15`, `99346a0`), account/billing UI (`56252f6`, `75ee2b4` +2,444).
5. **Shared packages** — `@invoicelab/types`, `@invoicelab/schemas` (`549295d`, `9542e0b`), `@invoicelab/utils` money math (`65b7d55`).
6. **Restructuring** — public-api removal (`ab4cf3b`), apphub removal (`02383ba`), the four-service Supabase domain migration (Nov 2025).
7. **Performance & security campaign (Jun–Jul 2026)** — 18 `perf` commits: N+1 elimination (`a531011`, `9d440f7` server-side pagination), `invoice_items` normalization + dual-write (`c3cc4d8` +415), analytics SQL pushdown (`62ddf29` +438), TanStack query caching (`a39afc4`), batched reads (`d660f73`); security: stored-XSS fix (`1e5d7e2`), ownership enforcement (`376bb5d`), CORS whitelist (`6ea33c1`); plan-limits UX + single `gate()` middleware (`40df73f`, `bb34181`, `7680d84`); trigger-based invoice numbering (`5195bd6`, `013a746`); RLS-safe migration (`774e36a`).

### 5.3 Signature engineering moments

- **The JSONB → relational invoice-items migration** (`c3cc4d8`, migration `0012` + design doc `apps/core/drizzle/0012_invoice_items_normalization.md`). His commit body states the problem plainly: *"The `invoices.items` JSONB column blocked SQL aggregates — every 'top products' or 'revenue by category' question had to load every invoice into Node and loop."* Solution: normalized `invoice_items` table with PK `(invoice_id, line_no)`, FK to products with RESTRICT ("never orphan an item by deleting a product"), idempotent backfill via `jsonb_array_elements WITH ORDINALITY`, an AFTER-UPDATE trigger as a safety net for raw-SQL mutations, and a documented 3-phase rollout ending in dropping the JSONB mirror.
- **Analytics pushdown to Postgres** (`62ddf29`, migration `0013` + doc). The doc quantifies the old path: every analytics-tab poll (30 s cadence) fetched **1,000 invoices + all clients + all referenced products into the Worker** (~1.5 MB of JSONB for 500 invoices) to slice out 10–20 rows. Replaced with two Postgres functions (`get_client_performance`, `get_activity_feed`) called via `supabase.rpc()`, each one round-trip returning exactly N rows, with inner-scan caps (5,000 / 2,000 recent non-draft invoices), parity-check SQL, and a rollback plan.
- **The stored-XSS catch** (`1e5d7e2`). Product names were embedded raw into an HTML string rendered via Svelte's `{@html}` in ProductSearch — a stored-XSS vector (`<img onerror=…>` as a product name). Fixed by sanitizing both text and query with `escapeHtml()` before injection. Small diff (14 insertions), exactly the kind of finding worth retelling in interviews.
- **The cross-domain SSR cookie fix** (`9ec026a`). Cookies set by the core API were scoped to the API's domain while SvelteKit's `hooks.server.ts` looked for the session cookie on the web domain — an essay-length commit message with Problem/Solution structure: created a `/api/set-session` bridge endpoint on the web server so client-side login success sets the cookie on the web domain and SSR can recognize the user.
- **The `CREATE INDEX CONCURRENTLY` deployment decision** (`apps/core/drizzle/9999_performance_indexes.md`). Performance indexes are applied manually via Supabase SQL Editor rather than Drizzle because `CREATE INDEX CONCURRENTLY` cannot run inside Drizzle's transaction wrapper, and the locking alternative "is a hard outage". The doc includes per-query latency estimates: invoice list **~150–400 ms → ~10–30 ms**, product search **~50–200 ms/keystroke → ~5–15 ms**, client list **~30–80 ms → ~5–10 ms**, for a "typical tenant" of 2,000 invoices / 50 clients / 100 products.
- **Subagent-driven-development process** (`docs/superpowers/plans/2026-06-30-invoice-number-format-and-payment-terms-display.md` + `.superpowers/sdd/` ledger): a 6-task plan with inlined SQL, per-task briefs and verified reports, review findings (fallback-date mismatch, constraint idempotency), and a recorded fix (daily sequence capped at 99, `4f307a5`).

### 5.4 Commit hygiene

Near-100% Conventional Commits (feat 258, fix 62, chore 38, refactor 35, perf 18) with consistent scopes (`feat(invoice)`, `perf(analytics)`, `fix(core)`); several essay-length bodies carrying Problem/Solution reasoning; 12 commits carry Claude session trailers. Contrast: AeroerMak's messages are mixed freeform ("Develop -> Login System").

## 6. Engineering practices observed

- **CI/CD**: one workflow (`.github/workflows/deploy-staging.yml`) deploys core Worker + SvelteKit Pages to staging on push. **No test/lint/type-check gates in CI** — those scripts exist in Turbo but run manually.
- **Testing**: near-zero — one 7-line smoke test (`apps/core/src/index.test.ts`, Vitest + `@cloudflare/vitest-pool-workers`), plus a Postman/Newman collection not wired into CI.
- **Docs culture**: strong *per-decision* docs (migration companion `.md` files with Why/Design/Rollback/Risk sections are the real architecture record) but weak *living* docs — `apps/core/README.md`, `CURRENT_FEATURES.md`, and the root README still describe the pre-Postgres KV-only architecture and actively mislead as of 2026-07.
- **Known tech debt (recorded in-repo)**: non-atomic JSONB↔relational dual-write (flagged for RPC-wrapping), bank-account field stored as JSON string (`apps/web/README.md` TODO), non-atomic KV rate limiting (acknowledged in comments), Stripe provider stubbed end-to-end, AI parser service implemented but not wired to any tRPC procedure (the UI's `parseText` call has no backend handler — see Part II gotchas).

## 7. Numbers worth quoting

| Metric | Value | Source |
|---|---|---|
| Total commits (staging branch) | 464 over 2025-07-06 → 2026-07-01 | `git rev-list --count HEAD` |
| Dibakar commits | 421 (90.7%) | `git log --format='%an <%ae>' \| uniq -c` |
| Dibakar insertions/deletions | 130,344 / 89,456 raw; **≈87,537 / 64,436 excluding generated files**¹ | `git log --author=iamdibakardipu --numstat` |
| Codebase size (apps+packages, ts/svelte, excl. .d.ts) | ~55k LOC: core ~21.3k, web ~29.6k, packages ~4.2k | `wc -l` over tracked sources |
| tRPC procedures | ~100 (≈52 queries + ≈48 mutations) across 13 routers | `grep -c '\.query('`/`\.mutation(` in `apps/core/src/trpc/router/` |
| Postgres migrations | 16 numbered + 1 performance-index file | `ls apps/core/drizzle/` |
| Tables | ~21 (invoices, invoice_items, clients, products, shares, billing/usage, …) | `apps/core/drizzle/*.sql` |
| Alpha release tags | 9 (`core-v0.1.0-alpha.1` → `core-v0.3.0-alpha.1`, `web-v0.1.0-alpha.1`) | `git tag` |
| Invoice-list latency (documented estimate) | ~150–400 ms → ~10–30 ms | `apps/core/drizzle/9999_performance_indexes.md` |
| Analytics payload eliminated | ~1.5 MB JSONB per 30 s poll (500 invoices) → one RPC returning ≤ N rows | `apps/core/drizzle/0013_analytics_aggregates.md` |
| Biggest single deletion | −17,350 (public-api removal, `ab4cf3b`) | `git show --stat ab4cf3b` |
| Plan pricing | FREE / PRO RM29 / ENTERPRISE RM99 (MYR) | `apps/core/src/utils/plan-limits.ts` |
| Rate limit | 60 req/min/IP (KV counter) | `apps/core/src/trpc/middleware/rate-limiter.ts` |

¹ Inflation sources: `pnpm-lock.yaml` 16,063 ins; wrangler-generated `worker-configuration.d.ts`/`env.d.ts` 26,744 ins. Cite the ~87.5k hand-written figure, not the raw one. AeroerMak's 28,112 ins are inflated by one vendored commit (`186be7e` includes bootstrap + fontawesome CSS, ~20.6k lines); his real hand-written output is ~8–10k insertions.

## 8. Raw material for derived artifacts

**CV bullet candidates**

- Built and shipped InvoiceOS, an AI-powered invoicing SaaS, as co-founder — sole author of a Cloudflare Workers + tRPC backend (~100 procedures), SvelteKit/Svelte 5 frontend, and shared packages in a Turbo monorepo (~55k LOC).
- Led two full platform rebuilds: replaced a Hono/Chanfana REST API with a typed tRPC architecture and consolidated a Next.js multi-app layout into a single SvelteKit application, deleting 31k+ lines of superseded code.
- Cut invoice-list latency ~90% (150–400 ms → 10–30 ms) by normalizing JSONB invoice data into relational tables, pushing analytics aggregation into Postgres RPCs, killing N+1 query paths, and adding targeted indexes.
- Designed a zero-downtime migration playbook: idempotent SQL backfills, dual-write with trigger safety nets, parity-check queries, and documented rollback for each of 16 Postgres migrations.
- Caught and fixed a stored-XSS vector in product search; enforced resource-ownership checks, CORS whitelisting, KV-based rate limiting, and RLS-safe `SECURITY DEFINER` migrations.
- Implemented plan-based SaaS billing mechanics (usage tracking, per-plan limits, gating middleware) and an OpenAI GPT-4o invoice parser with confidence scoring and retry/backoff.

**Blog-post angles**

1. *"Your JSONB column is why your dashboard is slow"* — the 0012/0013 migration arc, with the 1.5 MB-per-poll math and the latency numbers (rare: real before/after with documented reasoning).
2. *"Two rebuilds, one product: when to delete your own architecture"* — public-api → tRPC and apphub → SvelteKit, and the discipline of deleting 31k lines you wrote.
3. *"Cookies, domains, and SSR: a cross-subdomain auth debugging story"* — the `9ec026a` saga is universally relatable.
4. *"Migrations that can't run inside your ORM's transaction"* — the `CREATE INDEX CONCURRENTLY` vs Drizzle decision and manual-SQL deployment policy.
5. *"Running a SaaS billing layer before you have a payment provider"* — what it means that Stripe is fully stubbed behind an `IPaymentProvider` interface while usage limits are real.

**LinkedIn headline candidates**

- "Co-founder & engineer behind InvoiceOS — AI-powered invoicing on Cloudflare Workers, built end-to-end: 420+ commits, two platform rebuilds, ~90% latency wins."
- "I built an invoicing SaaS solo on Cloudflare Workers + Supabase — here's what 464 commits and two teardowns taught me."
- "From JSONB to relational: how we cut invoice analytics from 1.5 MB per poll to a single Postgres RPC."

## 9. Caveats for accuracy

- **Attribution**: AeroerMak (co-founder) created the repo, wrote the early static prototypes and several apphub/Next.js pages, all branding assets, and the date-based invoice-numbering commits of Jun 2026 (`f5850bb`, `27b427a`). Don't claim prototypes or branding in CV material.
- **"InvoiceOS" appears nowhere in the repo** — all in-repo naming is Invoice.Lab / `@invoicelab/*` / `invoicelab.live`. The InvoiceOS brand lives outside this codebase; when writing publicly, say "InvoiceOS (Invoice.Lab)" once and move on.
- **Don't claim a live Stripe integration** — the provider is a stub; billing flows simulate calls. Plan limits and usage tracking *are* real.
- **Don't claim AI parsing is live end-to-end** — the parser service is real (`apps/core/src/services/ai-parser.ts`) but no tRPC procedure exposes it; the UI calls `trpc.invoice.parseText`, which has no backend handler. Frame as "built an AI invoice-extraction service" or fix the wiring before claiming the feature.
- **Six-month gap** (2026-01 → 2026-06) in the middle of the timeline; the 2026 hardening work is a 2-day burst (Jun 30–Jul 1). Don't present "perf campaign" as a long engagement.
- **"AI-powered" marketing vs reality**: no OCR/PDF input parsing exists (text-only), and the "template library" is a gallery. The GPT-4o parser itself is real code with sound engineering (temp 0.1, confidence <0.7 review gate, 2 retries exponential backoff).
- **Secrets hygiene**: `apps/core/.dev.vars` contains live-looking Supabase pooler password, service-role key, and Resend API key in plaintext. It is untracked (`git ls-files` confirms), but rotate if it ever left the machine.
- **Generated-file inflation**: always cite the ~87.5k hand-written insertion figure (see §7 footnote), never the raw 130k.

---

# Part II — Technical Reference

Standalone reference so future work never requires re-reading the codebase. Extracted from source at analysis date (2026-10-02, `staging` @ `7c753c8`). Paths relative to repo root.

## 10. System topology

```
                       ┌───────────────────────────── Cloudflare ─────────────────────────────┐
 Browser ──HTTPS──▶  ┌─┴─┐ apps/web (SvelteKit 2 / Svelte 5, Cloudflare Pages, invoicelab.live) │
                       │  │  • SSR hooks.server.ts: cookie-presence route guards                 │
                       │  │  • TanStack Query ── typed tRPC client (credentials:'include') ──┐   │
                       └─┬─┘                                                                   │   │
                       ┌─▼─┐ apps/core (Worker, core.invoicelab.live)                            │   │
                       │  │  • fetch handler: /trpc (tRPC v11 batch), /webhook/invoice-viewed,   │   │
                       │  │    / + /docs (OpenAPI), scheduled() cron                            │   │
                       │  │  • 13 routers (~100 procs) → services → supabase-js ──────┐         │   │
                       │  │  • KV: SESSIONS · INVOICE_ANALYTICS · FILE_STORAGE ·      │         │   │
                       │  │    NOTIFICATIONS · RATE_LIMITS                            │         │   │
                       │  │  • cron 0 0 * * * → check-invoices, cleanup-notifications │         │   │
                       └─┬─┘                                                            ▼         │
                       ┌─▼───────────────────────────────┐   ┌────────────────────────────────┐  │
                       │ External: Resend (email+PDF),   │   │ Supabase Postgres (us-east-1,  │  │
                       │ OpenAI gpt-4o (parser, unused)  │   │ pooler :6543, service-role key │  │
                       │ Stripe (interface only, stub)   │   │ bypasses RLS)                  │  │
                       └─────────────────────────────────┘   └────────────────────────────────┘  │
                       └───────────────────────────────────────────────────────────────────────────┘
```

Who talks to what: the browser talks **only** to the web app; the web app's server talks only to its own tRPC client (no direct DB access from web). Only `apps/core` touches Postgres (service-role key ⇒ RLS bypassed; ownership enforced in service code). KV is written only by core. CORS whitelist in `apps/core/src/index.ts` allows `invoicelab.live`, `app.`, `staging.` variants, and localhost. Dev hazard: `scripts/apply-migrations.mjs` reads DB credentials from `apps/core/.dev.vars` and applies SQL against whatever `DATABASE_URL` points at — verify target before running.

## 11. End-to-end data flows

1. **Login/session** — `POST /trpc auth.login` → `services/user.ts` bcrypt(10) verify against `users` → `utils/auth.ts` mints `nanoid` session id → KV `SESSIONS` set with 7200 s TTL → `index.ts` `responseMeta` sets HttpOnly cookie (`SameSite=None; Secure` cross-subdomain in prod, `Lax` locally). Client then calls `apps/web/src/routes/api/set-session/+server.ts` to mirror the cookie onto the web domain so SvelteKit SSR guards see it (`9ec026a`).
2. **Invoice create (form path)** — `invoices/new/+page.svelte` → `InvoiceForm.svelte` → `trpc.invoice.create` → middleware chain (see §15) → `services/invoice.ts` `Invoice` class: plan-limit check via `usageTracker.trackInvoiceCreation`, **dual-write** JSONB `invoices.items` + normalized `invoice_items` rows (denormalized `company_id`), totals from `packages/utils/src/invoiceTotals.ts`, `invoice_number` assigned by Postgres trigger (`INV-DD/MM/YYYY-NN`, unique per company+number, daily cap 99).
3. **AI parse path (⚠ broken wiring)** — dashboard AI assistant (`apps/web/src/lib/components/ai/AIChat.svelte:94`) calls `trpc.invoice.parseText` — **no such procedure exists** in `src/trpc/router/invoice.ts`. The backend service `src/services/ai-parser.ts` (OpenAI `chat.completions.create`, model `env.AI_MODEL || 'gpt-4o'`, temp 0.1, JSON-mode prompt, confidence score, 2 retries @ 1 s/2 s backoff, currencies hardcoded `['USD','MYR']`) is instantiated in `src/trpc/context.ts:112` but never wired to a router. The path is dead-ended at the service layer.
4. **Share-link view tracking** — visitor opens `share/[shareId]` → `trpc.share.access` (optional password) → `services/invoice-share.ts` reads `invoice_shares`, writes `share_access_logs` → web fires `POST /webhook/invoice-viewed` on the Worker → increments view counters in `INVOICE_ANALYTICS` KV and notifications feed. Failure mode: webhook is fire-and-forget from the client; lost calls are not retried.
5. **Analytics** — dashboard (30 s poll) → `trpc.analytics.*` → `services/analytics.ts` → `supabase.rpc('get_client_performance'|'get_activity_feed')` (Postgres functions from `drizzle/0013_analytics_aggregates.sql`; inner-scan caps 5,000 / 2,000 recent non-draft invoices; each returns exactly N rows) → TanStack Query cache. The old "fetch 1,000 invoices into JS" path is gone (`62ddf29`).
6. **Nightly cron** — `scheduled()` in `src/index.ts` → `src/cron/check-invoices.ts` flips `sent`→`overdue` past `due_date`, emits due-soon notices, batched 25 at a time (the partial index `(status, due_date)` from `9999_performance_indexes.md` serves exactly this scan) → `src/cron/cleanup-notifications.ts` prunes the notifications KV.

## 12. Data model reference

**Store inventory**

| Engine | Store | Contents |
|---|---|---|
| Supabase Postgres (pooler `aws-1-us-east-1.pooler.supabase.com:6543`) | public schema, ~21 tables | All domain + billing data (source of truth) |
| Workers KV | `SESSIONS` | session id (nanoid) → session, 7200 s TTL |
| Workers KV | `INVOICE_ANALYTICS` | per-invoice view/payment counters |
| Workers KV | `FILE_STORAGE` | company logos as base64 JSON (KV chosen over R2 per inline comment; beware 25 MB value cap) |
| Workers KV | `NOTIFICATIONS` | notification feed + per-user prefs |
| Workers KV | `RATE_LIMITS` | per-IP/min counters (non-atomic increments, acknowledged) |

**Main tables** (migrations `apps/core/drizzle/0000…0015`, `9999`):

- `users`, `companies`, `clients`, `products`, `product_categories`, `product_sequences` — serialized human IDs `USR_0001`/`CMP_0001`/`CLI_0001`/`PRD_0001`/`TMP_0001` from `src/utils/id-generator.ts`.
- `invoices` — financial fields (subtotal/tax/discount/total), `status` enum (draft→sent→viewed→paid→overdue→cancelled), **dual-write**: JSONB `items` column + `invoice_number` (`INV-DD/MM/YYYY-NN`, unique `(company_id, invoice_number)`, assigned by trigger, backfill kept hash-ID for old rows to avoid breaking links); hash-based `INV` + 10-char alphanumeric primary ID.
- `invoice_items` — normalized mirror: PK `(invoice_id, line_no)`, FKs to `invoices` (CASCADE) and `products` (RESTRICT), indexes on `product_id` (analytics hot path) and `invoice_id`; kept in sync by app dual-write + `invoice_items_sync_from_jsonb_trg` AFTER-UPDATE trigger (idempotent: delete+insert is a no-op for app writes).
- `invoice_payments` (0010), `invoice_shares` + `share_access_logs` (password hash, view IP/UA/location), `share` numbering sequences (`invoice_number_sequences`/`invoice_sequences`/`client_sequences`).
- Billing: `plans`, `subscriptions`, `usage_metrics` (monthly rows via `services/usage-tracker.ts`), `billing_info`, `payment_methods`, `billing_history`, `stripe_customer_index`.
- Zod mirrors of table shapes: `packages/schemas/src/postgres/*.schema.ts`; input schemas: `packages/schemas/src/inputControllers/`.

**RLS**: enabled by default on tables; service-role bypasses it; `0015_sync_product_usage_from_invoice_items.sql` uses `SECURITY DEFINER` functions precisely because a non-definer trigger "silently wrote 0 rows" against RLS. **Cache**: per-request memoization `RequestCache` for subscription & company lookups (`src/utils/request-cache.ts`).

## 13. Pipeline / processing reference

The only AI stage:

| Stage | Model/call | Writes | Constants |
|---|---|---|---|
| Free-text → invoice JSON | OpenAI `chat.completions.create`, model `env.AI_MODEL \|\| 'gpt-4o'`, temp 0.1, max_tokens 1000 | nothing persisted (service returns parsed object) | confidence 0–1 self-reported (default 0.5, "be conservative"); <0.7 → review warning; retry `parseInvoiceTextWithRetry`: max 2 retries, 1 s/2 s exponential backoff; currencies `['USD','MYR']` |
| PDF generation | client-side jspdf + html2canvas (`apps/web/src/lib/utils/pdf.ts`) | user download | no server PDF API |
| Email | Resend (`src/services/email.ts`) | — | invoice PDF attached base64; batch send supported; `FROM_EMAIL` env |
| Invoice numbering | Postgres trigger (0011/0014 + plan doc) | `invoices.invoice_number` | `INV-DD/MM/YYYY-NN`, daily sequence cap 99, unique per company |

Retry/recovery: OpenAI retries as above; invoice overdue detection retries implicitly via nightly cron; KV writes are best-effort for analytics/notifications. Async triggers: `invoice-viewed` webhook (client-fired), cron (`0 0 * * *`).

## 14. Algorithms

- **Money math** — `packages/utils/src/invoiceTotals.ts` (166 LOC): line total = quantity × unit_price × (1 − discount_rate); normalization of quantities/prices before multiplication; totals preview shared by both apps so client preview == server persistence.
- **Invoice totals & status transitions** — 6-state machine enforced in `services/invoice.ts` + `updateStatus` procedure; `recordPayment` writes `invoice_payments` and moves status.
- **Plan gating** — `gate({resource|feature})` middleware (`src/trpc/middleware/index.ts`) against `src/utils/plan-limits.ts`: FREE 5 invoices/mo, 2 clients, 3 templates; PRO RM29; ENTERPRISE RM99 (MYR cents); usage read from `usage_metrics` monthly rows (with `RequestCache` memoization per request).
- **Rate limiting** — KV counter on `CF-Connecting-IP`, 60 req/min/IP, non-atomic (read-modify-write race acknowledged in comments).
- **Analytics caps** — `get_client_performance` scans ≤5,000 recent non-draft invoices; `get_activity_feed` ≤2,000; both slice to N (10/20 defaults).
- **Search highlight** — `apps/web/src/lib/utils/product-search.ts`: fuzzy match + `highlightMatch`, HTML-escaped after the XSS fix (`1e5d7e2`).

## 15. External services / model catalog

| Operation | Service | Params/notes |
|---|---|---|
| AI invoice parsing | OpenAI Chat Completions | gpt-4o (env-overridable), temp 0.1, max_tokens 1000; **not wired to any router** |
| Transactional email | Resend REST | PDF attachments, batch send, `RESEND_API_KEY` |
| Payments | Stripe via `IPaymentProvider` (`src/services/payment-provider.ts`) | **all calls TODO-stubbed**; tables exist; no webhook receiver |
| DB | Supabase Postgres via `@supabase/supabase-js` REST (PostgREST) | service-role key; drizzle-orm present only for migration-file convention (`drizzle.config.ts` points at a nonexistent schema dir — don't run `drizzle-kit` expecting runtime parity) |

Observability: Cloudflare Workers observability flag on; `src/utils/logger.ts`; Postgres error codes → tRPC errors (`23505` → CONFLICT etc. in `src/trpc/middleware/error-handler.ts`). No Sentry/Axiom.

## 16. API & auth reference

- **Transport**: single endpoint `/trpc`, tRPC v11 HTTP batch via `fetchRequestHandler` (`src/index.ts`). `appRouter` = 13 sub-routers (`src/trpc/router/index.ts`): auth, user, company, client, invoice, subscription, billing, share, analytics, product, storage, email, notifications. ~52 queries + ~48 mutations. Hand-written OpenAPI subset at `apps/core/api-docs/api-spec.yaml` (532 lines, only auth/user/company), served at `/docs`; a Zod→OpenAPI generator exists (`src/utils/openapi-generator.ts`) but is not enforced.
- **Middleware order** (per procedure): Zod input validation → `requireAuth` (protected procedures) → `gate()` plan/usage check → KV rate limiter (60 req/min/IP) → service layer; errors normalized by `error-handler.ts`.
- **Auth mechanics**: bcrypt(10) password hash in `users`; session = `nanoid` in `SESSIONS` KV, 7200 s TTL; HttpOnly cookie set via tRPC `responseMeta` (`SameSite=None; Secure` prod / `Lax` local); cross-domain SSR handled by `/api/set-session` bridge; Supabase Auth is **not** used — auth is fully custom. No per-user RLS policies for app reads; ownership enforced in service code (`376bb5d` hardening added missing checks).
- **Client access**: typed tRPC proxy (`apps/web/src/lib/trpc.ts`, `credentials: 'include'`) wrapped in TanStack Svelte Query (`src/lib/tanstack-trpc.ts`); core URL injected at build time via `VITE_CORE_URL` (`apps/web/ENVIRONMENT.md`).
- **Webhooks in**: only `POST /webhook/invoice-viewed`. No Stripe receiver.

## 17. Scheduling & queues

| Schedule | Job | Behavior |
|---|---|---|
| `0 0 * * *` (Worker cron) | `src/cron/check-invoices.ts` | `sent`→`overdue` past due date; due-soon notices; batches of 25 |
| `0 0 * * *` | `src/cron/cleanup-notifications.ts` | prunes notifications KV |

No queues, no Durable Objects, no DLQ. Async work is: client-fired webhook, cron, and Postgres triggers.

## 18. Bindings, secrets & deployment

**Bindings** (`apps/core/wrangler.jsonc`, compatibility_date 2025-07-15, `nodejs_compat`, observability on): 5 KV namespaces (§12), cron trigger, no R2/D1/Queues/DO/service bindings. **Secrets** (names only): `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY` (service-role), `RESEND_API_KEY`; optional `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `AI_MODEL`, `FROM_EMAIL` (`src/env.d.ts`).

**CI/CD** (`.github/workflows/deploy-staging.yml`, on push to `staging`): pnpm install → `turbo build` of `@invoicelab/{schemas,types,utils}` → `wrangler deploy` core (⚠ `--env staging` is a no-op: wrangler.jsonc has no env sections) → SvelteKit build with `VITE_CORE_URL=https://staging-core.invoicelab.live` → `wrangler pages deploy` to Pages project `invoice-lab` (branch `staging`). No test/lint/type gates in CI. **Migrations** are *not* in CI: applied manually via `scripts/apply-migrations.mjs` (idempotent runner reading `apps/core/.dev.vars`); `9999_performance_indexes.md` applied via Supabase SQL Editor because `CREATE INDEX CONCURRENTLY` cannot run inside Drizzle's transaction wrapper. Rollback per migration documented in each companion `.md`.

## 19. Operational gotchas & key file map

**Gotchas**

1. **`trpc.invoice.parseText` doesn't exist** — the AI chat UI calls it (`AIChat.svelte:94`); the parser service is orphaned at `src/trpc/context.ts:112`. Either wire a procedure or remove the UI; don't demo the AI assistant as-is.
2. **Wrangler env no-op** — `deploy:staging`/`deploy:production` scripts and CI pass `--env staging`/`--env production` but `wrangler.jsonc` defines no envs; both deploy the same top-level config.
3. **Service-role key bypasses RLS** — table-level RLS is not a defense here; every ownership check lives in service code. A new service procedure without an ownership check is a data-leak bug (`376bb5d` fixed several).
4. **Dual-write is non-atomic** (documented in `0012_…md`) — JSONB and `invoice_items` can diverge on crash between writes; the sync trigger is the safety net; plan to wrap in a Postgres RPC.
5. **KV rate limiting is non-atomic** — bursts can exceed 60 req/min/IP.
6. **Logos live in KV as base64 JSON** — 25 MB KV value cap; revisit before accepting large uploads.
7. **Docs lie about storage** — `apps/core/README.md` / `CURRENT_FEATURES.md` describe KV-only + HYPERDRIVE; reality is Supabase Postgres + 5 KV namespaces. Trust the migration companion `.md` files instead.
8. **Auth cookie split across domains** — the `/api/set-session` bridge is load-bearing for SSR guards; don't "simplify" it away.
9. **Invoice numbering daily cap of 99** — per company per date (`4f307a5`); a >99-invoice day will hit constraint retries.
10. **Drizzle is convention, not runtime** — runtime DB access is supabase-js/PostgREST; `drizzle-kit` commands won't reflect reality.

**Key file map**

| Topic | Where to look |
|---|---|
| Worker entry, CORS, cron, webhooks | `apps/core/src/index.ts` |
| tRPC routers (~100 procs) | `apps/core/src/trpc/router/*` |
| Middleware chain (auth, gate, rate limit, errors) | `apps/core/src/trpc/middleware/` |
| Domain services (invoice, analytics, share, usage) | `apps/core/src/services/` |
| AI parser | `apps/core/src/services/ai-parser.ts` |
| Plan limits & pricing | `apps/core/src/utils/plan-limits.ts` |
| Money math | `packages/utils/src/invoiceTotals.ts` |
| Zod schemas (input + table mirrors) | `packages/schemas/src/` |
| Migrations + the real architecture docs | `apps/core/drizzle/*.sql` and matching `*.md` |
| Invoice numbering plan + SDD ledger | `docs/superpowers/plans/2026-06-30-…md`, `.superpowers/sdd/` |
| Feature inventory (stale re: storage) | `apps/core/CURRENT_FEATURES.md`, `apps/core/BETA_FEATURES.md` |
| Web route guards | `apps/web/src/hooks.server.ts` |
| tRPC client + query layer | `apps/web/src/lib/trpc.ts`, `apps/web/src/lib/tanstack-trpc.ts` |
| Client PDF export | `apps/web/src/lib/utils/pdf.ts` |
| Deploy pipeline | `.github/workflows/deploy-staging.yml`, `apps/web/ENVIRONMENT.md` |
| Ops scripts | `scripts/apply-migrations.mjs`, `scripts/verify-db.mjs` |

---

*End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially.*
