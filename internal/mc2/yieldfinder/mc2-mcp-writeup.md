# MC2 MCP — Codebase Writeup

> **Internal document — not for publication.**
> Repo: `mcsquaredfi/mc2.mcp` (local: `~/Downloads/Projects/mc2/mc2.mcp`)
> Analysis date: 2026-10-02 · 201 commits on main · 2025-08-22 → 2025-11-07 (~11 weeks)
> Purpose: source of truth for deriving CV bullets, LinkedIn material, and blog posts. Scope: whole project with attribution (Dibakar Sutra Dhar = near-solo author, employee at MC² Finance; naming the company is approved).
> Companion documents: [mc2-agentic-writeup.md](./mc2-agentic-writeup.md) (the Albert chat agent) and [mc2-agentic2-writeup.md](./mc2-agentic2-writeup.md) (the rearchitected chat platform). **This is the server both consumed — and the user's flagship repo: 197 of 201 commits.**

---

# Part I — Narrative & Achievement View

## 1. TL;DR

MC² MCP is a **production MCP (Model Context Protocol) server and DeFi data pipeline** deployed at `mcp.mc2.fi` on Cloudflare Workers, exposing MC² Finance's vault/yield/protocol/wallet analytics to AI agents — principally **"Albert," MC²'s in-house chat agent**. It runs a scheduled 5-stage data pipeline (cron every 4h) that ingests vault metrics from 6 DeFi protocols (BeefyFi, Yo Protocol, IPOR, YieldFi, Turtle, Euler) plus CertiK security scores into PostgreSQL (via Hyperdrive + Drizzle ORM) and a Typesense serving layer, and an Exponential.fi risk-scoring batch subsystem engineered around a 50-calls/day API budget (KV token-bucket rate limiter, rotating 40-contract batches, 7-day cooldowns, cleanup cycles). **Dibakar Sutra Dhar is the near-solo author: 197 of 201 commits (98%) over 11 weeks, ~47,500 hand-written lines (+47,484/−24,309 excluding generated files), 175 new files — architect, data engineer, and API integrator in one.** Christoph Richter contributed 4 commits: client-integration docs, a CORS fix, a yield-score addition, and a wallet-tool fix. The repo was frozen mid-feature (Euler v2 integration) on Nov 7, 2025.

Ready-to-adapt CV summary sentence: _Built and operated a production MCP server and DeFi data pipeline on Cloudflare Workers as sole engineer — 15 external API integrations, a scheduled 5-stage ingestion pipeline into PostgreSQL and Typesense, risk-scoring batch processing under a 50-calls/day API budget, and 10 MCP tools consumed by the company's production AI agent._

## 2. The product

**What it is:** the "MCP for DeFi data" — a standardized tool server that any MCP client (Albert, Claude Desktop, Cloudflare AI Playground) can connect to and immediately query MC²'s curated vault/yield/protocol dataset in natural language. The data side (pipeline) and the AI side (MCP surface) live in one Worker.

**Target users:** primary consumer is Albert (live at `mytokenagent.mc2.fi`); secondary are any MCP clients per the README.

**Feature table:**

| Feature                            | What it does                                                                                                                                                                                                         | Status                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| MCP server (SSE + streamable HTTP) | `/sse` + `/mcp` transports on a Durable Object (`MC2MCP` via agents SDK `McpAgent`); sessions persist per client                                                                                                     | **Live, in production**                             |
| 10 active MCP tools                | `search_vaults` (~60 Zod filters), `vault_apy_analyzer`, `vault_historical_data`, `search_protocols`, `search_tokens`, `top_yields`, `risk_analyzer`, `wallet_portfolio`, `wallet_positions`, `wallet_top_positions` | **Live** (6 more wallet tools written but disabled) |
| 5-stage data pipeline              | scan → active-set → metrics → risk scores → Typesense merge; cron every 4h + manual `/sync`                                                                                                                          | **Live** (`src/jobs/orchestrator.ts`, 959 LOC)      |
| 6 protocol processors              | BeefyFi, Yo Protocol, IPOR, YieldFi, Turtle, Euler v2 — plugin registry with template-method base class                                                                                                              | **Live** (5 more API clients built but unused)      |
| Exponential risk batch             | Daily 2AM rotating batches of 40 contracts; KV token-bucket rate limiter (50 calls/day); 7-day cooldown; cleanup cycle for 3x-failed contracts; deadlock-retrying Postgres upserts                                   | **Live, the most engineered subsystem**             |
| AI-native response shaping         | Per-response UX guidelines injected into MCP results; LLM-shaped fields (`yield_score`, `risk_level`, `sustainability`); 8 prompts (deprecated); 4 resources                                                         | **Live** (prompts/resources partially stale)        |
| Zerion wallet suite                | Portfolio/positions via Zerion API                                                                                                                                                                                   | **Live** (3 of 9 tools enabled)                     |

## 3. Architecture (summary level)

- **Runtime:** one Cloudflare Worker (`src/index.ts`, 408 LOC — MCP agent + REST side-routes + cron handler), `cpu_ms: 300000`, observability on.
- **Size:** 100 files, **22,083 LOC** in `src/`: `src/core/` 12,990 (API clients, processors, DB, services), `src/mcp/` 4,583 (tools/resources/prompts), `src/search/` 2,225 (Typesense layer), `src/jobs/` 979 (orchestrator/registry).
- **Storage:** PostgreSQL (AWS RDS staging cluster, via **Hyperdrive** binding + Drizzle ORM, schema `yields` — 6 tables, 5 enums) as the write store; **Typesense** as the read/serving store for tools; **KV** for API caching and rate-limit buckets. A Durable Object backs MCP sessions.
- **External services:** ~15 API integrations (BeefyFi, Yo Protocol + DefiLlama, IPOR, YieldFi, Turtle, Euler subgraph/indexer/rewards, Exponential, CertiK, Zerion — plus 5 built-but-unused: Uniblock, PortalsFi, YieldXYZ, InfiniFi, DefiLlama standalone).
- **Triggers:** 2 crons (`0 0 */4 * *`, `0 2 * * *`) + manual HTTP endpoints (`/sync`, `/test/batch-pipeline`, `/data/missing`).

Deep detail in Part II.

## 4. The story: how the project evolved

Nine phases reconstructed from git (linear history, no merges, solo trunk development):

| Phase                                | Dates     | Theme                                                                                                                                                                                                               | Commits |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1. Bootstrap                         | Aug 22    | Workers + MCP skeleton (`4eaa660`), Yo Protocol tools day one (`91b9a04`)                                                                                                                                           | 1–2     |
| 2. Persistence + MCP surface         | Aug 26–31 | **Drizzle/Postgres** (`7d7b73c`), schema+queries (`a9722d8`), Typesense (`30e82e6`), first cron (`8a82427`), CertiK (`d2192ef`); Aug 26 = 21 commits in one day                                                     | 29      |
| 3. Processor architecture            | Sep 1–10  | BeefyFi (`63b58e0`/`27d8e5f`), `ProtocolRegistry` pattern (`8e6b463`), CI/CD deploy (`1b6068d`)                                                                                                                     | 32      |
| 4. Monorepo restructure              | Sep 11–17 | **17-commit day**: torn out to `src/core`, search stack rebuilt, `BaseTool` (`9eca151`) — the codebase's current shape                                                                                              | 35      |
| 5. Orchestrator era + protocol blitz | Sep 18–30 | **`DataPipelineOrchestrator` replaces VaultSync/VaultScan** (`c483cac`, +406/−760); IPOR, YieldFi, Turtle, InfiniFi, Uniblock clients land                                                                          | 29      |
| 6. Tool registry + TopYield          | Oct 1–5   | Query builders (`724a293`), `SearchFacade` (`ff139fe`), registries for vaults/tokens/protocols (`714b86e`, `56d7419`), `TopYieldService` (`76f4814`)                                                                | 22      |
| 7. Euler v1, wallets, Exponential    | Oct 6–19  | Euler direct-API processor v1 (`dc27655`); **Zerion wallet suite** (`8634000`); **Exponential risk integration** — 6 commits in 10 minutes (`07b938c` test suite, `64d454f` rate limiter, `8c7c242` deadlock retry) | 25      |
| 8. Batching + Euler v1 teardown      | Oct 20–31 | **`BatchExponentialProcessor` + `BatchCoordinator`** with tests (`08f1695`, `22c71ba`); Euler v1 deleted (`8d46be0`) for subgraph approach                                                                          | 20      |
| 9. Euler v2 rebuild                  | Nov 1–7   | `EulerSubgraphApi` (Goldsky) + `EulerIndexer` + new `EulerProcessor` (`03cf7a2`, `f3b3d44`) — **frozen mid-feature Nov 7**                                                                                          | 7       |

**Dibakar's tenure:** first commit `4eaa660` (2025-08-22), last `efbc0cd` (2025-11-07 11:50) — a small Euler enhancement, meaning the project was **frozen mid-work, not wrapped up**: no version tag, no docs-finalization commit. **What happened after:** nothing on this repo; the company's agent line continued in `mc2.agentic2` (Sept–Oct 2025, see companion writeup). Cadence: sustained 15–30 commits/week through mid-October with documented late-night bursts (commits at 03:01–03:13 AM on Sep 18; past-midnight runs Oct 20–21) — the commit-hour histogram peaks at 19:00–21:00 local time.

The Euler arc (v1 direct API → deleted → v2 subgraph/indexer) is the repo's second build-and-pivot cycle, mirroring the user's MCP-server pivot in `mc2.agentic` — evidence of a consistent willingness to tear out working code when the data source proves wrong.

## 5. The user's contributions in detail

### Ownership map

197/201 commits, 175 of 181 new files. Top-touched files: `src/index.ts` (44 commits), `src/jobs/orchestrator.ts` (20), `src/jobs/vault-sync.ts` (14, until deleted), `src/core/externalApis/index.ts` (14), `src/core/db/queries.ts` (13), `wrangler.jsonc` (10). Christoph's footprint: 4 commits, +1,714/−29 — of which 93% is documentation (`f4a3460`: `CURSOR_AGENT_PROMPT.md`, `SSE_INTEGRATION_GUIDE.md`, `spec.md`, 3 `src/mcp/spec.*.md`) plus a CORS fix, a yield-score line in `TopYieldService`, and a cross-cutting "fixed multicalls" pass over the wallet tools (`5d3b004`). Reading: **the user owned every layer** — infra, data pipeline, external integrations, DB schema, search layer, MCP tool surface, tests; Christoph consumed the server and wrote its client-facing documentation.

### Thematic breakdown (197 commits grouped)

**Theme 1 — Infrastructure & delivery.** Worker + DO setup (`4eaa660`), cron triggers (`8a82427`), KV cache binding (`3ad2f3b`), GitHub Actions deploy (`1b6068d`), four wrangler upgrades across the project's life (`e43fd23` → `15f6642`).

**Theme 2 — Database layer (Drizzle + PostgreSQL).** Schema with 6 tables / 5 enums (`a9722d8`, `55ec2da`); `YieldQueries` (1,413 LOC) with transactional batch inserts, `recommendedBy` array merging, and a **Postgres deadlock-retry wrapper** (40P01, exponential backoff — `8c7c242`); batch-state management for the risk pipeline (`df24cc3`).

**Theme 3 — External API integrations (15 clients).** In landing order: Yo Protocol (`91b9a04`), CertiK (`d2192ef`), BeefyFi (`63b58e0`), YieldXYZ (`a2fca16`), PortalsFi (`3d2c2f1`), InfiniFi (`6511d73`), YieldFi (`90bcc2f`), IPOR (`b6a5cc6`), Uniblock (`f51f919`), DeFiLlama (`2b048be`), Euler v1 (`ea7d368`), Zerion (`8634000`), Exponential (`9d9c936`), Turtle (`9768dca`), Euler v2 subgraph/indexer (`af32757`, `03cf7a2`). A shared `SuperApi` wrapper (`superApi.ts`) adds KV caching with stale-while-revalidate and background refresh (`176e45c`, `cache-config.ts`).

**Theme 4 — Pipeline architecture.** `VaultScan`/`VaultSync` → template-method `BaseProtocolProcessor` (`6e111d5`) → `ProtocolRegistry` (`8e6b463`) → **`DataPipelineOrchestrator`** (`c483cac`: 538-line VaultSync + 79-line VaultScan replaced by a 368-line orchestrator with 5 stages, `Promise.allSettled` parallelism, and deadlock-free chain pre-insertion) → batch subsystem (`08f1695`: `BatchExponentialProcessor` + `BatchCoordinator` with day-modulo batch rotation, 7-day cleanup cycles for 3x-failed contracts).

**Theme 5 — MCP tool surface.** `BaseTool` abstract class with timing/error JSON envelopes (`9eca151`); per-domain registries (`714b86e`, `56d7419`, `004a887`); `search_vaults` with ~60 flattened Zod filters (`26d790d`); `RiskAnalyzerTool` (`d7f6cc3`); `YieldAnalyzerTool` + `TopYieldService` (`64a82b4`, `76f4814`); guidelines-injection mechanism (`createSuccessResponseWithGuidelines`).

**Theme 6 — Search layer.** Typesense client (`3ef06ac`), SOLID refactor into `SearchService`/`SearchFacade`/per-entity query builders (`8ade74a`, `724a293`, `ff139fe` — documented in `src/search/README.md`).

**Theme 7 — Risk & scoring.** CertiK score sync (`4f92bd9`, `28e9f8b`); the Exponential series: integration (`9d9c936`), full test suite (`07b938c`, 1,107 lines), token-bucket rate limiter (`64d454f`), batch upserts (`cacb707`).

**Theme 8 — Refactors & pivots.** Server rename `MyMCP`→`MC2MCP` (`ca5d57e`); monorepo restructure (`bbafaf8`, `55ec2da`, `eb8e6b2`); schema-wide `poolUrl`→`depositUrl` (`82781cd`); Euler v1 removal (`8d46be0`, `7f01e67`).

**Line accounting:** +63,715/−24,932 raw; **+47,484/−24,309 excluding generated files** (`worker-configuration.d.ts` + `pnpm-lock.yaml` + `package-lock.json` = +16,231/−623, i.e. 25.6% of gross additions). Commit hygiene: 196/197 Conventional Commits (153 `feat`, 30 `refactor`, 7 `chore`, 5 `fix`), with descriptive multi-clause subjects — and notably only 5 `fix` commits in 11 weeks, an append-heavy development style.

### Signature engineering moments

1. **The orchestrator migration (Sep 18).** Replaced two ad-hoc sync jobs (617 lines) with a 5-stage orchestrator — scan (parallel, `Promise.allSettled`, chains pre-inserted to avoid deadlocks) → active-set → metrics → risk → Typesense merge (batch 25, metrics-only strategy). One commit, +406/−760, still the backbone of every cron run.
2. **Engineering around a hard API budget (Oct 13–21).** The Exponential risk API allows 50 calls/day. The response: a KV-backed token-bucket rate limiter (50 tokens, midnight-UTC reset, 5-token safety margin), a `BatchCoordinator` that rotates 40-contract batches day-by-day with per-contract state in Postgres (`batch_processing_state` — pending/processing/success/failed, failure counts), a 7-day per-item cooldown, a cleanup batch every 7 days for 3x-failed contracts, `DRY_RUN` support, a status endpoint, and an 11-test suite covering failure isolation and rate-limit handling. This is the repo's most engineered subsystem and its best testing story.
3. **AI-native API design.** Tool input schemas double as prompt engineering (flattened Zod with `.describe()` on every parameter "for better MCP client compatibility"); tool responses carry injected **guidelines blocks** (`getExponentialUxGuidelines()`: the 5–10%→>40% yield-risk framework, chain blurbs, emoji-encoded strength) so the consuming LLM is coached mid-conversation; `TopYieldService` returns LLM-shaped fields (`yield_score`, `risk_level`, `sustainability`, `characteristics`). The repo even ships its own client-side system prompt (`CURSOR_AGENT_PROMPT.md`).
4. **The Euler pivot (Oct 6 → Oct 31 → Nov 4).** Direct-API client and processor built, run in production, then deliberately deleted in favor of a Goldsky subgraph + official indexer + rewards API (the latter requiring a spoofed browser UA — `EulerRewardsApi`). Built, measured, torn out, rebuilt better — with the v2 rebuild still in flight when the repo froze.
5. **Solo ownership of a data platform.** Over 11 weeks and ~140 external-API-touching files, one engineer integrated 15 third-party data sources, designed the schema for three different consumers (pipeline writer, Typesense indexer, MCP tools), and kept a live production endpoint (`mcp.mc2.fi`) evolving throughout.

### Commit hygiene

196/197 conventional commits, scoped (`feat(vault-tools)`, `feat(exponential)`, `refactor(jobs)`), verbose descriptive subjects; no PRs, no tags, straight-to-main trunk development — consistent with a solo developer + AI-assisted workflow (the repo itself ships an agent prompt and Cursor rules were used).

## 6. Engineering practices observed

- **Testing (best of the three sibling repos):** vitest with a real mock infrastructure (`MockKV` with time fast-forward, `MockYieldQueries`, `MockTypesense`, `MockExponentialApi`, 250-contract test fixtures) and an 21-test coverage of the batch pipeline (11 processor + 10 integration tests). Gaps: no tests for the search layer, main orchestrator path, MCP tools, or DB queries; npm scripts `test:exponential`/`test:pipeline` point at deleted test files; `zerion.test.js` (570 LOC) is a manual `tsx` script excluded from vitest.
- **CI:** deploy-only (dry-run build → `wrangler-action@v3` on push to main). No test/lint gates.
- **Docs culture:** 9 markdown docs, but **systemic documentation drift** — every root doc advertises the older camelCase 9-tool API (`getStablecoinYieldData` etc.) that the Oct 2 registry rewrite replaced with snake_case tools; `src/mcp/prompts/prompts.ts` is marked `@deprecated` and references nonexistent tools; `src/mcp/resources/system.ts` returns hardcoded placeholder stats (`totalVaults: 1247`, `uptime: '99.8%'`, 2024-01-15 sync dates). Only `src/search/README.md` matches the code.
- **Zero TODO/FIXME/HACK markers in the entire codebase** (grep-verified) — debt was either fixed or silently left as dead code (5 unused API clients, 6 disabled wallet tools).

## 7. Numbers worth quoting

| Metric                         | Value                                                                                           | Source / how to reproduce                                                            |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| User's share of commits        | 197 of 201 (98%) · Aug 22 – Nov 7, 2025                                                         | `git shortlog -sne HEAD`                                                             |
| User's diff, hand-written code | +47,484 / −24,309                                                                               | numstat excluding `worker-configuration.d.ts`, `pnpm-lock.yaml`, `package-lock.json` |
| User's diff, raw               | +63,715 / −24,932 (25.6% generated-file inflation)                                              | numstat                                                                              |
| New files authored             | 175 (of 181 total new files)                                                                    | git log --diff-filter=A                                                              |
| Codebase size                  | 100 files, 22,083 LOC in `src/`                                                                 | `find src -type f \| xargs wc -l`                                                    |
| External API integrations      | 15 clients + Euler subgraph layer (6 fully unused)                                              | `src/core/externalApis/`                                                             |
| Protocol processors            | 6 live (BeefyFi, Yo, IPOR, YieldFi, Turtle, Euler)                                              | `src/jobs/orchestrator.ts:117-131`                                                   |
| MCP tools                      | 16 written, 10 registered                                                                       | `src/mcp/tools/*/index.ts`                                                           |
| Pipeline stages / cadence      | 5 stages · every 4h (`0 0 */4 * *`) + daily 2AM risk batch                                      | `wrangler.jsonc`                                                                     |
| Exponential API budget         | 50 calls/day, 40-contract batches, 7-day cooldown/cleanup cycle                                 | `src/core/services/rate-limiter.ts:201`, `batch-coordinator.ts`                      |
| Cache TTLs                     | 4h protocol data (6h SWR) · 12h historical (24h SWR)                                            | `src/core/externalApis/cache-config.ts`                                              |
| Biggest refactor commits       | `c483cac` (+406/−760 orchestrator) · `eb8e6b2` (+2,225 MCP consolidation) · Sep 11 = 17 commits | git show --stat                                                                      |
| Busiest single day             | Aug 26, 2025 — 21 commits                                                                       | git log                                                                              |
| Search filters                 | ~60 Zod-validated filters on `search_vaults`                                                    | `src/mcp/tools/vaults/search.ts`                                                     |
| Test suites                    | 21 tests (11 batch processor + 10 pipeline integration)                                         | `src/core/processors/__tests__/`, `src/__tests__/integration/`                       |

## 8. Raw material for derived artifacts

### CV bullet candidates

- Built and operated a production MCP (Model Context Protocol) server for DeFi analytics on Cloudflare Workers as sole engineer — live at mcp.mc2.fi, consumed by the company's AI agent — across 197 commits in 11 weeks (~47K lines).
- Architected a scheduled 5-stage data pipeline (scan → metrics → risk → index) ingesting 6 DeFi protocols and 15 external APIs into PostgreSQL (Drizzle + Hyperdrive) and a Typesense serving layer, with deadlock-retrying batch upserts and stale-while-revalidate KV caching.
- Engineered a risk-scoring batch system around a 50-calls/day API constraint: KV token-bucket rate limiter, day-modulo batch rotation over 40-contract cohorts, 7-day cooldowns, automated cleanup cycles for failed contracts, and 21 vitest tests with full mock infrastructure.
- Designed an AI-native tool API: ~60-filter Zod-validated vault search, per-response LLM coaching injected as MCP guideline blocks, and yield-analysis outputs shaped for model consumption (`yield_score`, `risk_level`, `sustainability`).
- Executed two build-measure-pivot cycles: replaced ad-hoc sync jobs with a pipeline orchestrator (−760/+406 lines) and migrated Euler integration from direct API to subgraph/indexer after production evaluation.
- Grew the tool surface from a 1-protocol demo to 10 registered MCP tools (vaults, protocols, tokens, yields, wallet portfolios) with a SOLID refactored search layer (service/facade/query-builders).

### Blog-post angles

1. **"Building an MCP server for DeFi data: what AI agents actually need from your API"** — the guidelines-injection pattern, schema-as-prompt-engineering, and LLM-shaped response fields are all here with real code; strongest angle because MCP experience is rare and this is production.
2. **"Engineering around 50 API calls a day"** — the Exponential budget story: token bucket, batch rotation, cooldowns, cleanup cycles; a rare concrete constraint-driven-design narrative.
3. **"I deleted my own 500-line module and it got better"** — the two pivots (VaultSync→orchestrator; Euler v1→subgraph) told through commit archaeology; honest post-mortem material.
4. **"One schema, three consumers"** — how the Postgres schema served the pipeline writer, the Typesense indexer, and the MCP tool layer simultaneously; the polymorphic `exponential_risk` table is a nice case study.
5. **"The docs always lie (including mine)"** — every doc in this repo drifts from the code within weeks; a governance-of-AI-generated-docs angle supported by concrete evidence.

### LinkedIn headline candidates

- "Built the MCP server behind MC² Finance's AI agent — 15 DeFi data integrations, a scheduled pipeline into Postgres + Typesense, and AI-native tool design, on Cloudflare Workers."
- "Software engineer — AI infrastructure & data pipelines: sole engineer on a production Model Context Protocol server for DeFi analytics."

## 9. Caveats for accuracy

- **⚠️ Committed credentials (sensitive):** `wrangler.jsonc` contains a staging PostgreSQL connection string with username and password in plaintext (`postgres://old_server:…@postgres-staging-1…`), present in the current tree and full git history. If this repo is ever made public, those credentials must be rotated and purged first. Do not quote the connection string anywhere.
- **No authentication** on any endpoint (MCP or REST) — "authless" by design for public MCP consumption, but never describe this as a secured/authorized system.
- **Placeholder numbers are not real metrics:** `src/mcp/resources/system.ts` hardcodes `totalVaults: 1247`, `uptime: '99.8%'`, and 2024-01-15 dates; `spec.md` repeats "1,247 vaults across 5 chains" (likely sourced from that placeholder); README says "150+ vaults / 40k+ tokens". None are measured values — never quote them as scale numbers. The only defensible scale claims are code-derived (tools, processors, integrations, LOC).
- **Documentation drift:** every tool name in `spec.md`, `README.md`, `CURSOR_AGENT_PROMPT.md`, and `SSE_INTEGRATION_GUIDE.md` is stale (camelCase, pre-Oct-2). When describing the tool catalog, cite the code (`src/mcp/tools/*/index.ts`), not the docs.
- **Generated-file inflation:** quote +47,484/−24,309, never +63,715.
- **Frozen mid-work:** the final state (Nov 7) is an in-flight Euler v2 integration — the `euler` remote branch is a stale Sept 4 pointer, not feature work. Don't describe the Euler v2 integration as "completed."
- **"6 protocols integrated" ≠ "8 API clients usable"**: Uniblock, PortalsFi, YieldXYZ, InfiniFi, and DefiLlama clients are complete but unused by any processor; 6 wallet tools are written but commented out. Precise phrasing: "6 live protocol processors; 15 integration clients built."
- **Christoph's role:** client-facing docs + four small fixes. All architecture, data, and tool work is the user's — this is one of the few repos where "built the system" is a fair claim, provided the AI-assisted workflow (Cursor/Claude, conventional-commit style) is acknowledged if asked.
- **The prompts/resources layer is deprecated:** 8 prompts marked `@deprecated` referencing nonexistent tools; resources return static JSON. The live product is tools-only.

---

# Part II — Technical Reference

Purpose: standalone reference extracted from source at analysis date (2026-10-02), so future work never requires re-reading the codebase. File paths relative to repo root.

## 10. System topology

```
MCP clients (Albert agent, Claude Desktop, …)
  │  SSE (/sse + /sse/message)  or  streamable HTTP (/mcp)
  ▼
Cloudflare Worker "mc2-mcp" (src/index.ts, 408 LOC)
  ├─ MC2MCP Durable Object ("MCP_OBJECT")  — MCP sessions via agents SDK McpAgent
  ├─ Tool layer (src/mcp/)  ──reads──▶ Typesense cloud (search collections)
  │        │ fallback / risk-analyzer ──▶ CertiK API
  │        └─ wallet tools ──▶ Zerion API
  ├─ REST side-routes (/sync, /api/vaults/top/*, /api/pipeline/exponential-status …)
  └─ scheduled() cron handler
         ▼
     DataPipelineOrchestrator (src/jobs/orchestrator.ts)
     ├─ 6 protocol processors ──▶ BeefyFi / Yo+DefiLlama / IPOR / YieldFi / Turtle / Euler (subgraph+indexer) APIs
     ├─ CertiK Skynet ──▶ risk scores
     ├─ Exponential API ──▶ pool risk (via KV token-bucket limiter)
     ├─ Postgres (AWS RDS eu-west-1) via Hyperdrive + Drizzle  ← write store
     └─ Typesense collections (entities, contracts)            ← read/serving store
```

Who talks to what: only the Worker/DO touches Postgres (through Hyperdrive), Typesense, KV, and all external APIs; MCP clients touch only the MCP endpoints. KV serves double duty (API response cache + rate-limit buckets). Cron drives the pipeline; humans drive `/sync`.

## 11. End-to-end data flows

**Flow 1 — Full metrics pipeline** (cron `0 0 */4 * *` or `GET /sync`; `orchestrator.ts` `executeFullPipeline`)

1. `preprocessChains()` inserts 8 hardcoded chains first (deadlock avoidance).
2. `scanForNewData()` — every processor's `scanVault()` in parallel (`Promise.allSettled`); failures isolated per protocol.
3. `getAllActiveData()` — read entities + active contracts with relations from Postgres.
4. `collectMetrics()` — per-entity `syncVaults()` → `TypesenseContractMetrics` {tvl, tvm, apy1d/7d/30d, rewardYield, sharePrice, apr, balances, fees}.
5. `collectRiskScores()` — CertiK Skynet batch scans by `certikId`, per supported chain.
6. `mergeAndUpdateTypesense()` — upsert `entities` + `contracts` collections, merge risk + metrics (batch 25, `metrics-only` strategy).

**Flow 2 — Exponential risk batch** (cron `0 2 * * *` or `GET /test/batch-pipeline`; `executeExponentialBatchPipeline`)

1. `BatchCoordinator` (`src/core/services/batch-coordinator.ts`) selects the day's batch: day-modulo rotation over 40-contract batches tracked in `batch_processing_state`; every 7 days a cleanup batch re-processes contracts with `failureCount >= 3`.
2. `BatchExponentialProcessor` fetches pool risk per contract through the KV token-bucket limiter (`rate-limiter.ts`: `maxTokens: 50`, midnight-UTC reset, 5-token safety margin, wait-or-skip).
3. Results upserted into `exponential_risk` (polymorphic pool|protocol rows) via deadlock-retrying transactions; `exponentialLastUpdated` timestamps advanced. `DRY_RUN` env short-circuits writes. Status at `GET /api/pipeline/exponential-status`.

**Flow 3 — MCP tool call** (`src/mcp/tools/`)

1. Request hits `/mcp` or `/sse` → routed into the `MC2MCP` DO; session state persists per client.
2. Tool registry dispatch → `BaseTool.execute()` wrapper: timing logs, Zod input validation, success/error JSON envelopes (`src/mcp/helpers/responses.ts`).
3. Tool queries Typesense via `SearchFacade`/query builders (`src/search/`); `risk_analyzer` falls back to CertiK; wallet tools call Zerion.
4. Response assembled; if results carry Exponential ratings, a guidelines block is appended as a second content part (`createSuccessResponseWithGuidelines`).

**Flow 4 — Vault historical data** (`src/mcp/tools/vaults/historical-data.ts`)
Discovers the vault via Typesense search → routes to the owning protocol processor's `getHistoricalData()` through the orchestrator → filters to the last 2 weeks. Supported: BeefyFi, Yo, IPOR, YieldFi.

**Flow 5 — `/data/missing` analysis** — scans Typesense contracts for missing fields and logs counts only; **does not repair** (half-finished, `orchestrator.ts:175-319`).

## 12. Data model reference

**Store inventory:**

| Engine                           | Name                                 | Contents                                     |
| -------------------------------- | ------------------------------------ | -------------------------------------------- |
| PostgreSQL (RDS, via Hyperdrive) | schema `yields`                      | canonical protocol/entity/contract/risk data |
| Typesense cloud                  | `entities`, `contracts` collections  | serving layer for MCP tools                  |
| KV (`MCP_CACHE_KV`)              | API cache entries + rate-limit state | TTL/SWR per `cache-config.ts`                |
| DO SQLite (`MC2MCP`)             | MCP session state                    | agents SDK managed                           |

**Postgres tables** (`src/core/db/schema.ts`, Drizzle, pgSchema `yields`):

- `chains` — PK `chain_id` (varchar 25); name unique, shortname, logo, nativeAsset, explorer, blockTime.
- `entities` — serial PK; slug unique; `entity_type` enum `protocol|provider|curator`; chain FK (cascade); certikId, exponentialId; timestamps. 4 indexes.
- `contracts` — PK `address` (varchar 42); entity FK; chain FK; protocolType; contractType default `'yield'`; **`recommendedBy` varchar[]**; depositUrl (renamed from poolUrl, `82781cd`); operatorAddress, escrowAddress; `underlyingAssets` jsonb; baseAsset, shareAsset; status enum `active|inactive|deprecated`; exponentialLastUpdated. 4 indexes.
- `metadata` — PK contractAddress; name, symbol, decimals, description, logo; jsonb metadata.
- `exponential_risk` — serial PK; **polymorphic**: unique nullable `contractAddress` XOR unique nullable `entityId` + `recordType` `'pool'|'protocol'`; pool rating/color/description/url; chain/assets/protocols ratings as jsonb; protocol fields.
- `batch_processing_state` — PK contractAddress (FK); batchNumber; batchType enum `normal|cleanup|excluded`; status enum `pending|processing|success|failed`; failureCount; errorMessage; excludedReason. 4 indexes.

Query layer: `YieldQueries` (`src/core/db/queries.ts`, 1,413 LOC) — transactional `insertVaultData`/`batchInsertVaults` (with `recommendedBy` array merge), `retryOnDeadlock` (Postgres 40P01, exponential backoff, lines 24–64), batch-risk upserts, all batch-state transitions. **Migrations: drizzle-kit configured (`drizzle.config.ts`) but no `drizzle/` directory committed — schema applied out-of-band.**

## 13. Pipeline / processing reference

| Stage                                  | External call                      | Writes                                       | Constants                                                               |
| -------------------------------------- | ---------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| Chain pre-insert                       | none                               | `chains`                                     | 8 hardcoded chains                                                      |
| Scan                                   | all protocol APIs                  | entities, contracts                          | `Promise.allSettled`, per-processor isolation                           |
| Metrics                                | protocol APIs                      | Typesense `contracts`                        | batch 25, metrics-only merge                                            |
| Risk scores                            | CertiK `partner.certik-skynet.com` | Typesense + risk fields                      | batch by chain                                                          |
| Exponential batch                      | `api.exponential.fi`               | `exponential_risk`, `batch_processing_state` | 40/batch, 50 calls/day, 7-day cooldown + cleanup cycle                  |
| Caching (all API calls via `SuperApi`) | —                                  | KV                                           | protocolData TTL 4h/6h SWR; historical 12h/24h SWR + background refresh |

Retry/recovery: Postgres deadlock retry (3x exponential backoff); processor failures isolated by `Promise.allSettled`; failed contracts retried via cleanup batches; everything else fails soft to logs (observability enabled).

## 14. Algorithms

- **Token-bucket rate limiter** (`src/core/services/rate-limiter.ts`): 50 tokens/service, refill at midnight UTC, 5-token safety margin under the true budget, KV-persisted counters with hourly-until-reset status reporting. Consume-or-wait semantics with per-call logging.
- **Batch rotation** (`batch-coordinator.ts`): day-of-epoch modulo over fixed 40-contract batches; `isBatchProcessedToday` idempotence; cleanup batch (every 7 days) re-enqueues contracts with `failureCount >= 3`; excluded contracts carry `excludedReason`.
- **Deadlock retry** (`queries.ts:24-64`): catch Postgres `40P01`, exponential backoff, re-run transaction — needed because parallel processor scans contended on chain/entity inserts until `preprocessChains` was added.
- **TopYield ranking** (`src/core/services/top-yields.ts`, 842 LOC): per-category (stablecoin/bluechip/overall) top-5, `yield_score` computation preferring CertiK-backed vaults, "optimal" APY band 7–13%, `risk_level` ∈ low|medium|high|extreme. (Christoph added the yield-score field, `a0fc5dd`.)
- **Yield-risk framework** (`src/mcp/helpers/guidelines.ts`): <5% "may not justify the risk" · 5–10% conservative · 10–20% medium · 20–40% high · >40% extreme (🥵); TVL strength 💪💪💪 > $100M. This is the doc-recorded, code-current risk rubric.

## 15. External services / model catalog

| Client (file)                                      | Base URL                                                    | Consumed by                 | Status                     |
| -------------------------------------------------- | ----------------------------------------------------------- | --------------------------- | -------------------------- |
| BeefyFiApi                                         | api.beefy.finance, data.beefy.finance                       | BeefyFiProcessor            | live                       |
| YoProtocolApi (+DefiLlama)                         | api.yo.xyz, api.llama.fi, yields.llama.fi                   | YoProtocolProcessor         | live                       |
| IporApi                                            | api.ipor.io                                                 | IporProcessor               | live                       |
| YieldFiApi                                         | ctrl.yield.fi                                               | YieldFiProtocolProcessor    | live                       |
| TurtleProtocolApi (+Napier)                        | api.turtle.xyz                                              | TurtleProcessor             | live                       |
| EulerSubgraphApi                                   | Goldsky per-chain subgraphs                                 | EulerProcessor v2           | live (in flight at freeze) |
| EulerIndexer / EulerRewardsApi                     | indexer-main.euler.finance / app.euler.finance (spoofed UA) | EulerProcessor v2           | live                       |
| ExponentialApi                                     | api.exponential.fi                                          | BatchExponentialProcessor   | live, rate-limited         |
| CertikApi                                          | partner.certik-skynet.com                                   | orchestrator, risk_analyzer | live                       |
| ZerionApi (Basic auth)                             | api.zerion.io                                               | wallet tools                | live                       |
| Uniblock, PortalsFi, YieldXYZ, InfiniFi, DefiLlama | —                                                           | nothing                     | **built, unused**          |

No LLM is called in this repo — it is tool/data infrastructure for LLMs. Transport: MCP over SSE (120s keep-alive) and streamable HTTP; no AI Gateway here.

## 16. API & auth reference

- **MCP endpoints:** `/sse` + `/sse/message` (`MC2MCP.serveSSE('/sse')`, Cache-Control no-cache, keep-alive 120s) and `/mcp` (`MC2MCP.serve('/mcp')`, streamable HTTP) — `src/index.ts:32-51`.
- **REST routes (11):** `/sync`, `/data/missing`, `/test/batch-pipeline`, `/init/batch-states`, `/search`, `/api/vaults/top/{category}`, `/api/pipeline/exponential-status`, `/` — plain-fetch router alongside the MCP agent.
- **Auth: none.** All endpoints public; no OAuth, API keys, or rate limiting on inbound requests (KV limiter is outbound-only). Sessions are unauthenticated Durable Object instances.
- **Tools (10 registered):** vaults — `search_vaults` (~60 Zod filters), `vault_apy_analyzer`, `vault_historical_data`; protocols — `search_protocols`; tokens — `search_tokens`; yield — `top_yields`; shared — `risk_analyzer`; wallets — `wallet_portfolio`, `wallet_positions`, `wallet_top_positions` (6 more commented out in `src/mcp/tools/wallets/index.ts:20-32`).
- **Resources (4):** `mc2://vaults/schema`, `mc2://system/{status,documentation,collections}` — static JSON with placeholder stats.
- **Prompts (8):** all `@deprecated` (`src/mcp/prompts/prompts.ts`).

## 17. Scheduling & queues

| Schedule                 | Job                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `0 0 */4 * *` (every 4h) | `executeFullPipeline` — all 5 stages                                                                                              |
| `0 2 * * *` (daily 2AM)  | `executeExponentialBatchPipeline` — one 40-contract batch                                                                         |
| Manual                   | `/sync` (full), `/test/batch-pipeline` (one batch), `/init/batch-states` (bootstrap batch state), `/data/missing` (analysis only) |

No Queues, no DO alarms; all scheduling is cron + manual HTTP. Batch state machine: `pending → processing → success|failed` with `failureCount` accumulation and 7-day cleanup sweep.

## 18. Bindings, secrets & deployment

| Binding        | Type                                                                                          | Notes                                                                     |
| -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `MCP_OBJECT`   | Durable Object `MC2MCP` (SQLite, migration v1)                                                | MCP sessions                                                              |
| `MCP_CACHE_KV` | KV namespace                                                                                  | API cache + rate limiter                                                  |
| `HYPERDRIVE`   | Hyperdrive → AWS RDS PostgreSQL (`postgres-staging-1…eu-west-1.rds.amazonaws.com:5432/mc2fi`) | ⚠️ `localConnectionString` with credentials committed in `wrangler.jsonc` |

Secrets/vars: `TYPESENSE_HOST`, `TYPESENSE_API_KEY`, `CERTIK_API_KEY`, `YIELD_XYZ_API_KEY`, `PORTALS_FI_API_KEY`, `UNIBLOCK_API_KEY`, `ZERION_API_KEY`, `EXPONENTIAL_API_KEY`, `AMPLITUDE_API_KEY`, `DRY_RUN` (`src/core/types.ts`). Worker limits: `cpu_ms: 300000`; observability on. CI/CD: push to `main` → pnpm 10/Node 23 → `pnpm run build` (wrangler dry-run) → `wrangler-action@v3` deploy (`CLOUDFLARE_API_TOKEN`); **no test/lint gates**. Migrations out-of-band (no committed drizzle migrations).

## 19. Operational gotchas & key file map

**Gotchas:**

1. **Committed staging DB credentials** in `wrangler.jsonc` (`localConnectionString`) — rotate before any public exposure.
2. **No drizzle migrations in repo** — schema changes were applied manually; a fresh environment cannot be reconstructed from the repo alone.
3. **`/data/missing` only logs** — it looks like a repair job but isn't (`orchestrator.ts:175-319`).
4. **`mcpConnected`-style permanent flags don't exist here, but Euler's `EulerRewardsApi` spoofs a browser UA** — if Euler changes their bot protection, that client breaks silently.
5. **Resources and prompts are placeholder/deprecated** — clients reading `mc2://system/status` get fake uptime/counts; prompts reference tools that don't exist.
6. **npm scripts `test:exponential` / `test:pipeline` point at deleted files** (`22c71ba` removed them); use `pnpm test` directly.
7. **Typesense is the serving store, Postgres the write store** — a Typesense re-index bug shows up as wrong tool results while Postgres data is fine; debug the merge stage first.
8. **`cpu_ms: 300000` (5 min)** signals long cron executions — the full pipeline is designed to run long, not fast; don't "fix" slowness by parallelizing harder without revisiting the deadlock history (`preprocessChains` exists for a reason).
9. **Stale docs everywhere** — trust `src/search/README.md` and the code; distrust tool names in any root-level markdown.

**Key file map:**

| Topic                                 | File(s)                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Server entry + routes + cron          | `src/index.ts`                                                                                                                                  |
| Pipeline orchestrator (start here)    | `src/jobs/orchestrator.ts`, `src/jobs/registry.ts`                                                                                              |
| Processor base + implementations      | `src/core/processors/base-protocol-processor.ts`, `euler-processor.ts` (newest), `beefy-fi-processor.ts`                                        |
| Exponential batch subsystem           | `src/core/processors/batch-exponential-processor.ts`, `src/core/services/batch-coordinator.ts`, `src/core/services/rate-limiter.ts`             |
| DB schema + queries                   | `src/core/db/schema.ts`, `src/core/db/queries.ts`                                                                                               |
| External API clients                  | `src/core/externalApis/*`, `src/core/subgraph/euler.ts`                                                                                         |
| Search layer                          | `src/search/` (`SearchService`, `SearchFacade`, query builders; `src/search/README.md`)                                                         |
| MCP tools                             | `src/mcp/tools/{vaults,wallets,protocols,tokens,shared}/*`, `src/mcp/tools/base.ts`                                                             |
| Guidelines injection                  | `src/mcp/helpers/guidelines.ts`, `src/mcp/helpers/responses.ts`                                                                                 |
| Tests (the good part)                 | `src/core/processors/__tests__/batch-exponential-processor.test.ts`, `src/__tests__/integration/batch-pipeline.test.ts`, `src/__tests__/mocks/` |
| Client-facing docs (stale tool names) | `README.md`, `spec.md`, `CURSOR_AGENT_PROMPT.md`, `SSE_INTEGRATION_GUIDE.md`                                                                    |
| Consumers                             | sibling repos `mc2.agentic` (MCP client era) and `mc2.agentic2` (current) — companion writeups                                                  |

---

_End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially._
