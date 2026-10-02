# MC² Finance — User-Facing Monorepo (mc2.mono) Writeup

> **Internal document — not for publication.**
> Repo analyzed: `/Users/dibakar/Downloads/Projects/mc2/mc2.mono`
> Analysis date: 2026-10-02 · Total commits: 4,671 · Span: 2023-12-31 → 2025-11-05
> Companion document: `internal/mc2-service-mono-writeup.md` (the backend services monorepo — read together for the full platform picture).
> Naming MC² is approved for public use; see §9 for what must stay private.

---

# Part I — Narrative & Achievement View

## 1. TL;DR

MC² Finance's user-facing platform — a Nuxt 3 web app (app-hub), a public API for third parties, and a wallet-authenticated secure API, all on Cloudflare — was built by a rotating team of ~12 contributors in this Turborepo. **Dibakar Sutra Dhar was the backend/API specialist: 225 commits (Apr 2024 → Nov 2025) owning the secure-api's portfolio, strategy, token, and auth surface, the shared ORM query layer, and the frontend-facing calculators (ROI, Trade Return Volatility).** He was also the first substantive backend committer and the repo's final committer — the one who executed the November 2025 sunset of all five API workers. One ready-to-adapt CV summary sentence:

> *Built the API layer of MC² Finance's DeFi analytics platform — 108 zod-validated OpenAPI endpoints across public and wallet-authenticated Cloudflare Workers (Hono), the portfolio/strategy/token query layer in shared Drizzle ORM, and the wallet-signature auth system — across a Nuxt 3 + Turborepo monorepo with ~12 contributors.*

## 2. The product

Positioning (from `apps/app-hub/nuxt.config.ts`): *"MC² Finance | Your new home for DeFi | Analyze | Discuss | Invest"* — a DeFi portfolio marketplace where users analyze wallets/portfolios/tokens, follow traders, and invest through on-chain trade execution. Target users: DeFi retail investors (wallet-based auth only) plus third-party developers on the public API.

| Feature | What it did |
|---|---|
| Portfolio marketplace | Browse/rate top DeFi portfolios and strategies (SSR-indexable pages) |
| Portfolio creation wizard | Two-step flow: create portfolios from wallets, track composition, daily returns, trades |
| On-chain trading ("shopify" module) | Cart-based token buying via LI.FI, Enso, Bebop with ERC-4337 smart wallets (ZeroDev, Biconomy) |
| Token analytics | Per-token performance, authenticity/hype/pressure/validity scores, TradingView/DexScreener charts |
| Bitcoin insights | Fear & Greed, Golden Ratio, Pi Cycle, Puell Multiplier indicators |
| Albert AI assistant | AI agent chat (WebSocket to `agents.mc2.fi`) + AI insight cards |
| Social layer | Follow users/tokens/portfolios, feeds, notifications, watchlists, Telegram bot, "claps" |
| Smart-wallet studio | Strategy → smart-wallet deployment with session-key signers |
| OAuth provider | MC² issued OAuth authorizations to third-party apps |
| Public API | 43 OpenAPI endpoints (trending tokens, competitions, stats, sitemaps, screenshots) |

## 3. Architecture (summary level)

- **Apps (7):** `app-hub` (Nuxt 3.15 SSR on Cloudflare Pages, 31,615 LOC, 171 components, 21 pages, 37 composables), `secure-api` (Hono Worker, 65 endpoints, wallet-sig auth), `public-api` (Hono Worker, 43 open endpoints), `studio-api` (thin wallet API delegating to secure-api via service binding), `bot-api` (Telegram), `social-interactions-service` (D1 claps service), `analytics` (daily Monte-Carlo/stats cron Worker).
- **Shared packages:** `shared-orm` (Drizzle schemas + 11 query modules over Postgres `signals_v2` schema), `cf-adapters` (env class, external API clients, calculators, KV/session adapters, Datadog metrics), `ui` (Vue 3 + daisyUI design system, 20 base + 14 layout families), `types`, `storybook`.
- **Data:** central Postgres (RDS, Hyperdrive) + TimescaleDB; sessions/claps in KV/D1; screenshots in R2 via Browser Rendering; search in Typesense. Queue producers here fed consumers in the backend service-mono.
- **Auth:** wallet-signature sessions (Solana Ed25519 via tweetnacl; EVM EIP-191 via wagmi on 5 chains), 48h KV sessions, bearer format `address:sessionkey`.
- **API split rationale** (`.cursor/rules/global.mdc`): public-api = anonymous/SSR-indexable reads; secure-api = per-user read/write; the app talks to both through typed Hono RPC clients (`apps/app-hub/api/mc2api.ts`).
- **Boundary with backend repo:** all heavy compute (AI insights, queue consumers, Durable Objects, cron ETL) lives in `mc2.service-mono`; this repo only enqueues and reads.

## 4. The story: how the project evolved

| Epoch | Period | Theme |
|---|---|---|
| Scaffold & React alpha | Dec 2023–Feb 2024 | create-turbo scaffold; React alpha (leaderboard, clap service) **abandoned** (`b668a0f1`). |
| Nuxt pivot | Feb 2024 | `app-hub` initialized on Nuxt 3 (`c337eb5d`) — the framework decision that stuck for the rest of the repo's life. |
| Strategy era | Mar–Jul 2024 | Create-strategy flows, dashboard, price alerts. **Dibakar joins 2024-04-09** (`6aaee326`). "MC² Finance" naming (`72f6c47e`, Jun 2024). |
| Portfolio epic | Oct–Dec 2024 | Peak months (434 commits in Oct). Dibakar builds the entire portfolio API surface (~35 commits) and the calculator layer (ROI, TRV). Aleem & Emmanuel join. |
| Scale era | Jan–May 2025 | Mar 2025 = all-time peak (631 commits): Albert AI agents, social graph, Shopify trade integration, Nuxt 3.15/3.16. Dibakar migrates wallets to the `signals_v2` schema and wires the portfolio workflow queue (Apr). |
| Wind-down | Jun–Aug 2025 | Release cycles only ("Cycle 49" = PR #876); final feature commit 2025-08-01. Core team churns out May–Jun. |
| Sunset | Nov 2025 | **2025-11-05:** Dibakar alone retires all five API workers with 410-Gone middleware (`60711e44`, `30938935`, `d6676352`, `2830882d`). Only app-hub and the analytics cron remain live. |

After the core team's feature work stopped (May–Aug 2025), the platform ran unchanged for three months until Dibakar's sunset pass. The user-facing APIs' function was consolidated into the backend services monorepo.

## 5. The user's contributions in detail

### Ownership map

225 commits (Apr 2024 → Nov 2025) — 4.8% of the repo, but concentrated almost entirely in the backend/API half that the UI-heavy majority didn't touch:

| Area | Dibakar's touches | Reading |
|---|---|---|
| `apps/secure-api/**` | ~240 file touches (strategies routes/services 43+43, token 33+20, auth 24+17, portfolios 17+15) | Sole owner of the secure API's portfolio/strategy/token logic; **co-owner of auth** (16 touches vs Christoph 13 on `auth.ts`) |
| `packages/shared-orm` | 34 query + 19 schema touches | Principal author of the portfolio/token query layer |
| `apps/public-api/**` | ~30 | Portfolio/stats/token read endpoints |
| `apps/studio-api` | 12 | Wallet endpoints |
| `packages/cf-adapters` + `packages/types` | 13 + 12 | Calculators, env methods, shared types |

The rest of the team split the frontend: Sarmad (1,545 commits, app-hub UI/CI), alphajeez/Prince Chukwudire (900, components/releases), Emmanuel (571, Shopify trading + Telegram), Aleem (513, search + Twitter/X + Albert agents backend), Christoph (490, auth + onboarding + Albert UX), Ashmeet (165, cross-chain wallets).

Raw diff: 18,738 ins / 22,290 del — but **55–90% is generated** (`pnpm-lock.yaml` + `bun.lockb` + `*.d.ts` = 10,289 ins / 20,177 del; the largest single commit, `9867bfba`, is a 19,958-line lockfile revert). Real code volume ≈ **8,400 insertions / 2,100 deletions** — the highest code-efficiency per commit of any major contributor in this repo (~37 net real lines/commit vs ~145 for Sarmad).

### Thematic breakdown (all epics, with representative hashes)

1. **Strategy metrics APIs (May–Jun 2024, ~40 commits):** total invested/ROI (`2821e8ed`, `59df787a`), trades-per-week (`5bb65797`), trades volatility (`70c7e076`), networth (`85810231`), trending tokens via Mobula (`2a7b142b`), portfolio composition & daily return (`fc7c8d3a`, `3517ca5b`), strategy v3 (`23366044`). First epic one month after joining.
2. **Ingestion pipeline integration (Jun & Sep 2024):** `Ingestor` class (`504e3470`), AWS ingestor service bindings (`edf8cc1b`), per-strategy wallet ingestion on creation (`4b2826f0`), Datadog success/fail metrics (`9ab131cf`).
3. **Token intelligence (Aug–Sep 2024):** token overview stats (`607d4924`), optimized stats route (`eb6b255b`), follow services (`703f7dbf`), underperforming-tokens-by-unrealized-gains (`1d67a8c1`).
4. **Portfolio module build-out (Oct–Nov 2024, ~35 commits — biggest epic):** from the first `Portfolio` class (`0abab655`, Oct 2) through `PortfolioQueries` (`737bd516`), getPortfolioById + metrics + trades (`91954e4c`, `de6e0486`), invested-amount (`feda9053`), daily-return schema+route (`7719f6eb`, `e8243be8`), composition (`f6131505`), token allocation refactor (`6518ed4d`), the `/v1/portfolios` API rename (`ba2f89ca`), multi-chain asset details + `TokenQueries` class (`99e126b5`, `4f16ce81`).
5. **Calculator layer (Nov–Dec 2024):** `RoiCalculator` (`a966a0f4`) + ROI history table (`a531ce27`); **`TRVCalculator`** for Trade Return Volatility (`323c00ec`, 180 lines in `packages/cf-adapters/src/trvCalculator.ts`) with wallet-performance query backing (`858a5e9f`) and endpoint integration (`a7160a4e`).
6. **Wallet/signals_v2 migration + workflow wiring (Apr 2025):** new wallet table & enums in `signals_v2` (`c0f45dc6`), old enums deprecated (`91d2271b`), portfolio queries cut over to the new schema (`d93c7a0d`, PR #629); `sendToPortfolioWorkflowV2Queue` added to `Mc2Env` and integrated into wallet ingestion (`5f6354d6`, `3f8acc7d`, PR #593) — connecting user actions to the backend repo's Cloudflare Workflow pipeline.
7. **Auth hardening & infra (persistent thread):** auth hotfixes (`235eda73`, PR #104), Datadog debugging series (`2e741253`, `068bcfea`), wrangler version/compat bumps, Timeseries binding, deploy workflows.
8. **The sunset (Nov 2025, 4 commits):** converted public-api, secure-api, studio-api, bot-api, and social-interactions-service to return `410 Gone` for every request, with wrangler config trims and documented deprecation READMEs — clean decommission in a single afternoon.

### Signature engineering moments

- **The portfolio API from zero** (Oct–Nov 2024): in three weeks he went from a 48-line `Portfolio` class (`0abab655`) to a complete portfolio read surface — metrics, composition, daily returns, trades-per-week, invested amounts — with typed zod-OpenAPI schemas and a reusable `PortfolioQueries` class in the shared ORM. This is the substrate the marketplace UI rendered.
- **TRVCalculator as a shared-package calculator** (Dec 2024, `323c00ec`): rather than burying the Trade Return Volatility math in a route handler, he put it in `packages/cf-adapters` with interfaces (`iTradeReturnUIResult`) shaped for the UI, backed by new wallet-performance queries — the pattern that kept calculation logic reusable across public/secure/studio APIs.
- **The signals_v2 cutover** (Apr 2025): executed the wallet-table migration the whole data platform was waiting on — new schema + enums, deprecation markers on the old tables (`packages/shared-orm/src/schemas/wallets.ts` carries `@deprecated use signals_v2.*` to this day), portfolio queries switched over, and the portfolio workflow queue wired into wallet ingestion in the same month. Coordinated as PRs #593/#613/#629.
- **Auth under real constraints** (co-owned with Christoph): implemented SIWA-style wallet-signature sessions — Solana Ed25519 via tweetnacl with Base58 pubkey decoding, EVM EIP-191 via wagmi across mainnet/BSC/polygon/arbitrum/base — issued as 48h KV sessions with a `address:sessionkey` bearer format (`apps/secure-api/src/auth/auth.ts`, `authMiddleware.ts`). Known sharp edges recorded in §9/§19.
- **Turning off the lights** (Nov 2025, `60711e44` et al.): after three months of repo silence, decommissioned all five request-serving workers with 410 Gone middleware + deprecation READMEs + config trims — the reversible, documented pattern he'd also used in the backend repo's sunset a week earlier.

### Commit hygiene

Textbook Conventional Commits — `type(scope): summary`, scopes always present, occasional explanatory bodies (e.g., `21e254d0` explains a Promise.all optimization). Best message hygiene among the repo's seven major contributors (vs Sarmad's informal one-liners, alphajeez's "retry build", Ashmeet's Title Case freeform).

## 6. Engineering practices observed

- **Testing: none.** Zero `*.test.ts`/`*.spec.ts` files repo-wide; no test CI workflow; `turbo.json` defines no test task. The only verification gates were build success and **Datadog Static Analysis** (8 security/quality rulesets, `static-analysis.datadog.yml`) — plus one Ply API-test fixture in `results/`.
- **CI/CD:** three deploy-only workflows — `main`→production, `staging` branch→staging, **git tags `dev/*`→dev environment** (a cheap per-feature-branch deployment trick). app-hub to Cloudflare Pages. Signed Turbo remote cache.
- **Release discipline:** numbered "Cycles" (PRs up to #901), staging→main release merges.
- **Docs culture:** `.cursor/rules/` carried the real standards (env only via `mc2env`, schemas only in `shared-orm`, edge-optimized stateless code); otherwise doc density was very low — no ADRs/runbooks; incident knowledge in `.specstory/` AI transcripts.
- **Recorded tech debt:** CORS `*` with a `// TODO` in both APIs, auth salt weakness, session logging, dead `shared-services` stub, committed credentials (see §9).

## 7. Numbers worth quoting

| Metric | Value | Trace |
|---|---|---|
| Total commits / Dibakar's share | 4,671 / **225 (4.8%)** | `git shortlog -sne` |
| Tenure | 2024-04-09 → 2025-11-05 (first & last backend committer) | `6aaee326` → `2830882d` |
| Secure API endpoints | 65 (zod-OpenAPI) | `createRoute` count, `apps/secure-api` |
| Public API endpoints | 43 | `createRoute` count, `apps/public-api` |
| Dibakar raw diff | 18,738 ins / 22,290 del (**~10k/20k generated**; real ≈ 8.4k / 2.1k) | `git log --numstat` |
| Portfolio epic | ~35 commits in 3 weeks (Oct–Nov 2024) | git log |
| TRVCalculator | 180 LOC shared calculator + wallet-performance query layer | `323c00ec` |
| secure-api file ownership | ~240 file touches (top author by far) | `git log --name-only` |
| app-hub scale | 171 components, 21 pages, 37 composables, 16 stores | find/wc |
| Team peak | 631 commits/month (Mar 2025) | month-by-month log |
| PR merges by Dibakar | 22 | merge-commit count |
| Workers sunset in one day | 5 (2025-11-05) | `60711e44`…`2830882d` |
| Contribution efficiency | ~37 net real lines/commit — highest among 7 major contributors | agent calc from numstat |

## 8. Raw material for derived artifacts

**CV bullet candidates:**
- Built the API layer of MC² Finance's DeFi analytics platform — 108 zod-validated OpenAPI endpoints across public and wallet-authenticated Cloudflare Workers (Hono).
- Implemented SIWA-style wallet-signature authentication (Solana Ed25519 + EVM EIP-191) with 48-hour KV-backed sessions across five EVM chains and Solana.
- Designed and shipped the platform's entire portfolio analytics read surface — composition, daily returns, ROI, trades-per-week, and a shared Trade Return Volatility calculator — over Drizzle ORM on Postgres.
- Executed the `signals_v2` wallet-schema migration, cutting portfolio queries over to the new canonical on-chain data model and wiring user actions into the backend workflow pipeline via Cloudflare Queues.
- Co-owned a Nuxt 3 + Turborepo monorepo (4.7k commits, ~12 contributors) with the team's strongest commit hygiene; acted as release manager for 22 staging→production PRs.
- Decommissioned five production Cloudflare Workers in a single documented sunset (410 Gone with deprecation notices), closing out the platform.

**Blog-post angles:**
- *"Wallet signatures as sessions: SIWA auth in practice"* — real implementation detail (tweetnacl vs wagmi paths, KV session shape, bearer format) plus honest sharp edges (weak salt entropy).
- *"Two monorepos, one platform: splitting user-facing APIs from heavy compute"* — the public/secure/service split, queue handoff between repos, and typed Hono RPC between frontend and Workers.
- *"The highest-leverage commits in a UI-heavy repo are the ones nobody sees"* — 4.8% commit share owning 100% of the API surface; a case for measuring ownership by territory, not volume.
- *"How to sunset a product without breaking it"* — paired with the service-mono writeup: two clean decommissions in two weeks (410 Gone vs binding-commenting).

**LinkedIn headline candidates:**
- Backend engineer @ MC² Finance — Hono/Cloudflare Workers APIs, wallet auth, portfolio analytics for a DeFi platform.
- Built the API layer of a DeFi analytics platform: 108 OpenAPI endpoints, wallet-signature auth, Drizzle/Postgres at the edge.

## 9. Caveats for accuracy (anti-overclaim checklist)

- **Do not claim:** the app-hub frontend (Sarmad/alphajeez/Hamza/Ashmeet), the Shopify on-chain trading module (Emmanuel), search & Twitter/X integration and Albert agents backend (Aleem), Albert AI UX & onboarding (Christoph), the design system (Sarmad/alphajeez). Auth is **co-owned** with Christoph — say "co-implemented" or focus on the Solana path and session mechanics.
- **Scale honesty:** 225/4,671 commits is 4.8% — always pair the commit count with the ownership claim (sole owner of the API surface), never quote it as "built the frontend."
- **Numbers hygiene:** never quote 18.7k insertions without the generated-file footnote (10.3k/20.2k is lockfile/`*.d.ts`); the sunset commit `60711e44` is 10.5k lines of lockfile churn plus ~60 real lines.
- **Terminology:** the on-chain trading module is internally called "shopify" (`components/shopify/`, `composables/shopify/`) but has nothing to do with Shopify the e-commerce company — do not describe it as a Shopify integration in public materials. The "claps" service = likes. "Albert" = the AI persona (lives in the backend repo).
- **Repo is retired:** all five request-serving workers return 410 since 2025-11-05; only app-hub (as of that date) and the analytics cron were live. Describe API work in past tense; the live successors are in `mc2.service-mono`.
- **Keep out of public artifacts (confidentiality — verified committed in the repo):**
  - **Staging Postgres credentials in comments** in six `wrangler.toml` files (username `old_server`, RDS host `postgres-staging-1.c6lx5l1o8zsf…`), and **Timescale Cloud credentials** in secure-api/public-api wrangler.tomls.
  - **Hardcoded third-party API keys in frontend source** (shipped to browsers): LI.FI (`useLifiConfig.ts:10`), Enso (`useBebopConfig.ts:10`), Aarc (`nuxt.config.ts:209`), Typesense search key (`utils/typesenseConfig.ts:29`).
  - **Auth weaknesses** (weak 4-digit salt via `Math.random()`, full session objects `console.log`-ed with logpush enabled, CORS `*`) — fine to discuss as lessons learned, not as a live system's exposure.
  - Infra identifiers (KV/D1/Hyperdrive ids, Notion database ids) — low sensitivity, but unnecessary in public material.

---

# Part II — Technical Reference

Standalone reference extracted from source at analysis date (2026-10-02). Paths relative to repo root. Status: all request-serving workers return 410 Gone since 2025-11-05; this describes the system at full operation.

## 10. System topology

```
                       ┌───────────────────────────────────────────────┐
  Browser ──SSR/pages──▶ app-hub (Nuxt 3, Cloudflare Pages, app.mc2.fi)
      │ typed Hono RPC (hc<SecureApiType>/hc<PublicApiType>)
      ├──▶ public-api (Worker, 43 open endpoints, CORS *)
      ├──▶ secure-api (Worker, 65 endpoints, wallet-sig auth)
      │         │  session KV (mc2sessions) · Hyperdrive → Postgres · queues ─▶ service-mono consumers
      └──▶ studio-api ──service binding──▶ secure-api (SecureService)
  Telegram bot ──▶ bot-api (NOTIFY_QUEUE producer)
  Claps UI ──▶ social-interactions-service (D1 + CLAPS_KV rate-limit)
  Cron 01:00 ──▶ analytics (MonteCarlo KV refresh + DB stats)
  Shared: packages/shared-orm (Drizzle) · cf-adapters (env, APIs, calculators) · ui/ui-nuxt
```

Who talks to what: app-hub is the only UI; the frontend imports worker types as workspace deps for typed RPC (`apps/app-hub/api/mc2api.ts`). Queue producers here (`PORTFOLIO_ETL_QUEUE`, `PORTFOLIO_WORKFLOW_V2_QUEUE`, `WALLET_QUEUE`, `NOTIFY_QUEUE`, `TOKENS_QUEUE`) are consumed by the backend services monorepo — the cross-repo seam. Postgres is shared with the backend repo via the same Hyperdrive endpoints; this repo owns no migrations (`shared-orm/migrations-folder` is absent — DDL was managed elsewhere).

## 11. End-to-end data flows

1. **Anonymous browsing (SSR):** Nuxt SSR page → vue-query (24h staleTime/gcTime) → typed RPC to public-api → Drizzle over Hyperdrive → Postgres/Typesense; SWR route rules (`/top-50` 3600s, `/portfolios` 1800s).
2. **Wallet login:** client requests salt → `Auth.getSalt()` (`apps/secure-api/src/auth/auth.ts`) issues salt + `sessionkey` UUID, stores session in KV (`s.{address}`, 48h TTL) → client signs → `Auth.authenticate()` verifies tweetnacl (Solana) or wagmi `verifyMessage` (EVM) → `Authorization: Bearer <address>:<sessionkey>` on all subsequent calls (`authMiddleware.ts`) → `completeProfile()` upserts `tbl.user` + mirrors into Typesense.
3. **Portfolio creation:** app-hub wizard → secure-api `/strategies` → wallet ingestion → `Mc2Env.sendToPortfolioWorkflowV2Queue` (`packages/cf-adapters/src/mc2env.ts`) → backend repo's workflow consumes; failed wallet creation is cleaned up (`caf89ba6`).
4. **On-chain trade:** cart → `composables/shopify/` → LI.FI/Enso/Bebop quotes → ERC-4337 execution via ZeroDev paymaster/bundler (session keys in browser) → transaction progress UI.
5. **Screenshots/OG:** `pages/screenshot/[type]/[id].vue` → public-api `/screenshots` → Browser Rendering (`@cloudflare/puppeteer`) → R2 bucket `files`.
6. **Daily analytics:** cron `0 1 * * *` → `apps/analytics` → MonteCarlo snapshot refresh to KV (`mc2.montecarlo`; dev fallback `montecarlo.dev.json`, 41 wallets) + `StatsLogger.logStats`.

Failure behavior: queue sends are fire-and-forget with backend-side retries/DLQs (backend repo's config); API workers had no in-repo rate limiting except the claps KV limiter (`social-interactions/src/clap/`); no circuit breakers.

## 12. Data model reference

| Engine | Store | Contents |
|---|---|---|
| Postgres (Hyperdrive) | `mc2fi` db | all product tables via shared-orm |
| TimescaleDB | `tsdb` | wallet time-series (Hyperdrive `TIMESERIES`) |
| KV `mc2kv` / `mc2sessions` / `CLAPS_KV` | — | price/misc cache, auth sessions (48h), clap rate limits |
| D1 `social-interactions` | — | claps counters |
| R2 `files` | — | screenshots |
| Typesense | token/portfolio collections | search (Algolia-style instantsearch in app-hub) |

- **Schemas** (`packages/shared-orm/src/schemas/`): `signals.ts` defines the canonical **`signals_v2`** pgSchema — `assets`, `asset_prices`, `actions` (per-tx transfers with `usd_value`, jsonb), `signals`, `signal_actions`, `intents`, `intents_histories`, `wallet_balance_state`, `performance_v1`, `blacklisted_wallets`, `wallets` + enums (action SEND/RECEIVE; signal SWAP/BUY/SELL). `wallets.ts` holds the **deprecated** public wallet tables (`@deprecated use signals_v2.*`): `wallets`, `wallet_performance_history`, `wallet_scores`, `wallet_tags`, `roi_history`. `portfolios.ts`: `portfolios`, `portfolio_performance_history`, `wallet_assets`. `user.ts`, `tokens.ts`, `awards.ts`, `followers.ts`, `notifications.ts`.
- **Query classes** (`src/queries/`, hand-written Drizzle/raw SQL): `portfolios`, `tokens` (a class, `99e126b5`), `signals`, `walletPfm`, `users`, `awards`, `followers`, `notifications`, `telegram`.
- **Session shape** (`packages/cf-adapters/src/kv/sessions.ts`): key `s.{address}` → JSON `{address, sessionkey, role, …}`.
- **Cache keys:** `mc2.montecarlo` (risk/reward per wallet, monthly buckets, fields `opt_alpha`, `es_rd`), `albert_insight__*` (backend-owned).

## 13. Pipeline / processing reference

| Stage | External call | Writes to | Constants |
|---|---|---|---|
| Wallet auth | EVM RPCs (5 chains) / Solana pubkey | KV session | salt 0–10000, TTL 48h, sessionkey UUIDv4 |
| Portfolio audit (`/internal`) | — | none (read) | fans out wallets→signals→users (heaviest query path) |
| Trending/stats reads | Mobula | Typesense/KV | zod-validated route schemas |
| Screenshot | Browser Rendering | R2 `files` | `@cloudflare/puppeteer` |
| Trade execution | LI.FI, Enso, Bebop | chain (via ZeroDev ERC-4337) | slippage alerts, approvals flow |
| Monte Carlo | — | KV `mc2.montecarlo` | daily 01:00 cron; per-wallet risk/reward |
| Metrics | Datadog EU | custom metrics | per-env prefix `{environment}.metric` |

## 14. Algorithms

- **Trade Return Volatility** (`packages/cf-adapters/src/trvCalculator.ts`, `TRVCalculator1` exported as `TRVCalculator`): per-wallet and per-portfolio TRV computed from `WalletPerformanceQueries` + `PortfolioQueries`, output shaped as `iTradeReturnUIResult` axis data for the UI charts. Replaced an older inline TRV method (`858a5e9f`).
- **ROI** (`packages/cf-adapters/src/roiCalculator.ts`): frontend-facing portfolio ROI aggregation backed by the ROI history table (`a531ce27`); the heavy ROI math lives in the backend repo's ROICalculator4 (see companion doc §14).
- **Monte Carlo risk/reward** (`packages/cf-adapters/src/kv/montecarlo.ts` + `apps/analytics`): per-wallet monthly risk/reward snapshots with `opt_alpha` and expected-shortfall `es_rd`; computed daily, cached in KV, dev-fallback snapshot committed.
- **Session auth verification:** Ed25519 `sign.detached.verify` (tweetnacl) for Solana; EIP-191 `verifyMessage` (wagmi) for EVM; salt+message signing, 48h session window.

## 15. External services / model catalog

Transport: all API clients in `packages/cf-adapters/src/apis/` on a `superApi` base (itty-fetcher with edge caching `cacheEverything` + status-based TTLs); keys only via `Mc2Env` getters.

| Operation | Service | Where |
|---|---|---|
| Wallet/market data | Moralis v2.2, DeBank, CoinMarketCap v3, Mobula | `cf-adapters/src/apis/*` |
| Solana RPC | Helius | `services/solanaWalletValidator.ts` |
| Social identity | Twitter/X API v2 + OAuth | `twitterOauthApi.ts`, `secure-api/src/community/oauth.ts` |
| Search | Typesense (+ app-hub instantsearch adapter, custom fork) | `typesenseApi.ts` |
| Trade execution | LI.FI, Enso, Bebop, Aarc fundkit, ZeroDev, Biconomy | app-hub composables, studio-api |
| Monitoring | Datadog (RUM + custom metrics + static analysis) | plugins, `metrics.ts` |
| Admin data | Notion | `bot-api/src/admin/notion.ts` |

No LLM calls originate in this repo — AI (Albert) lives in the backend services monorepo; app-hub talks to it via `wss://agents.mc2.fi`.

## 16. API & auth reference

- **Middleware order (secure-api):** deprecation middleware (now first, 410) → CORS `*` → `authMiddleware` on everything except `/doc`, `/`, `/auth/*`.
- **Route groups:** public-api `/token`, `/strategy`, `/stats`, `/award`, `/v1/portfolios`, `/feeds`, `/users`, `/community`, `/screenshots`; secure-api `/auth`, `/user`, `/notify`, `/strategies`, `/token`, `/feeds`, `/community`, `/v1/portfolios`, `/internal`, `/metrics`.
- **Auth:** bearer `<address>:<sessionkey>`; sessions in KV with 48h TTL; role stored in session; error codes cataloged in `apps/app-hub/constants/errors.json` (R0007 unregistered, R0008 blocked, R000S suspended, R0010 invalid signature).
- **Client access:** typed Hono RPC (`hc<SecureApiType>`), per-hostname env routing in `composables/useMcApi.ts` (`secureApi`/`secureStagingApi`/`*DevApi` by window hostname).
- **Weaknesses (documented, now historical):** 4-digit predictable salt, session JSON logged to console with logpush on, CORS `*`, no worker-level rate limiting (except claps), no Cloudflare Access.

## 17. Scheduling & queues

- **Cron:** `apps/analytics` `0 1 * * *` (the only cron in this repo; live-mode only per its README).
- **Queues (producers only, sunset-commented):** `TOKENS_QUEUE`, `PORTFOLIO_INSIGHTS_QUEUE` (public-api); `NOTIFY_QUEUE`, `PORTFOLIO_WORKFLOW_V2_QUEUE`, `WALLET_QUEUE`, `PORTFOLIO_ETL_QUEUE` (secure-api → backend's `portfolio-etl-do-*` Durable Object consumers). Message contracts live in the backend repo.
- **Triggers:** dev deploys by git tag `dev/*`; branch→env mapping: `main`→prod, `staging`→staging.

## 18. Bindings, secrets & deployment

- **Bindings:** Hyperdrive (`HYPERDRIVE`, `TIMESERIES`), KV (`mc2kv`, `mc2sessions`, `CLAPS_KV`), D1 (`social-interactions`), R2 (`files`), queues (producers), service binding secure-api↔studio-api, Browser Rendering (`BROWSER`, public-api). All commented out at sunset in the five retired workers.
- **Secrets (names only):** `TYPESENSE_KEY`, `MORALIS_KEY`, `MOBULA_KEY`, `NOTION_KEY`, `DEBANK_KEY`, `HELIUS_KEY`, `TELEGRAM_BOT_TOKEN`, `TWITTER_REDIRECT_URL`, Datadog keys in `metrics.ts` (⚠ hardcoded, see §9); `.dev.vars` correctly gitignored.
- **CI/CD:** `deploy.yml` (main→prod: 5 workers + Pages), `deploy-staging.yml` (+studio-api), `deploy-dev.yml` (tags, Node 20, wrangler 3.99). Datadog static analysis as the only quality gate.
- **Rollback:** retired workers restored by reverting the 410 middleware + uncommenting bindings (the deprecation READMEs document intent, not procedure).

## 19. Operational gotchas & key file map

**Gotchas:**
1. **Committed credentials** in wrangler.toml comments (staging Postgres + Timescale) and frontend-bundled API keys (LI.FI/Enso/Aarc/Typesense) — see §9; must never be quoted publicly.
2. **shared-services is a broken stub** — `src/index.ts` re-exports a file that was never committed; importing `@mc2/shared-services` fails. The real cross-repo seam is `cf-adapters` + queues.
3. **The "shopify" naming trap** — the on-chain trading module has zero relation to Shopify; searching for Shopify docs will mislead.
4. **Network-prefixed route generation:** `pages:extend` in `nuxt.config.ts` duplicates every route under network prefixes from `config/routing.ts` (`solana`, `all`), except a hardcoded exclusion list — adding a page silently creates N variants.
5. **README drift:** root README still instructs running now-410 workers; app-hub README is the untouched Nuxt starter; `.cursor/rules/app-hub.mdc` describes an atomic component structure that doesn't exist on disk.
6. **Auth sharp edges** (§16): weak salt, session logging, CORS `*` — historical now, but cite as lessons, not as live exposure.
7. **No migrations in-repo:** `shared-orm` schema ≠ deployable DDL; schema changes were applied out-of-band (backend repo / DB functions like `api.fun_auth_authenticate` referenced in `auth.ts`).

**Key file map:**

| Topic | Where to look |
|---|---|
| Auth (wallet signatures) | `apps/secure-api/src/auth/auth.ts`, `src/authMiddleware.ts`, `packages/cf-adapters/src/kv/sessions.ts` |
| Portfolio queries | `packages/shared-orm/src/queries/portfolios.ts`, `apps/secure-api/src/portfolios/` |
| TRV calculator | `packages/cf-adapters/src/trvCalculator.ts` |
| Env/queue senders | `packages/cf-adapters/src/mc2env.ts` |
| signals_v2 schema | `packages/shared-orm/src/schemas/signals.ts` |
| API route catalogs | `apps/public-api/src/index.ts`, `apps/secure-api/src/index.ts` (OpenAPI at `/doc`) |
| Frontend data layer | `apps/app-hub/api/mc2api.ts`, `composables/useMc2Api.ts`, `stores/` |
| Trade execution | `apps/app-hub/composables/shopify/`, `components/shopify/` |
| Route generation | `apps/app-hub/nuxt.config.ts` (pages:extend), `config/routing.ts` |
| Monte Carlo | `packages/cf-adapters/src/kv/montecarlo.ts`, `apps/analytics/src/` |
| Sunset evidence | `apps/*/README.md` (dated 2025-11-05), 410 middleware in both API `index.ts` |

*End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially.*
