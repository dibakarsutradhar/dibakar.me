# MC² Finance — Service Monorepo Writeup

> **Internal document — not for publication.**
> Repo analyzed: `/Users/dibakar/Downloads/Projects/mc2/mc2.service-mono`
> Analysis date: 2026-10-02 · Total commits: 1,870 · Span: 2024-06-26 → 2026-06-02
> Purpose: source of truth for deriving CV bullets, LinkedIn material, and blog posts. Naming MC² is approved for public use; see §9 for what must stay private.

---

# Part I — Narrative & Achievement View

## 1. TL;DR

MC² Finance is a crypto portfolio-analytics platform (portfolio ROI, whale tracking, token data/prices, AI-generated insights, yield opportunities). Its backend is a Cloudflare Workers monorepo — six Workers services plus a shared library — built by a five-person remote team from June 2024, with a staged sunset of most services in October 2025 and full wind-down by June 2026. **Dibakar Sutra Dhar was the core engineer: 1,121 commits (60% of the repo), July 2024 → October 2025, creator of the majority of the service architecture** — the ROI calculation service, the Durable Objects portfolio engine, the multi-portfolio data workflows, the vault/yield subsystems, the CI/CD pipeline, and the deprecation program itself. One ready-to-adapt CV summary sentence:

> *Core engineer (top contributor, ~60% of commits) of MC² Finance's Cloudflare Workers backend — designed and built the portfolio ROI engine, Durable Objects-based portfolio state service, and multi-stage portfolio data workflows across a 6-service monorepo, and led the staged deprecation of the platform.*

## 2. The product

MC² Finance tracked crypto wallets and portfolios, computed their ROI and trading statistics, surfaced whales and top traders, scored tokens for security/authenticity, generated AI-written market insights, and listed yield opportunities. Target users were retail and whale crypto traders — the ROI engineering explicitly dealt with "inactive whale wallets" and wallets "with very low start values and high transaction volumes" (`roi-fix-proposal.md`), and the whale validation snapshot includes accounts like justinsuntron and Cooopahtroopa (`whale-portfolios-summary.json`, 2025-04-17). Multi-chain: EVM chains plus Solana.

| Feature | What it did |
|---|---|
| Portfolio ROI & stats | Multi-period (latest/7d/30d) ROI, win rate, unrealized gains per wallet portfolio |
| Whale & trader discovery | Whale identification, portfolio similarity analysis, indexed portfolio search (Typesense) |
| Token data pipeline | Prices (Mobula → Uniblock → PortalsFi fallback), marketcap-tiered refresh, Typesense token search |
| Token security scoring | CertiK Skynet + GoPlusLabs scanning, DappRadar blacklists, authenticity scores |
| AI insights ("Albert") | LLM-written token descriptions, market insights, and "Portfolio Pulse" summaries |
| Yield opportunities | ERC-4626 vault scanning, Pendle + Yield.xyz strategy processing with risk scores |
| Alerts & notifications | Signal/wallet queue consumers, Telegram (FlowXO) and Discord delivery |
| Awards/gamification | SVG/PNG award image generation service (feeder) |

## 3. Architecture (summary level)

- **Runtime:** six Cloudflare Workers apps (pnpm + Turborepo, Wrangler 4, Hono + Zod OpenAPI), ~55,250 lines of TypeScript: `tokenadmin` (token pipeline, ~13.5k LOC), `portfolioadmin` (portfolio ROI + Cloudflare Workflows, ~16.7k LOC), `durables` (Durable Objects portfolio engine, ~9.4k LOC), `consumers` (queue consumers), `feeder` (award images), `timeseries` (one-off Postgres→TimescaleDB migration). Shared library `packages/serviceproviders` (~13.2k LOC): ORM, typed env, API wrappers, queue base classes.
- **Storage:** PostgreSQL on AWS RDS (source of truth, via Hyperdrive), TimescaleDB for wallet time-series, per-portfolio SQLite inside Durable Objects as calculation state, Typesense as search/read index, Cloudflare KV for price/insight caches.
- **Compute fabric:** Cloudflare Queues (six+ queues with DLQs), Cloudflare Workflows for batched portfolio processing, Durable Object alarms for periodic recomputation, ~9 production cron schedules at peak.
- **External services:** Mobula, Moralis, DeBank, Arkham, CertiK, GoPlusLabs, Pendle, Yield.xyz, Uniblock, PortalsFi, Typesense, OpenAI embeddings, OpenRouter (Mistral Nemo) for the Albert AI persona, Datadog metrics.

## 4. The story: how the project evolved

| Epoch | Period | Theme |
|---|---|---|
| Bootstrap | Jun–Jul 2024 | Repo initialized 2024-06-26 by Christoph Richter (founder). Dibakar joins **2024-07-01** (`a2a8f91`), builds the metrics worker, signal queue, consumers, and Typesense sync service — much of the platform scaffolding. |
| Data foundations | Aug–Oct 2024 | Timeseries migration service, shared ORM, token authenticity scoring (GoPlusLabs, DappRadar), marketcap cron tiers, GitHub Actions CI. |
| Portfolio platform | Nov 2024–Apr 2025 | The heart of the product: single/multi-portfolio Workflows, embeddings, statusManager/cronManager, and **ROICalculator4** (`034bdb0`, Feb 2025). Team peaks (239–261 commits/month Dec–May); Abubakar's ROI-correctness hotfix campaign (PRs #195–#202) and validation harness (Apr 2025). |
| Durable Objects era | May–Jul 2025 | Dibakar creates the `durables` app (`fe04eeb`, 2025-05-05) — per-portfolio Durable Objects with SQLite state, ETL coordinator, throttled Typesense sync. Vault/ERC-4626 subsystem (`133b29c`), wallet-assets API (`a141ea5`, +1,714 lines), DeBank and Solana support. |
| Yield & security | Jul–Aug 2025 | Final feature wave: CertiK integration, Yield.xyz API, `YieldStrategyProcessorV2`, Pendle strategies. Dibakar's last feature work ~2025-08-18. |
| Sunset | Oct 2025 | **2025-10-28:** Dibakar executes the staged deprecation (`8f1b723` — SUNSET_IMPACT.md, bindings disabled across five apps while preserving code for rollback; PRs #359/#360). His last commit is the sunset merge PR #360. |
| Wind-down | May–Jun 2026 | After tenure: Christoph disables tokenadmin crons and queue consumers to stop runaway Durable Objects billing (`cc54afc`, `f1982f3`, `563c673`). Nothing further was built. |

After Dibakar's tenure stopped, the only code activity was infrastructure shutdown — his architecture ran the platform's entire production life.

## 5. The user's contributions in detail

### Ownership map

1,121 commits (919 as "Dibakar Sutra Dhar" + 202 as "Dibakar", same email `iamdibakardipu@gmail.com`). Directory ownership by commit touches:

| Directory | Dibakar touches | vs. next author |
|---|---|---|
| `apps/portfolioadmin` | 475 | (Aleem 202, Christoph 170) |
| `apps/durables` | 359 | (created by Dibakar; dominant author) |
| `packages/serviceproviders` | 353 | (Aleem 221, Christoph 153) |
| `apps/tokenadmin` | 176 | (Aleem 309, Christoph 171) |
| `apps/consumers` | 101 | (created/owned by Dibakar) |
| `apps/metrics`, `apps/sync`, `apps/queue` | 54 + 41 + 27 | (created and solely owned by Dibakar; later merged away) |
| `.github` CI workflows | 31 | (next: ~0) |

Reading: Dibakar was the **greenfield backend builder and platform integrator** — he created most services and owned the portfolio data platform end-to-end. Christoph (founder) bootstrapped the repo, price pipeline, and feeder; Aleem owned the tokenadmin feature surface, Albert AI insights, and alerting; Emmanuel patched notifications/metrics; Abubakar did a short ROI-hotfix tenure.

Raw diffstats: 69,486 insertions / 34,444 deletions — but `pnpm-lock.yaml` alone accounts for 8,081 ins / 9,218 del, and the single largest commit (`e1d5e64`, 10,668 lines) is a pure lockfile regen. Real code churn ≈ 61k ins / 25k del.

### Thematic breakdown (all epics, with representative hashes)

1. **Platform scaffolding (Jul–Sep 2024):** metrics worker, signal queue, consumers worker, Typesense sync service. `a2a8f91` (first commit), `feat(queue): signal queue deployed`.
2. **Timeseries migration (Aug–Oct 2024):** Drizzle-based Postgres→TimescaleDB migration service with batched stats migration (20k–30k rows/batch, 5-min prod cron). `apps/timeseries`.
3. **Token authenticity & security (Sep–Oct 2024):** GoPlusLabs scoring pipeline, token_score queue, DappRadar blacklist ingestion (5,194-line JSON commit `21eee34`).
4. **Portfolio data platform (Nov 2024–Apr 2025):** single & multi-portfolio Cloudflare Workflows (PRs #71/#72), OpenAI embeddings, statusManager (`ea95b30`), cronManager; **ROICalculator4** `034bdb0` (Feb 2025: 188-line service + 863-line test file in one commit), later grown to 1,961 LOC; removal of deprecated calculation paths (`5f4d153`).
5. **Durable Objects portfolio engine (May–Jun 2025):** created `apps/durables` (`fe04eeb`); `PortfolioDO` (`d854398`, then a deliberate Kysely→raw-SQL transition `82c368a`), `ETLCoordinatorDO`, throttled Typesense sync, roi-analyzer/asset-analyzer.
6. **Data-integration layer (Jun–Aug 2025):** wallet-assets + portfolio-similarity API (`a141ea5`, 1,711-line route file), ERC-4626 vault endpoints + `YieldStrategyProcessorV2` (`133b29c`, +909 lines), DeBank integration, Solana address handling, universal chain-mapping constants refactor, CertiK provider, Yield.xyz API.
7. **Release engineering & ops:** built and maintained CI for the whole monorepo (31 touches to `.github`; deploy-staging.yml ×16, deploy.yml ×15), Node 23 + Wrangler 4.5 rollout (`8d23440`), and was the **de facto release manager — merged 201 of the repo's 343 PRs** to `main`/`staging`.
8. **Sunset program (Oct 2025):** designed and executed the staged deprecation: `8f1b723` (142-line SUNSET_IMPACT.md + binding disablement across five apps, rollback procedure included), logpush/observability disablement (`dcbdbd0`), DO binding removal (`b02e406`).

### Signature engineering moments

- **ROICalculator4, designed with tests first-class** (Feb 2025, `034bdb0`): shipped the calculation service and an 863-line test suite covering edge cases (multi-period, error handling) in a single commit. His own commit body: "Handles complex financial calculations with precision and accuracy… supports different time periods (latest, 7d, 30d) with robust error handling." The service grew to 1,961 LOC with provider interfaces (ISignalProvider/IPortfolioProvider) and cache/tracker layers.
- **Per-portfolio Durable Objects with SQLite state** (May 2025, `fe04eeb` → `d854398` → `82c368a`): the design (documented in `apps/durables/README.md`) keeps in each DO "only data required to do the calculation," recomputes on transaction ingestion, and pushes to Typesense through a throttler. Dibakar started with Kysely and deliberately moved to raw SQL within three days for the DO context — a pragmatic performance call recorded in commit history.
- **Wallet-assets & similarity API** (Jun 2025, `a141ea5`): a 1,711-line Hono route module exposing flexible wallet-asset retrieval and portfolio-similarity analysis — one of the largest single-feature commits in the repo.
- **The ROI correctness saga (collaboration, not solo):** the team's documented position (`roi-fix-proposal.md`, authored by Abubakar) was that the ROI formula was sound and the bugs were data-quality issues; the empirical backbone was Abubakar's 1,738-line validation harness and whale snapshot. Dibakar's ROICalculator4 and multi-portfolio workflow v2 were the production implementations this campaign hardened; branch names (`Unrealistic-ROI`, `ROI-Capping-Issue`, `hotfix/tx_roi_rollback_prod`) record the extended debugging effort.
- **The sunset as an engineering deliverable** (Oct 2025, `8f1b723`): rather than deleting services, he wrote a rollback-first deprecation — all bindings commented out with a documented uncomment→deploy→monitor recovery procedure and a migration plan into tokenadmin. The platform kept running on his architecture for another eight months until the cost-driven wind-down.
- **Performance firefighting in production** (Apr–May 2025): commit series around the multi-portfolio workflow — batch size tuned 50→20 (`6a10b00`), ROI logging disabled for overhead (`525a40b`), an honest `temporarily disable new ROI calculation due to server overheating` (`e210a0f`), cache-clearing before ROI calculations for accuracy (`3fd51a3`).

### Commit hygiene

Best on the team: 78% strict `type(scope):` conventional commits with consistent scopes (portfolioadmin, token-analysis, certik, yield-api…) and descriptive multi-clause bodies. Compare Aleem 22%, Christoph 56%, Abubakar 0%. Workflow: `staging` → `main` PRs, branch names carrying Linear ticket IDs (`feature/dev-NNNN-*`, DEV-684 → DEV-1500).

## 6. Engineering practices observed

- **Testing:** Vitest + `@cloudflare/vitest-pool-workers` in three apps; 15 test files / 3,342 LOC, dominated by `RoiCalculator4.test.ts` (1,042 LOC). Weakness: the CI test step was commented out in staging and no test gate on `main`.
- **CI/CD:** Turbo remote cache, pnpm, wrangler-action deploys of four services on push to `main` (prod) / `staging`. Built by Dibakar.
- **Planning:** Linear tickets (DEV-NNNN branch prefixes), Notion for deep docs (TxManager, StatusManager, keys); the durables README contains a fully-completed build checklist — the only in-repo roadmap artifact.
- **Docs culture:** per-service READMEs with mermaid diagrams and API specs (`multi-portfolios-v2/README.md`, `statusManager.md`, admin/Postman docs), `.cursor/rules` coding standards (functional TS, `safeMath` everywhere, single-pass algorithms, no global state — edge-optimization mindset). Gap: no ADRs/postmortems; the 2026 cost incident lives only in commit messages.
- **Recorded tech debt:** unauthenticated admin route surfaces (CORS `*`, no app-layer auth — platform-level protection assumed), hardcoded Datadog API key in `packages/serviceproviders/src/metrics.ts` (see §9), root-level un-archived debug scripts, CI still deploying sunset services.

## 7. Numbers worth quoting

| Metric | Value | Trace |
|---|---|---|
| Total commits / Dibakar's share | 1,870 / **1,121 (60%)** | `git shortlog -sne` |
| Tenure | 2024-07-01 → 2025-10-28 (~16 months) | first `a2a8f91`, last PR #360 |
| PRs merged by Dibakar | 201 of 343 (release manager) | merge-commit authorship |
| Monorepo TypeScript LOC | ~55,250 | `find … -name '*.ts' \| xargs wc -l` |
| Services in monorepo | 6 apps + shared library (3 packages) | `apps/`, `packages/` |
| Dibakar raw diff | 69,486 ins / 34,444 del (≈8k/9k lockfile) | `git log --author=iamdibakardipu --numstat` |
| ROICalculator4 | 1,961 LOC final; +863-line test suite in first commit | `034bdb0`; file at `563c673` |
| Wallet-assets API | +1,714 lines in one commit | `a141ea5` |
| Vault subsystem | +909 lines (`YieldStrategyProcessorV2` etc.) | `133b29c` |
| Test suite | 15 files / 3,342 LOC | agent count, spot-checked |
| Whale portfolios validated | 78, snapshot 2025-04-17 | `whale-portfolios-summary.json` |
| Peak team velocity | 261 commits/month (May 2025) | month-by-month log |
| Runaway DO cost (post-tenure) | ~25M invocations/mo prod at ~99.7% error; ~9 msg/s self-feeding queue loop | commit messages `cc54afc`, `563c673` |
| Price-refresh cadence | >$100M mcap every 5 min; $1–100M every 7 min; <$1M every 15 min | `apps/tokenadmin/src/cron/priceupdates.ts` |

## 8. Raw material for derived artifacts

**CV bullet candidates:**
- Built the portfolio analytics backend of MC² Finance — a Cloudflare Workers monorepo (~55k LOC, 6 services) — as top contributor with ~60% of 1,870 commits over 16 months.
- Designed and implemented the ROI calculation engine (1,961 LOC with provider-interface architecture) and an 863-line edge-case test suite, hardened by a team-wide whale-portfolio validation campaign across 78 real portfolios.
- Architected a per-portfolio Durable Objects system with embedded SQLite state, ETL coordination, and throttled search-index sync — replacing batch workflow processing for real-time portfolio recomputation.
- Built the platform's release engineering: CI/CD for four Cloudflare Workers services with Turbo remote caching, and merged 201 of 343 PRs as de facto release manager.
- Integrated 10+ external data providers (Mobula, Moralis, DeBank, CertiK, GoPlusLabs, Pendle, Yield.xyz) behind a typed, shared API-wrapper layer with fallback chains (e.g., Mobula → Uniblock → PortalsFi pricing).
- Led a rollback-first deprecation of five services — a documented, reversible sunset preserving code and a migration path — while keeping the token pipeline in production.

**Blog-post angles:**
- *"The ROI formula was fine: how data quality, not math, broke our portfolio returns"* — the repo documents the whole argument (`roi-fix-proposal.md`), including why value-capping was rejected and the `-1` sentinel replaced with attribution metadata.
- *"Durable Objects as per-customer state machines"* — the PortfolioDO/ETLCoordinatorDO design (SQLite-in-DO, throttled external writes, alarm-driven recompute) is an under-documented Cloudflare pattern with real tradeoffs.
- *"How we sunset a microservice platform without deleting it"* — comment-out-based deprecation with a rollback runbook; unusual and reusable.
- *"Post-mortem in commit messages: the ~25M invocations/month runaway loop"* — a self-feeding queue re-enqueueing failures at ~9 msg/s is a great incident-story with numbers (though post-tenure; frame accordingly).
- *"Testing a financial calculation against production whales"* — the validation-harness approach (reference implementation vs. production emulation, hand-computed expected ROIs).

**LinkedIn headline candidates:**
- Core Engineer @ MC² Finance — built the Cloudflare Workers backend for crypto portfolio analytics (60% of commits).
- Backend engineer: distributed systems on Cloudflare Workers, Durable Objects & Workflows — crypto portfolio ROI at scale.
- Top-contributing engineer of a 6-service serverless monorepo: data pipelines, financial computation, and its graceful sunset.

## 9. Caveats for accuracy (anti-overclaim checklist)

- **Do not claim:** the ROI validation harness / `roi-fix-proposal.md` (Abubakar, `822ae9a`/`91a4ead`), the Albert AI insights epic and alerting base (Aleem, `c1a5ddc`/`69750c2`), the token price pipeline and feeder (Christoph), the Datadog metrics push (Aleem), the 2026 cost-incident shutdowns (Christoph, after tenure).
- **After tenure:** production ran until 2026-06-02 on this architecture; the runaway-DO-cost incident happened under Christoph's wind-down, not during feature development.
- **Numbers hygiene:** never quote 69k insertions without the lockfile footnote; the 10,668-line `e1d5e64` is a lockfile regen, not code.
- **Terminology:** the team says "portfolios" (renamed from wallets — migration `rename_wallet_to_portfolio.sql`); ROICalculator4 was version 4 of an iteration chain, later superseded by Christoph's ROI v6 beta.
- **Keep out of public artifacts (confidentiality):** the hardcoded Datadog API key in `packages/serviceproviders/src/metrics.ts`; the ingestor ETL API URL/key in `wrangler.toml`/`mc2env.ts`; the fact that admin route surfaces have no app-layer auth; Hyperdrive/Typesense instance IDs; whale-account names from `whale-portfolios-summary.json` (real people's wallets).
- **Repo is partially deprecated** — describe services in past tense for portfolioadmin/durables/consumers/feeder/timeseries; tokenadmin's crons and queue consumers were also disabled in June 2026.

---

# Part II — Technical Reference

Standalone reference extracted from source at analysis date (2026-10-02). File paths relative to repo root. Note: most services are sunset — bindings are commented out in their `wrangler.toml`; the reference below describes the system at full operation unless marked otherwise.

## 10. System topology

```
                         ┌──────────────────────────────────────────────┐
  Ingestor ETL ──queue──▶│ consumers : signal/wallet/notify/event queues│
  (external API)         └──────────────┬───────────────────────────────┘
                                        │ (Telegram via FlowXO, Discord)
  Cron ──▶ tokenadmin ──▶ Cloudflare Queues (alert/score/tokens/priceupdate)
              │                 │                     │
              ▼                 ▼                     ▼
          Mobula/Uniblock/  serviceproviders      KV price cache
          PortalsFi,        (ORM, wrappers)       + Typesense index
          CertiK, GoPlus,        │
          Pendle, Yield.xyz      │ service binding
                                 ▼
                       durables: ETLCoordinatorDO ──▶ PortfolioDO (SQLite per portfolio)
                                 │  reads/writes                │
                                 ▼                              ▼
                     PostgreSQL (RDS, Hyperdrive) ◀── ts-mapper ──▶ TimescaleDB
                                 │
          portfolioadmin: MultiPortfolioV2Workflow (batches) ──▶ Typesense
          feeder: award SVG/PNG images ──▶ KV / public
```

Who talks to what: `durables` holds a **service binding** to tokenadmin's `TokenWorker` entrypoint (`apps/durables/wrangler.toml`). Postgres is the sole source of truth; Typesense is the read index; SQLite-in-DO is calculation state only ("only keep data in sqlite that is required to do the calculation" — `apps/durables/README.md`). Dev/staging/prod are separate wrangler envs with separate Hyperdrive, KV, queue, and Typesense instances (`apps/*/wrangler.toml`).

## 11. End-to-end data flows

1. **Portfolio ingestion → ROI → search (sunset pipeline):** Ingestor ETL posts wallet/transactions → `signal-queue` → `apps/consumers/src/queues/*` → statusManager transitions (12 wallet states, `apps/portfolioadmin/src/managers/statusManager.md`) → `MultiPortfolioV2Workflow` (batch 20: fetch → process → store, `apps/portfolioadmin/src/workflows/multi-portfolios-v2/`) → ROI computed by `RoiCalculator4` → document written to Typesense. Sync tiering by status: indexing 60 min / active 4 h / inactive 24 h.
2. **Durable Objects recomputation (May 2025+):** transaction hits `PortfolioDO` (`ingest_tx` → SQLite write → recalc) → throttler batches Typesense pushes; `ETLCoordinatorDO` chunks reindexes via alarms; 4-hour alarms recompute unrealized ROI and portfolio age (`apps/durables/src/durables/portfolio.ts`, `etl.ts`).
3. **Token price pipeline (active to 2026-06):** cron `scheduled()` in `apps/tokenadmin/src/index.ts` maps marketcap tiers → `priceupdates.ts` fetches Mobula → fallback Uniblock → fallback PortalsFi → KV write via Cloudflare REST API (`kvpriceupdates.ts`) + Typesense sync.
4. **Token scoring & alerts:** crons enqueue `TOKEN_SCORE_QUEUE`/`TOKEN_ALERT_QUEUE` → consumers (`src/queues/tokenScore.ts`, `alerts.ts`) run CertiK/GoPlus scans and emit alerts.
5. **AI insights:** token metrics → `AlberInsights` (OpenRouter, Mistral Nemo) → short description + market insight + SEO text, cached in KV `albert_insight__*` 24 h TTL; portfolio "Portfolio Pulse" (150–200 chars) generated in portfolioadmin; embeddings via OpenAI `text-embedding-ada-002`.
6. **Yield:** hourly Pendle + Yield.xyz scans → `YieldStrategyProcessorV2` (`apps/tokenadmin/src/services/`) → `token_yield_strategies` tables with risk scores.

Failure behavior: all queues max_batch_size 30, max_retries 10, retry_delay 120s with per-queue DLQs; workflow steps use Cloudflare step caching with per-batch partial failure; DO alarms self-reschedule (which became the 2026 runaway hazard).

## 12. Data model reference

| Engine | Store | Contents |
|---|---|---|
| PostgreSQL (RDS eu-west-1, Hyperdrive) | `mc2fi` db, `tokens` + `signals_v2` schemas | tokens, wallets→portfolios, signals, awards, users, followers, performance history |
| TimescaleDB (managed) | `tsdb` | wallet/portfolio time-series stats (migrated by `apps/timeseries`) |
| Durable Object SQLite | per-PortfolioDO | minimal portfolio calculation state |
| Typesense | token + portfolio collections | search/read documents |
| Cloudflare KV | `mc2tokenadmin`, `mc2kv`, `mc2sessions`, workflow-progress | price caches, insight caches (24 h TTL), session/award data |

- **Drizzle schemas** in `packages/serviceproviders/src/orm/`: `tokens.ts` (`chains`, `tokens`, `token_metadata`, `token_metrics`, `token_prices`, `token_type_info`; primitives enum spot/future/option/perpetual/index/pool-liquidity; vendor enum mobula/lifi/moralis), `portfolios.ts` (`xxwalletAssets`, `portfolioPerformanceHistoryV2`), `signals.ts`, `awards.ts`, `user.ts`, `wallets.ts`. Kysely types in `apps/durables` (deliberately "query builder, not ORM" — `packages/serviceproviders/src/kysely/types/README.md`).
- **Migrations:** `apps/tokenadmin/migrations-folder/0000_uneven_nocturne.sql` (tokens schema); hand-written SQL in `packages/serviceproviders/migrations/` (`token_yield_strategies.sql` adds erc4626-vault primitives + `tokens.projects`; `add_denominating_asset.sql`; `rename_wallet_to_portfolio.sql`).
- **ID format:** 26-char "utid" generator (`packages/serviceproviders/src/utid.ts`).
- **Cache keys:** `albert_insight__{id}` (24 h TTL), KV price buckets per marketcap tier, `LAST_PROCESSED_DATE` (timeseries cursor).

## 13. Pipeline / processing reference

| Stage | External call | Writes to | Key constants |
|---|---|---|---|
| Price update | Mobula → Uniblock → PortalsFi | KV + Typesense | tiers: >$100M/5 min, $1–100M/7 min, <$1M/15 min (`src/cron/priceupdates.ts`) |
| Token security | CertiK Skynet batch scan, GoPlusLabs | token_metrics | cached scans (`TokenAnalysisService.ts`) |
| ROI calculation | — (pure, provider-injected) | portfolioPerformanceHistoryV2, Typesense | batch 20; suspicious-ROI sentinel −1 for \|ROI\|>4.0/5.0 (see §14) |
| Transaction filtering | — | signal aggregation | size-tiered SELL thresholds 50×/20×/10×/5× by portfolio value; round-number heuristic only <$100k |
| Whale detection | Arkham/DeBank | whale summary | whale = start value > $500,000 |
| Timeseries migration | — | TimescaleDB | batches 20k rows, ≤30k/batch cap |
| AI insight | OpenRouter Mistral Nemo; OpenAI ada-002 | KV (24 h) | 150–200 char portfolio pulse; 3-part token insight |

## 14. Algorithms

- **Core ROI formula** (`roi-fix-proposal.md`, implemented in `apps/portfolioadmin/src/services/RoiCalculator4.ts` + `services/calculations/`):
  `investments = start + added; returns = end + removed − start − added; roi = returns / investments` — price-based vs. trading-based ROI split by attribution.
- **Suspicious-ROI handling (production at the time):** return −1 sentinel for |ROI| > 4.0 (with no transactions) / 5.0, cap transactions at 10× average portfolio value — later replaced by logged flags + attribution metadata `{priceChange, transactions, other}` per the proposal.
- **Tiered transaction validation:** SELL filter multiplier 50× (≥$1M portfolio), 20× (≥$100k), 10× (≥$10k), 5× (below); round-number heuristic only for portfolios <$100k.
- **Validation harness findings** (`roi-validation-harness.js`, 1,738 LOC): 6 canonical cases (retail/whale × active/inactive) with hand-computed expected ROI (tolerance 0.001); `calculateProductionRoi` emulates production semantics to enumerate divergences (e.g., "with normalization ROI would be X% instead of Y%"); whale-check against 78 real whale portfolios (2025-04-17) exposed ~15 portfolios with zero wallets — a data-quality gap.
- **RSI** in token analysis (`TokenAnalysisService.ts`); marketcap-tiered cron bucketing as above.

## 15. External services / model catalog

Transport: all external APIs wrapped as classes extending a `SuperApi` fetch base in `packages/serviceproviders/src/apis/`, env access only through typed `Mc2Env` (`src/mc2env.ts`, ~30 keys).

| Operation | Service / model | Notes |
|---|---|---|
| Token prices | Mobula → Uniblock → PortalsFi | ordered fallback chain |
| Wallet/protocol data | Moralis (deep-index v2.2), DeBank pro-openapi, Arkham | portfolio assets/trades |
| Security scoring | CertiK Skynet (partner API), GoPlusLabs, DappRadar | batch token-scan |
| Yield data | Pendle (api-v2), Yield.xyz v1 | strategies with risk_score |
| AI text | OpenRouter, `mistralai/mistral-nemo` ("Albert" persona) | KV-cached 24 h |
| Embeddings | OpenAI `text-embedding-ada-002` | portfolio/token docs |
| Search | Typesense (dedicated instances per env) | read index |
| Notifications | FlowXO (Telegram), Discord webhooks | consumers |
| Metrics | Datadog EU (`packages/serviceproviders/src/metrics.ts`) | ⚠ hardcoded API key in source — see §9 |
| Internal ETL | Ingestor API (`src/ingestor.ts`) with CheckpointManager | external repo |

## 16. API & auth reference

- Framework: Hono `OpenAPIHono` + Zod; Scalar reference UI at `/`, OpenAPI 3.0 spec at `/doc` (portfolioadmin, durables, feeder).
- Route groups: tokenadmin `/fulltokendb/*`, `/fulltypesense*`, `/tokenpricestats*`, `/insights/{tokenId}`, `/tokenprice`, `/tokenadd`, `/vaultprices`, `/vaultscan`; portfolioadmin `/fullportfoliodbupdate`, `/portfolioaccuracy`, `/etl-monitoring`, `/tools/roi-audit-trail`, `/whaleupdate`, `/wallet-assets`; durables `/etl`, `/portfolio`; feeder `/api/v1/awards/*`, `/api/v1/tokens/{utid}`; consumers `/signal/:id`, `/event/:id`, `/wallet/:id/:action`.
- **Auth: none at the app layer.** No API-key/JWT middleware; CORS `origin: '*'` in every service; secrets server-side only via `Mc2Env.getKey()`. Ingress protection was assumed to be platform-level (outside this repo). This is a known sharp edge — see §19.

## 17. Scheduling & queues

- **tokenadmin production crons (now disabled, preserved as comments):** */5, */7, */10, */15 min, hourly, 4-hourly, daily, weekly Sun 01:00, monthly (`apps/tokenadmin/wrangler.toml`).
- **portfolioadmin:** */5, */10 min, hourly, 4-hourly, 12-hourly, daily 01:00 (prod); staging adds 6-hourly/2-day patterns.
- **durables:** 4-hour DO alarm loop (prod) / 12 h (staging) for unrealized ROI + age.
- **Queues:** producers/consumers for token-alert, token-score, tokens, token-priceupdate (tokenadmin); signal, wallet, notify, event (consumers); portfolio-insights, workflow-v2, wallet-status, unreasonable-roi, typesense-updates, portfolio-etl-do (portfolioadmin/durables). Config everywhere: max_batch_size 30, max_retries 10, retry_delay 120s, DLQs `*-dlq-*`/`*-errors-*`.
- Message base classes in `packages/serviceproviders/src/baseAlertQueueGenerator/Processor.ts`, `queueprocessor.ts`.

## 18. Bindings, secrets & deployment

- **Bindings per service** (see each `wrangler.toml`): Hyperdrive (`HYPERDRIVE`), Timescale (`TIMESERIES`), KV namespaces, queue producers/consumers, DO bindings (`PORTFOLIO_DO`, `ETL_COORDINATOR_DO` — durables only), service binding TOKENADMIN (durables), Workflows (`MULTI_PORTFOLIO_V2` — portfolioadmin). `limits.cpu_ms = 300_000` on durables.
- **Secrets (names only):** `OPENROUTER_KEY`, `OPENAI_KEY`, `INGESTOR_KEY`, `INGESTOR_URL`, plus provider keys (CertiK, Mobula, Moralis, DeBank, Arkham, PortalsFi, Uniblock, Yield.xyz, Typesense, FlowXO JWT) via `Mc2Env`.
- **CI/CD:** `.github/workflows/deploy.yml` (push `main` → prod) and `deploy-staging.yml` (push `staging` → staging): pnpm install/build → `wrangler-action@v3` for tokenadmin, portfolioadmin, consumers, durables. Turbo remote cache with signature. Test step commented out in staging; no deploy gate.
- **Migration/rollback policy:** sunset = comment out bindings (Option 1 "Keep for Emergency Rollback"); rollback = uncomment → commit → `pnpm deploy` → monitor (`SUNSET_IMPACT.md`).

## 19. Operational gotchas & key file map

**Gotchas:**
1. **Self-feeding queue loops:** tokenadmin consumers re-enqueued the next batch every invocation even when DB queries failed → ~9 msg/s, ~100%-error loop independent of crons; crons fanned out ~25M PortfolioDO calls/mo at ~99.7% error; DO alarms self-perpetuate sync loops. The 2026 shutdown used `[skip ci]` on branch updates to avoid re-deploying all services (commits `cc54afc`, `f1982f3`, `563c673`).
2. **No app-layer auth on admin routes** (CORS `*`) — anything referencing these APIs publicly must treat them as internal-only.
3. **Hardcoded Datadog API key** in `packages/serviceproviders/src/metrics.ts` — must be redacted in any public excerpt.
4. **"Wallet" → "portfolio" rename** across schema/API: old docs and column names (`xxwalletAssets`, `wallets.ts`) still use wallet.
5. **Docs drift:** `.cursor/rules` mentions Drizzle while durables uses Kysely; `SUNSET_IMPACT.md` (2025-10-28) predates the June 2026 tokenadmin disables; `deploy.yml` still deploys sunset services.
6. **Cron-to-job mapping is code, not config:** `scheduled()` in `apps/tokenadmin/src/index.ts` dispatches by cron expression string — changing schedules silently changes jobs.
7. **Typesense write throttling is mandatory** — unthrottled DO pushes were the load hazard the throttler was built for (`apps/durables/README.md`).

**Key file map:**

| Topic | Where to look |
|---|---|
| ROI engine | `apps/portfolioadmin/src/services/RoiCalculator4.ts` (+ `.test.ts`), `services/calculations/*` |
| ROI correctness research | root `roi-fix-proposal.md`, `roi-validation-harness.js`, `whale-portfolios-summary.json` |
| Durable Objects design | `apps/durables/README.md`, `src/durables/portfolio.ts`, `src/durables/etl.ts` |
| Multi-portfolio workflow | `apps/portfolioadmin/src/workflows/multi-portfolios-v2/` (+ README) |
| Price pipeline | `apps/tokenadmin/src/cron/priceupdates.ts`, `kvpriceupdates.ts` |
| Token scoring/security | `apps/tokenadmin/src/services/` (securityScorer, gopluslabs, TokenAnalysisService, dappradar) |
| AI insights | `packages/serviceproviders/src/albert.ts`, `apps/tokenadmin/src/services/albert.ts` |
| Yield/vaults | `apps/tokenadmin/src/services/YieldStrategyProcessorV2.ts`, `vaultTypes.ts`, `src/platforms/pendleFi.ts` |
| Status state machine | `apps/portfolioadmin/src/managers/statusManager.md` (+ txManager.md) |
| Shared env/wrappers | `packages/serviceproviders/src/mc2env.ts`, `src/apis/*` |
| Sunset runbook | root `SUNSET_IMPACT.md` |

*End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially.*
