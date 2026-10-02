# MC² Finance — CF Ingestor (cf-ingestor) Writeup

> **Internal document — not for publication.**
> Repo analyzed: `/Users/dibakar/Downloads/Projects/mc2/cf-ingestor`
> Analysis date: 2026-10-02 · Total commits: 224 (`git rev-list --all --count`) · Span: 2024-12-19 → 2025-07-30
> Companion documents: `internal/mc2-ingestor-writeup.md` (the Rust predecessor this repo replaces), `internal/mc2-pulsar-transport-writeup.md`, `internal/mc2-mono-writeup.md`, `internal/mc2-service-mono-writeup.md`.
> **Confidentiality decision (user, 2026-10-02):** public artifacts derived from this document must be fully anonymized — no MC² Finance, no teammate names, no worker hostnames, no account/stream IDs, no committed keys. See §9.
> **Attribution headline (updated 2026-10-02 per user clarification): Dibakar Sutra Dhar has ZERO code commits in this repository** (verified two independent ways: `git log --all --author=dibakar` and `--author=iamdibakardipu`, both 0) — **but he was the team lead and designed the ETL/ELT pipeline architecture this repo implements.** Architecture-design credit is his; code authorship is not. See §5/§9, and `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md` for the pipeline-level design document (component map, design rationale, capacity math).

---

# Part I — Narrative & Achievement View

## 1. TL;DR

`cf-ingestor` is the **second generation of MC² Finance's wallet-ingestion data plane**: a TypeScript Turborepo of six Cloudflare Workers plus five shared packages (~10,843 TS LOC) that replaced the earlier Rust ECS service (`mc2-ingestor`) with a fully serverless architecture — Moralis Streams push wallet activity into Cloudflare Queues, per-chain client workers (EVM + Solana) fan out across multiple blockchain-data providers via a round-robin executor, and a backend worker runs indexing pipelines that derive signals, FIFO token lots, and WAC-based PnL before persisting to the same Postgres `signals_v2` schema via Hyperdrive. The lead engineer built and maintained essentially all of it (214 of 224 commits, 95.5%, ~88.9k insertions), with a December 2024 scaffold, a March 2025 build/tuning peak (97 commits, 43% of history), a June 2025 architectural consolidation (dedicated `pipelines` package, Bitquery, auto-reindexer), and a July 2025 docs close-out (PR #26). **Dibakar wrote none of this code (zero commits, verified) — but as the team lead he designed the ETL/ELT pipeline architecture it implements** (per his 2026-10-02 clarification; the cross-repo design rationale, component decomposition, and capacity math live in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md`). For this documentation series the repo matters as (a) the endpoint of the architectural arc the earlier writeups trace (Rust ECS + Pulsar → Cloudflare Workers + Queues) — an arc whose _design_ is claimable by Dibakar even where the _implementation_ is not — and (b) a live reference implementation of multi-provider, queue-based ingestion on Cloudflare. One platform-narrative sentence Dibakar may use in first person:

> _I led the design of a serverless wallet-ingestion pipeline — an HTTP ingest edge and per-chain ingestion clients connected by queues, a pluggable multi-provider framework (Moralis, Mobula, Bitquery, Uniblock, Helius, Etherscan, Debank) with round-robin failover, and a pure-function indexing pipeline writing signals and PnL to Postgres over Hyperdrive._

## 2. The product

A multi-chain wallet-activity ETL service on Cloudflare Workers. It watches registered wallets on EVM chains (Ethereum, BSC, Polygon, Linea, …) and Solana, converts raw transactions into normalized `Action`s, derives `Signal`s / `TokenLot`s / `PerformanceV1` / `Intent`s, and persists them into the platform-wide Postgres `signals_v2` schema that the user-facing app reads. Internal users only — the HTTP surfaces are machine-to-machine (Moralis Stream webhooks + API-key-guarded control endpoints).

| Component                    | What it does                                                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/etl-api`               | Hono HTTP edge: receives Moralis Stream webhooks (`POST /moralis-wallet-activity`, unauthenticated), reindex/index/add-wallets endpoints (x-api-key), routes per chain into activity queues |
| `apps/evm-client`            | Queue consumer; largest app (3,001 LOC); provider fan-out (Mobula, Bitquery, Moralis, Uniblock, Etherscan, public RPCs) → Actions → compressed enqueue                                      |
| `apps/solana-client`         | Same pattern for Solana (Mobula, Helius, Uniblock, Solana RPC; slot-estimation heuristic; balance rewind)                                                                                   |
| `apps/backend`               | Queue consumer; decompresses actions, runs `Pipelines.indexingActions` with KV wallet locking, Debank balance validation, Datadog metrics, Postgres persistence                             |
| `apps/solana-poller`         | Cron worker (`*/10 * * * *`); pages through tracked Solana wallets (10/run, staggered) into the Solana activity queue; KV-persisted offset + on/off state                                   |
| `apps/auto-reindexer`        | Queue-driven full-reindex fan-out: slices wallets from Postgres, re-enqueues per-wallet activity, self-loops pagination (max_concurrency 1)                                                 |
| `packages/ingestor`          | The framework: `AbstractProvider` / `AbstractDatabase` / `AbstractIngestor` state machine + KV `Cache` + error taxonomy                                                                     |
| `packages/pipelines`         | Pure (no-I/O) action→entities computation: signals, WAC profit, FIFO lots, intents                                                                                                          |
| `packages/orm`               | Drizzle Postgres schemas (`signals_v2`) + a 578-LOC `Db` class; deterministic SHA-256 IDs                                                                                                   |
| `packages/utils`             | gzip compression, `RoundRobinExecutor`, scoped `Log`, Datadog client, retry/timeout helpers, queue message interfaces                                                                       |
| `packages/typescript-config` | Shared tsconfig base                                                                                                                                                                        |

## 3. Architecture (summary level)

- **Runtime:** 6 Cloudflare Workers (workerd, `nodejs_compat`), each with `[env.stg]`/`[env.prod]`; **no D1, no R2, no service bindings** — despite the root README's mermaid diagram claiming "Store Entities in D1", persistence is Postgres via **Hyperdrive** bindings in every app (verified: `grep d1_databases` across all wrangler.toml → 0 hits).
- **Messaging:** 5 logical Cloudflare Queues (stg/prod pairs): `ingestor-wallet-activity-queue`, `ingestor-solana-wallet-activity-queue`, `ingestor-wallet-actions-queue`, `paginated-reindex-queue`, `ingestor-wallet-indexing-status` (the last is produced here, consumed elsewhere).
- **State:** KV namespaces (wallet locks, ignore-lists, poller state, block caches) + the two Postgres databases (main + a `TIMESERIES` Hyperdrive binding that is wired but never referenced in code).
- **Framework shape:** `AbstractIngestor<T, D>` (`packages/ingestor/src/index.ts`, 535 LOC) is the heart — checkpoint determination, historical-balance snapshot, tx pagination with re-enqueue delays, action-count caps, gzip-compressed enqueue — with EVM/Solana subclasses supplying providers, wallet validation, and config (`preDateForSync` 60 vs 30 days, `actionCountLimitPerRun` 1400, case sensitivity).
- **Reliability doctrine:** round-robin provider execution with retries/timeouts/cooldowns and per-function stats; per-error-class ack/retry mapping in backend (`matchPipelineError`, 11 error classes); chain-partitioned backend instances (`ACCEPTED_CHAIN_IDS` per the backend README) for conflict-free parallelism.

## 4. The story: how the project evolved

| Epoch                   | Period       | Theme                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scaffold + first ETL    | Dec 2024     | Turbobot scaffolds create-turbo (4 commits); lead builds core ETL, rpc-client, first PR "Get initial balances (#1)" on Dec 26. One external build fix (Christoph Richter, `d75afdb`, 9 lines — the only outside code contribution that ever landed).                                                                                                                           |
| ORM + etl-api buildout  | Jan–Feb 2025 | ORM rewrites; new `etl-api` app (Feb 4); gzip message compression epic (Feb 19); "Validation with debank (#3)".                                                                                                                                                                                                                                                                |
| **March peak**          | Mar 2025     | 97 commits (43% of history), 6 PRs: Datadog (#5), New etl api (#6), Restructure (#7), **Partitioning by chain (#8)**, **Apply hyperdrive (#9)**, Integration test (#10) — plus a two-week backpressure grind (duplicate-action fixes, `implement re-enqueue` `0123bf9`, `reduce tx limit`, `fix sorting actions`) and an EVM data-source battle (Moralis/Uniblock retry work). |
| Solana expansion        | Apr–May 2025 | Wallet-table migration (#11), KV lock (#12), Mobula Solana ingestion (#13), **Abstract Ingestor framework (#15)**. A colleague (Abubakar672) lands 5 perf/debugging commits — **all on unmerged side branches (`revamp`, `analysis_report`), 27k insertions, 0 on main** (verified).                                                                                           |
| Pipelines consolidation | Jun 2025     | 48 commits, 10 PRs in 16 days: Bitquery (#16), dedicated `pipelines` package (#17), backend adopts it (#18), Helius (#20), auto-reindexer (#24), ORM refactor (#25). Includes a June-13 "mega-day" of 9 squash merges.                                                                                                                                                         |
| Docs close-out          | Jul 2025     | One config fix, then PR #26 (Jul 30) — Codex-generated branch `codex/update-technical-documentation-in-readmes` creating READMEs for 11 of 12 workspaces (+124/−7, 12 files). Repo freezes there.                                                                                                                                                                              |

The arc mirrors the platform's broader migration: this repo is the "Ingestor next (#74)" direction from the Rust repo, realized in TypeScript on Cloudflare — the Pulsar hop, the ECS service, and the hand-rolled provider clients all collapsed into Queues + Workers + Hyperdrive.

## 5. The user's contributions

**Design & leadership (attested by the user, 2026-10-02).** Dibakar was the team lead for the MC² data platform and designed the ETL/ELT pipeline architecture this repo implements: the multi-stage decomposition (ingest edge → per-chain clients → pipeline backend → persistence), the queue topology, the multi-provider fan-out approach, and the decision to move the ingestor from Rust/ECS/Pulsar to serverless Cloudflare Workers. The pipeline-level design reasoning — Kappa-style stream partitioning on the Pulsar generation, the CQRS-flavored relation-materialization seam, the deliberately tiny AWS surface, and the capacity math (~1,000–1,500 actions/sec sustained on the documented hardware) — is documented in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md`. Git cannot attest design authorship; this rests on the user's statement and that document.

**Code authorship (git-verified): none — zero commits by Dibakar Sutra Dhar** (`git log --all --author=dibakar --oneline | wc -l` → 0; `--author=iamdibakardipu` → 0). The repo is 95.5% the primary implementer's by commit count and ~100% of merged code by volume (the only shipped outside change is a 9-line package.json fix; a colleague's 27k-line debug/perf effort never merged). Authorship map: implementer 214 commits / 88,870+ 31,985− (⚠ ~10k of that is `pnpm-lock.yaml` churn); Turbobot 4 scaffold commits; Abubakar672 5 commits, 0 on main; Christoph Richter 1.

_Naming note:_ throughout this document, "lead engineer" / "primary implementer" refers to the git-identified author of the code (all `me@vutr.io` identities). Dibakar's leadership was organizational and architectural — the layer above the code.

## 6. Engineering practices observed

- **Squash-PR discipline over direct pushes:** 23 numbered squash merges (#1–#26, two gaps); day-to-day commits are terse fragments ("update", "up", "fix" — ~46% of direct commits are one of seven words), but milestone PRs carry clean titles.
- **Tested, but against live APIs:** Vitest + `@cloudflare/vitest-pool-workers`; 20 test files, ~86 test cases (verified: evm-client 29, orm 22, solana-client 13, ingestor 11, utils 7, pipelines 6). Caveat: most provider suites hit real external APIs, and `apps/backend/package.json` points at a test file that doesn't exist (the profit tests live in `packages/pipelines`).
- **No CI at all:** no `.github/` directory — tests and `biome check` are manual.
- **Documentation sprint at the end:** per-workspace READMEs were generated (Codex branch) in July 2025; the root diagram and backend README are already inaccurate (D1 claim, stale env-var names) — see §19.
- **Secrets hygiene is weak:** API keys committed as plaintext `[vars]` in wrangler.toml and in `packages/utils/src/datadog.ts` (see §9).

## 7. Numbers worth quoting

| Metric                        | Value                                                                            | Trace                                |
| ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| Total commits                 | 224                                                                              | `git rev-list --all --count`         |
| Span                          | 2024-12-19 → 2025-07-30 (~7.5 months)                                            | first `364ee95`, last `d39c0b2`      |
| TypeScript LOC                | ~10,843 (excl. generated `worker-configuration.d.ts`)                            | `wc -l` over apps+packages `.ts`     |
| Workers / packages            | 6 apps + 5 packages                                                              | `apps/`, `packages/`                 |
| Logical queues                | 5 (stg/prod pairs = 10 physical)                                                 | all 6 `wrangler.toml`s               |
| Hyperdrive bindings           | 2 per app (main + TIMESERIES); **D1: 0**                                         | `grep d1_databases` → 0              |
| Lead engineer share           | 214/224 commits (95.5%), 88,870+/31,985−                                         | per-author numstat (verified)        |
| Peak month                    | Mar 2025: 97 commits (43%)                                                       | git log month counts                 |
| Squash-merged PRs             | 23 (#1–#26)                                                                      | PR-titled commits                    |
| Test files / cases            | 20 files / ~86 cases                                                             | `find -name '*.test.ts'`, grep count |
| Provider APIs integrated      | 7+ (Moralis, Mobula, Bitquery, Uniblock, Etherscan, Helius, Debank, public RPCs) | `apps/*/src/providers/`              |
| Cron triggers                 | 1 (`*/10 * * * *`, solana-poller)                                                | `apps/solana-poller/wrangler.toml`   |
| External merged contributions | 1 (9-line fix, `d75afdb`)                                                        | git show                             |
| Unmerged side-branch work     | ~27k insertions (Abubakar672)                                                    | numstat, verified 0 on main          |
| Dibakar's commits             | **0**                                                                            | verified both identity patterns      |

## 8. Raw material for derived artifacts

**Personal CV/portfolio artifacts are now partially derivable — design-leadership only** (per §5's two-sided attribution):

### CV bullet candidates (design/architecture claims only)

- Designed the end-to-end ETL/ELT architecture for a multi-chain crypto signals platform — ingestion edge, per-chain ingestion clients, queue-based async processing, and a stateless indexing-pipeline tier writing to Postgres — migrating it from self-hosted Flink/Pulsar on ECS to serverless Cloudflare Workers while keeping the data contract stable.
- Led the data-platform team across three generations of the ingestion stack (Rust ECS ingestor + Apache Pulsar + self-hosted Flink → Cloudflare Workers + Queues + Hyperdrive), preserving one `signals_v2` schema across all rewrites.
- Made the build-vs-buy call to delegate chain indexing to third-party APIs (Moralis, Mobula, Debank) behind a multi-provider round-robin fallback layer instead of operating RPC nodes; sized the system at ~1,000–1,500 actions/sec sustained on documented hardware.
- Specified the pipeline's capacity and upgrade path up front (RDS primary as the gate, ~100M actions/day ceiling, Aurora + S3-checkpoint + sharding as the 10× plan).

### Blog-post angles

- _"Designing a pipeline you won't personally implement"_ — handing an architecture to a team, and what the hand-off document (component map, rationale, capacity math) must contain; `ARCHITECTURE.md` is exactly that artifact.
- _"Kappa in production, then serverless: two generations of the same data contract"_ — the `signals_v2` schema survived both rewrites; that is a design win worth explaining.
- _"From ECS to Workers: what changes when a Rust ingestor becomes six Cloudflare Workers"_ — the migration arc across the companion writeups is unusually complete (same schema, same math, new runtime).
- _"Round-robin against blockchain APIs: a reliability pattern for flaky third-party data providers"_ — the RoundRobinExecutor pattern (retries, timeouts, cooldowns, per-provider success stats) the team built to the design's fault-tolerance spec.

### Still not derivable

Anything implying Dibakar wrote the Workers, the ingestor framework, or the pipelines package — those claims belong to the primary implementer.

## 9. Caveats for accuracy (anti-overclaim checklist)

1. **The two-sided rule (updated 2026-10-02 per user clarification).** _Code side:_ zero Dibakar commits — any artifact implying he wrote, implemented, or maintained this service's code is false. _Design side:_ he was the team lead and designed the pipeline architecture this repo implements (user-attested; documented in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md`). Honest phrasing: "designed/architected the ETL/ELT pipeline," "led the data-platform team," "specified the architecture the team implemented." Dishonest phrasing: "built the Cloudflare Workers," "wrote the ingestor framework," or "our rewrite" without the design qualifier.
2. **Authorship split:** lead engineer wrote everything merged except one 9-line fix; a second colleague's large debugging/performance effort exists only on unmerged branches — don't count it as shipped work.
3. **Generated-file inflation:** the lead's ~89k insertions include ~10k of `pnpm-lock.yaml` churn; Abubakar's 27k are mostly thousand-line debug scripts and test fixtures. Quote LOC (10.8k), not insertion counts.
4. **README vs reality:** the root and backend READMEs claim **D1** storage; the actual store is Postgres over Hyperdrive (0 D1 bindings). Backend README env names (`CLOUDFLARE_QUEUE`, `ACCEPTED_CHAIN_IDS`, `D1_DATABASE_URL`) don't exist in its wrangler.toml. Never cite this repo's READMEs without the corrections in §19.
5. **The repo is frozen at 2025-07-30** — anything after that date is unknown from this analysis.
6. **Secrets (locations only, values never reproduced):** 40-char-hex `API_KEY`s (etl-api, solana-poller — identical across default/stg/prod), a `DEBANK_API_KEY` and `DATADOG_API_KEY` in `apps/backend/wrangler.toml`, hardcoded Datadog API+app keys in `packages/utils/src/datadog.ts`, Moralis Stream UUIDs, and a QuickNode/uniblock RPC URL with a credential-looking fragment in `apps/solana-client/wrangler.toml`. All committed in plaintext. Treat as exposed; strip from any derived material.
7. **Anonymization:** all MC² names, teammate names, `signals_v2` schema references are fine internally but the schema name and any hostname/account ID must be stripped for public use.

---

# Part II — Technical Reference

_Standalone reference extracted from source at analysis date (2026-10-02). Paths relative to repo root. Repo frozen at `d39c0b2` "Update worker docs (#26)", 2025-07-30._

## 10. System topology

```
 Moralis Streams (EVM webhooks)          solana-poller (cron */10)
        │ POST /moralis-wallet-activity        │ 10 wallets/run, staggered
        ▼                                      ▼
 ┌─────────────────┐   reindex/index/add-wallets (x-api-key)   auto-reindexer ◀─┐
 │    etl-api      │ ──PAGINATED_REINDEX_QUEUE────────────────────  (consumer)  │
 │  (Hono edge)    │ ──WALLET_ACTIVITY_QUEUE──────────▶ evm-client ─────────────┘
 │                 │ ──SOLANA_WALLET_ACTIVITY_QUEUE───▶ solana-client
 └─────────────────┘                                    │
                                                        │ gzip+base64 actions
                                                        ▼
                                             WALLET_ACTION_QUEUE
                                                        ▼
                                              backend (per chain set)
                                              ├─ decompress → pipelines (v1)
                                              ├─ KV lock INGESTOR_WALLET_LOCK
                                              ├─ Postgres via HYPERDRIVE (signals_v2)
                                              ├─ Debank balance validation
                                              ├─ Datadog metrics
                                              └─ WALLET_INDEXING_STATUS (producer)
```

Who talks to what: only etl-api and solana-poller have HTTP/cron entry points; everything else is queue-consumers. No service bindings between workers — all coupling is via queues. All six workers bind the same two Hyperdrive endpoints (main + `TIMESERIES`, the latter unused in code). The `WALLET_INDEXING_STATUS` consumer is downstream (not in this repo — plausibly the platform's consumers worker, per the `WORKER_URL` var).

## 11. End-to-end data flows

**Flow 1 — EVM live ingestion:** Moralis Stream webhook → `etl-api` (`apps/etl-api/src/index.ts`): reject `confirmed === false`, parse hex `chainId`, dedupe addresses from `txs` + `erc20Transfers` (drop zero-address), one `IWalletActivityMessage` per address → `WALLET_ACTIVITY_QUEUE` → `evm-client` queue consumer → `Ingestor.handleWalletActivityMessage` (framework) → providers fetch txs/balances (round-robin) → Actions gzip+base64 → `WALLET_ACTION_QUEUE` → backend → `Pipelines.indexingActions` → Postgres.

**Flow 2 — Paginated catch-up (self-requeue):** when a wallet has more history than `actionCountLimitPerRun` (1400), the client re-enqueues its own activity message with `index_from_block = lastAction.blockNumber + 1` and a delay (EVM 120 s, `apps/evm-client/src/index.ts`; Solana 300 s, `apps/solana-client/src/utils.ts`). Errors from the framework retry the message with +3 min delay; invalid wallets are acked (and on EVM removed from the Moralis stream, `onWalletNotFound`).

**Flow 3 — Solana polling:** cron `*/10 * * * *` → handler gated by KV (`SolanaPollerCanRun`, 30-min TTL) → query 10 Solana wallets (`LIMIT_WALLET_QUERY = 10`) with `delaySeconds: idx * 4` stagger → enqueue per wallet → persist offset in KV, reset at list end. Control: `GET/POST /state`, `POST /offset` (x-api-key).

**Flow 4 — Full reindex:** `POST /reindex/evm|/reindex/solana` → `PAGINATED_REINDEX_QUEUE` → auto-reindexer (`max_concurrency = 1`): read a wallet slice from Postgres, enqueue each wallet to the right activity queue (with index-from-beginning semantics), re-enqueue the pagination message if more remain (2 s delay). Serialization is deliberate — a full reindex must not stampede the providers.

**Flow 5 — Backend indexing:** decompress → normalize (camelCase keys) → acquire KV wallet lock (`LockAcquireError` → retry +2 min) → optional `should_reset` (destructive delete across 6 tables, `packages/orm` `resetWalletIndexingState`) → `processIndexingInput` (pure pipelines) → delete-then-insert per block range → optional Debank balance validation → metrics → checkpoint upsert → wallet status `indexed` → ack. Per-error policy via `matchPipelineError` (`apps/backend/src/errors.ts`): decompress/process/validation errors ack (poison message), transient errors retry.

**Failure semantics:** queue consumers do their own `message.retry({delaySeconds})`/`ack()`; no `max_retries`, no DLQ configured anywhere — retries are bounded only by Cloudflare's defaults; RoundRobinExecutor (timeout 5 s, 5 retries, 1 s cooldown) absorbs provider flakiness.

## 12. Data model reference

**Store inventory**

| Engine                                 | Binding                                                      | Contents                                                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Postgres (via Hyperdrive `HYPERDRIVE`) | all apps (solana-client uses `COMMON_DB_URI` secret instead) | `signals_v2` schema: assets, actions, signals, signal_actions, token_lots, intents, intent_signals, performance_v1, blacklisted_wallets, checkpoints, **wallets** (new here: status, portfolio, compatibility) |
| Postgres (via Hyperdrive `TIMESERIES`) | 3 apps, **never referenced in code**                         | intended timeseries DB                                                                                                                                                                                         |
| KV                                     | `KV_NAMESPACE` (clients), `INGESTOR_WALLET_LOCK` (backend)   | 8 cache key families (below), wallet locks                                                                                                                                                                     |
| Cloudflare Queues                      | 5 logical                                                    | message conduits only                                                                                                                                                                                          |

**Tables** (Drizzle in `packages/orm/src/schemas/`; the same `signals_v2` the Rust ingestor and the user-facing monorepo use):

- Enums: `action_type` (SEND/RECEIVE), `signal_type` (SWAP/BUY/SELL), `wallet_chain_types` (`"sol"|"evm"|"solana"`), `wallet_status` (`active, indexed, no_data, 30d_inactive, 90d_inactive, new`).
- `actions` — PK varchar id (SHA-256 first-15-hex, same `generateId` as the Rust version), asset FK, numerics, bigint block fields, JSONB data.
- `signals` + `signal_actions`; `intents` + `intent_signals` (migration adds `intents.wallet` + `idx_intents_wallet`); `token_lots` (JSONB FIFO lots); `performance_v1` (WAC); `blacklisted_wallets`; `checkpoints` (wallet+chain → last block); `assets`; `wallets`.
- Migration `migrations/001__udpate_schema_06132025.sql` (2025-06-13): `intents.wallet` + index; `signals.tx_hash` widened to VARCHAR(200) for Solana hashes. No migration tooling in-repo.

**Cache key families** (`packages/ingestor/src/cache.ts`): `ClosestBlockByDay` (24 h TTL), `LatestFinalizedBlock` (5 min), `WalletIndexingLock` (15 min), `WalletIgnore` (4 h, the "don't retry this wallet" list), poller state/offset keys, sonarx-related keys.

## 13. Pipeline / processing reference

| Stage                    | Component                      | Constant                                                                                  |
| ------------------------ | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Webhook accept           | etl-api                        | unauthenticated; acks even invalid payloads ("Invalid payload, but acknowledged")         |
| Wallet validity (EVM)    | PublicEvmClient EOA check      | `0x` prefix + EOA; rejects contracts                                                      |
| Wallet validity (Solana) | RPC `checkValidWallet`         | chain id must be 1399811149; rejects `0x…`/`test…`                                        |
| Initial sync window      | framework config               | EVM `preDateForSync` 60 days; Solana 30                                                   |
| Action cap per run       | framework config               | 1400 actions, then re-enqueue (120 s / 300 s delays)                                      |
| Provider execution       | RoundRobinExecutor             | timeout 5 s, 5 retries, 1 s cooldown, per-function stats                                  |
| Persistence              | backend PipelineV1             | delete-then-insert per block range; retry once on `CONNECTION_CLOSED`; KV lock 15 min TTL |
| Balance validation       | Debank `token_list`            | 9 EVM chains only; metrics `wallet_validation_total/ok`                                   |
| Status reporting         | `WALLET_INDEXING_STATUS` queue | `{wallet, chainId, status: "indexed"}`                                                    |

## 14. Algorithms

- **Deterministic IDs:** SHA-256 → first 15 hex chars (`packages/orm/src/utils.ts` `generateId`) — identical scheme to the Rust ingestor.
- **Signal conversion** (`SignalConverter`, `packages/orm/src/utils.ts`): Action → BUY/SELL; same-block buy+sell of different tokens → SWAP (parity with the Rust `create_signals`).
- **FIFO token lots** (`packages/pipelines/src/v1/creations.ts`): buys append lots, sells consume oldest-first; lots stored as JSONB.
- **WAC profit** (`packages/pipelines/src/v1/profit.ts`, BigNumber): `processBuy`/`processSell`/`calculateProfit` with a **2% tolerance on oversell** (small numerical slack before a sell is rejected); realized gain/percent per wallet+token+block into `performance_v1`.
- **Action-series invariant** (`ValidateActionSeries`): actions must be block-ascending, contiguous, same wallet/chain, unique IDs — enforced both in clients (before enqueue) and backend (before persistence).
- **Solana slot estimation** (`estimateSolanaSlot`, documented WHY in `apps/solana-client/README.md:38-53`): anchor `KNOWN_SLOT = 200_000_000` at `KNOWN_TIMESTAMP = 1672531200` (2023-01-01 UTC), assume **500 ms/slot** — no timestamp→slot RPC exists.
- **Solana historical balances by rewind** (documented WHY, solana-client README §"balance rewind"): fetch current balances, replay transactions in reverse to the target block.

## 15. External services / provider catalog

| Provider                   | Used by                                                                                                | For                                                               | Notes                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Moralis                    | etl-api (Streams API: add/remove stream addresses), evm-client (token balances, `/wallets/{w}/tokens`) | push triggers + balances                                          | stream IDs per env committed                                          |
| Mobula                     | evm + solana clients                                                                                   | transactions, historical balances, token metadata                 | primary tx source on both chains                                      |
| Bitquery                   | evm-client                                                                                             | transactions (GraphQL, OAuth2 client-credentials)                 | added Jun 2025 (#16)                                                  |
| Uniblock                   | evm + solana clients                                                                                   | balances, latest block, prices, JSON-RPC                          | also supplies the Solana RPC endpoint (QuickNode URL in wrangler var) |
| Etherscan v2               | evm-client                                                                                             | block-by-timestamp                                                | retry/backoff                                                         |
| Helius                     | solana-client                                                                                          | transactions (`/v0/addresses/{wallet}/transactions`), block times | added Jun 2025 (#20)                                                  |
| Debank                     | backend                                                                                                | balance validation (`pro-openapi.debank.com/v1/user/token_list`)  | 9 EVM chains                                                          |
| Public EVM RPCs            | evm-client                                                                                             | latest block, EOA validation                                      | free-tier fallback                                                    |
| Datadog (api.datadoghq.eu) | backend via `packages/utils/src/datadog.ts`                                                            | metrics                                                           | API+app keys hardcoded in source                                      |
| SonarX/Snowflake           | evm-client `providers/sonarx/`                                                                         | tested but **not wired** into the round-robin                     | dormant experiment                                                    |

## 16. API & auth reference

**etl-api** (`apps/etl-api/src/index.ts`, Hono):

| Route                                  | Auth                                           | Effect                                              |
| -------------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| POST `/moralis-wallet-activity`        | **none** (no webhook signature validation)     | parse stream payload → activity queues              |
| POST `/reindex/evm`, `/reindex/solana` | x-api-key (`API_KEY` var) via `authMiddleware` | enqueue pagination message                          |
| POST `/index`                          | x-api-key                                      | manually enqueue wallets                            |
| POST `/add-wallets`                    | x-api-key                                      | register wallets in Postgres **and** Moralis Stream |

**solana-poller** (also x-api-key): `GET/POST /state` (enable/disable), `POST /offset`. All other workers expose stub `fetch` (200 `[]`) or none. No TLS layer needed (Cloudflare edge). No rate limiting anywhere; the API keys are static shared secrets committed in wrangler.toml (see §9 #6).

## 17. Scheduling & queues

- **Cron:** exactly one — solana-poller `*/10 * * * *`, KV-gated, 10 wallets/run with 4-s stagger, KV offset resumes across runs.
- **Queue settings:** consumers configure **no** `max_batch_size`, `max_retries`, or DLQ; the sole tuning is auto-reindexer `max_concurrency = 1`. All retry/backpressure is in code (retry delays +2/+3 min, re-enqueue delays 120/300 s, RoundRobinExecutor cooldowns).
- **Backpressure pattern:** the clients re-enqueue their own messages to the _activity_ queues with delay — Cloudflare Queues' built-in delayed delivery used as a pacing mechanism.

## 18. Bindings, secrets & deployment

**Bindings matrix (per wrangler.toml):**

| App            | Queues (consumer)                       | Queues (producer)                                          | KV                   | Hyperdrive                      | Notable vars                                                  |
| -------------- | --------------------------------------- | ---------------------------------------------------------- | -------------------- | ------------------------------- | ------------------------------------------------------------- |
| etl-api        | —                                       | WALLET_ACTIVITY, SOLANA_WALLET_ACTIVITY, PAGINATED_REINDEX | —                    | HYPERDRIVE, TIMESERIES          | `API_KEY` (committed), `MORALIS_STREAM_ID`                    |
| evm-client     | wallet-activity                         | WALLET_ACTIVITY (self re-enqueue), WALLET_ACTION           | KV_NAMESPACE         | HYPERDRIVE, TIMESERIES          | secrets: MORALIS/MOBULA/ETHERSCAN/UNIBLOCK/BITQUERY keys      |
| solana-client  | solana-wallet-activity                  | WALLET_SOLANA_ACTIVITY (self), WALLET_ACTION               | KV_NAMESPACE         | — (uses `COMMON_DB_URI` secret) | `SOLANA_RPC_ENDPOINT` (committed, credential-ish)             |
| backend        | wallet-actions                          | WALLET_INDEXING_STATUS                                     | INGESTOR_WALLET_LOCK | HYPERDRIVE, TIMESERIES          | `DEBANK_API_KEY`, `DATADOG_API_KEY` (committed), `WORKER_URL` |
| solana-poller  | —                                       | SOLANA_WALLET_ACTIVITY                                     | KV_NAMESPACE         | HYPERDRIVE                      | `API_KEY` (committed)                                         |
| auto-reindexer | paginated-reindex (`max_concurrency=1`) | PAGINATED_REINDEX (self), both activity queues             | —                    | HYPERDRIVE                      | —                                                             |

**Secrets inventory (locations only):** committed plaintext `API_KEY`s (etl-api, solana-poller — same value across default/stg/prod), `DEBANK_API_KEY` + `DATADOG_API_KEY` (backend), Datadog API+app keys in `packages/utils/src/datadog.ts`, Moralis Stream UUIDs, QuickNode URL fragment (solana-client). Provider keys for clients are presumably `wrangler secret` (referenced in `worker-configuration.d.ts`, absent from toml). No `.github/` workflows exist — **no CI, no automated deploys**.

**Deployment:** `pnpm run deploy {app} {env}` → `node deploy.js` — but **`deploy.js` is gitignored** (root `.gitignore` `*.js` rule) and absent from the repo, so the documented deploy command is unrunnable from a fresh clone; mechanics must be recovered from the author or reconstructed from wrangler. Environments map to `[env.stg]`/`[env.prod]` wrangler sections with distinct queue names, Hyperdrive IDs, and KV namespaces. Rollback = redeploy an older commit. Migration `001` is applied manually against Postgres.

## 19. Operational gotchas & key file map

**Gotchas**

1. **README says D1; reality is Postgres-over-Hyperdrive.** Root diagram and backend README both claim D1; zero `d1_databases` in any wrangler.toml. The backend README's env names (`CLOUDFLARE_QUEUE`, `ACCEPTED_CHAIN_IDS`, `D1_DATABASE_URL`) exist nowhere in config.
2. **Moralis webhook is unauthenticated and acks garbage** — anyone who discovers the worker URL can feed activity messages into the pipeline (signature validation is the standard Moralis recommendation and is absent).
3. **No DLQ / max_retries on any queue consumer** — a persistently failing message loops against Cloudflare defaults; poison-message protection is only the in-code ack-on-validation-error mapping.
4. **`deploy.js` is gitignored**, breaking the documented deploy command for any fresh clone (a repo-wide `*.js` gitignore rule caught it by accident).
5. **`TIMESERIES` Hyperdrive binding is dead weight** in 3 apps; solana-poller's `workers_dev = true` exposes its control API on a workers.dev subdomain.
6. **Test script drift:** `apps/backend` points at a nonexistent test file; most provider tests hit live APIs (cost + flakiness); `worker-configuration.d.ts` (200+ KB generated) is committed per app; a stray `package-lock.json` sits in a pnpm workspace.
7. **Docs were generated last** (Codex branch, PR #26) and already drift from config — treat every README claim against the wrangler.toml of the same app.
8. **Solana slot estimation is a linear clock** (500 ms/slot from a 2023 anchor) — drift accumulates; only used where a block number is required by the shared schema.

**Key file map**

| Topic                                              | File                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------- |
| Ingestion framework (state machine, cache, errors) | `packages/ingestor/src/index.ts`, `cache.ts`, `errors.ts`                 |
| Pure signal/lot/PnL math                           | `packages/pipelines/src/v1/{index,creations,profit}.ts`                   |
| Drizzle schemas + DB class                         | `packages/orm/src/schemas/{common,index}.ts`, `packages/orm/src/utils.ts` |
| Provider reliability pattern                       | `packages/utils/src/round-robin-executor.ts`                              |
| HTTP edge                                          | `apps/etl-api/src/index.ts`, `middlewares.ts`, `moralis.ts`               |
| EVM provider fan-out                               | `apps/evm-client/src/providers/index.ts` + per-provider files             |
| Solana specifics (slot estimate, rewind)           | `apps/solana-client/src/{ingestor,utils,rpc_client}.ts`                   |
| Backend consumer + error policy                    | `apps/backend/src/index.ts`, `errors.ts`, `pipelines/pipelineV1.ts`       |
| Poller                                             | `apps/solana-poller/src/index.ts`                                         |
| Reindex fan-out                                    | `apps/auto-reindexer/src/index.ts`                                        |
| Infra per app                                      | `apps/*/wrangler.toml`                                                    |
| Schema delta                                       | `migrations/001__udpate_schema_06132025.sql`                              |

_End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially._
