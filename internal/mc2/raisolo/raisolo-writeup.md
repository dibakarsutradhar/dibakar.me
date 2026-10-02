# Raisolo (TLDRBox) — Project Deep Dive

> **Internal document — not for publication.** Source of truth for updating Dibakar's CV, portfolio, LinkedIn, and future blog posts.
> Repo: `github.com/mc2ventures/raisolo` (imported as `tldrbox-app`) · `~/Downloads/Projects/mc2/raisolo`
> Analyzed: 2026-10-02 · 1,244 commits on `main`, 2025-11-04 → 2026-09-16

---

## 1. TL;DR

**Raisolo** (originally **TLDRBox**) is an AI-powered news and content-intelligence platform by **MC² Ventures FZCO** (Dubai). It ingests RSS feeds, newsletters, podcasts, YouTube channels, The Economist, and X/Twitter; clusters multi-source coverage of the same storyline into a shared knowledge graph ("Hivemind"); extracts attributable facts, quotes, opinions, and *predictions*; and ships personalized briefings through a web app, RSS, Slack webhooks, daily email newsletters, and an agent-facing API. The commercial hook: founders/CEOs turn that intelligence into LinkedIn thought-leadership posts with one-click publishing and scheduled distribution.

**Dibakar's role:** the second engineer on a two-person team, hired by founder Christoph Richter. Over **~4.5 months (Nov 7, 2025 → Mar 12, 2026)** he shipped **531 commits** (+245k / −55k lines), and — most significantly — **designed and built the entire v2 backend**: the `ingest` worker, the R2-backed content pipeline, the v2 D1 schema, the Hivemind clustering/ranking system, the LiteGraphDB graph migration, the voting system, and the AI agent. Christoph owned the product surface (Next.js UI, LinkedIn features, milestones process); Dibakar owned the **backend data plane and AI infrastructure**.

One sentence for the CV: *Second engineer at an AI content-intelligence startup; designed and built the entire v2 ingestion/clustering backend on Cloudflare Workers (D1, R2, Vectorize, Queues, AI Gateway) — a multi-model LLM pipeline that clusters multi-source news into a knowledge graph and drives personalized feeds, briefings, and agent APIs.*

---

## 2. The product

**Positioning evolved** during Dibakar's tenure:

1. **Original framing** (`.planning/PROJECT.md`): "AI-powered thought leadership assistant for founders and CEOs" — monitor sources → extract insights → curate/vote → generate LinkedIn posts → publish on autopilot.
2. **Later framing** (README): "AI-powered news and content intelligence" — the Hivemind/global story clustering became the product center of gravity, with the public news website (raisolo.com), predictor calibration (thisisledger.com), and the AI-agent API as additional surfaces.

**Target user:** founders/CEOs of B2B startups (seed–Series B) with ~15 min/day, plus marketing teams supporting founder-led content.

### Key features (as shipped)

| Feature | What it does |
|---|---|
| **Personas ("Voices")** | Per-persona profiles that act as "lenses" over the knowledge base — vector-matched against content to personalize feeds, briefings, and post generation. Each persona has its own feed, wire config, and API key. |
| **Hivemind (global story clusters)** | Multi-source clustering of coverage of the same storyline into a knowledge graph; synthesis (briefing + narrative + key facts + perspectives) generated once ≥2 sources cover a story. |
| **Knowledge extraction** | Per-article extraction of attributable facts, quotes, opinions, and **predictions** (with predictor attribution for later calibration), plus ad detection gate. |
| **Feed & ranking** | Personalized feed ranked by `Score = (Similarity×0.4 + Recency×0.2 + Preference×0.3) × PersonalizationBoost × VoteBoost`, with source-diversity re-ranking and voting feedback loops. |
| **LinkedIn publishing** | 4 post styles (Analyst/Builder/Futurist/Contrarian), Hook Lab, AI magic-wand editor, image generation, draft persistence, scheduled publishing via LinkedIn API. |
| **Wire** | Per-persona breaking-news wire: persona-voiced headlines + predictions pushed to Slack/webhooks every 30 min, plus pull-based JSON/RSS feeds authenticated by persona-scoped API keys. |
| **Daily newsletter (v2)** | Top-5 persona-matched content ideas per opted-in user via Resend, with permanent dedup. |
| **Email ingestion** | Inbound `*@in.tldrbox.ai` catch-all (Cloudflare Email Routing) — forward any newsletter to your workspace; AI auto-approves double-opt-in confirmations with a content-first safety score. |
| **AI chat + agent** | Streaming chat over the user's knowledge base; a 25–26-tool autonomous agent (sessions in D1, Vercel AI SDK v5) that can browse the feed, draft/refine/publish posts, and manage the pipeline. |
| **AI agent plugin** | `raisolo-plugin` — a Claude Code / ClawHub plugin letting external AI agents operate a user's Raisolo account through `rsl_` API keys (MIT-licensed). |
| **Topic sharing** | Email-invite workspaces with owner/editor/viewer roles. |

---

## 3. Architecture

**Everything runs on Cloudflare Workers.** Five workers + six internal packages, Bun workspaces + Turborepo, deployed by a single GitHub Actions workflow on push to `main`.

```
apps/
  api-worker    (~32.5k LOC, Hono) — user REST API at api.tldrbox.ai, ~168 documented paths,
                3 auth layers (Clerk JWT, personal rsl_ API keys, partner keys), RBAC, rate limits
  ingest        (~32k LOC) — content pipeline + queue consumer + Hivemind clustering backend
  web           (~57k LOC, Next.js 16 + OpenNext on Workers) — app.raisolo.com, Clerk auth
  cron-worker   (~15k LOC) — 5 cron schedules: adaptive source polling (*/15), RSS polling (4h),
                webhook dispatch + pipeline retry (hourly), scheduled posts + wire delivery (*/30),
                daily ideas + newsletter (0 0)
  email-worker  — inbound email handler for *@in.tldrbox.ai
packages/
  ai         — AI Gateway client (1.2k LOC chokepoint), 18 workflow modules, model catalog, eval harness
  storage    — D1 repos, LiteGraphDB client, R2 helpers, Vectorize; owns v2 migrations
  shared     — types, email processing, Resend sending, RSS/YouTube readers
  database   — v1 persona-DB queries + migrations
  monitoring — ingestion events + feed health
  analytics  — PostHog REST client emitting $ai_generation LLM events
```

### Storage — deliberately five stores

| Store | Holds | Why |
|---|---|---|
| **D1 `tldrbox-prod`** (v1) | users, personas, topics/shares, webhooks, LinkedIn connections, agent sessions | Read-mostly user state |
| **D1 `tldrbox-v2-prod`** (v2) | sources, content_analysis/summaries/opinions, story_clusters, cluster_ideas, predictions, voting, feed_health | Pipeline data; 19 migrations |
| **Vectorize** (`bge-base-en-v1.5`, 768-d) | persona embeddings, summary vectors, opinion vectors, cluster centroids — one unified index | Semantic matching |
| **LiteGraphDB** (self-hosted graph DB at `api-db.raisolo.com`, behind Cloudflare Tunnel) | `StoryCluster` / `KnowledgeIdea` nodes + edges | Native multi-hop traversal vs SQL JOINs; chosen over managed Neo4j for cost, ran on an existing VPS |
| **R2** (`cdn.raisolo.com`) | raw content payloads, images, logos, immutable versioned "cluster bundles" | Object storage + public CDN |

### Content pipeline (the heart of the system)

1. **Ingest** — per-source handlers (RSS, YouTube w/ Gemini transcription, Economist EPUB, X API, inbound email) fetch, parse, dedup by content hash (KV), and write raw content to R2. A message goes onto `ingestion-v2-queue` (batch 10, 3 retries, DLQ).
2. **Ad detection gate** — rule-based + small LLM; ads halt the pipeline.
3. **Parallel AI extraction** — source analysis (Perplexity for credibility/bias research), content summary, and opinion/fact/quote/prediction extraction run concurrently. Per-variant model selection: `gpt-5-mini` for articles (0 hallucinations vs 8 for Haiku in their v4 eval), `claude-haiku-4-5` for transcripts.
4. **Vectorization** — one structured embedding per summary/opinion into Vectorize.
5. **Global clustering** — find-or-create a StoryCluster in LiteGraphDB by centroid similarity (threshold 0.68, tuned empirically from 0.55/0.78 failures), with a multi-signal soft zone (cosine×0.6 + topic-overlap×0.4).
6. **Synthesis** — clusters with ≥2 sources get AI synthesis; sealed versioned cluster bundles are written to R2 with immutable caching.

All LLM traffic flows through **Cloudflare AI Gateway with BYOK** — provider keys live in the CF dashboard, workers carry only a gateway token. The gateway layer implements provider failover chains (e.g., OpenAI → Google → OpenRouter → Grok), reasoning-model token handling, and per-operation usage tracking. **Usage observability** is dual: Cloudflare Analytics Engine (typed `ai_usage` events with auto-estimated costs, 90-day retention, GraphQL queries) + PostHog `$ai_generation` events, feeding an admin dashboard of per-user AI cost/tokens.

### Eval infrastructure

A "Karpathy-style" extraction eval loop (`apps/ingest/tests/eval-extraction.ts`): frozen eval set → **production extractor vs. reference extractor (Opus 4.8) vs. LLM-as-judge (Opus 4.8)** scoring fact recall/precision, quote integrity, prediction completeness, and classification fidelity, with raw hallucination counts and verbatim excerpts. A `--prod-model` flag enables A/B model comparisons without code edits — this is what produced the per-variant model split above.

---

## 4. The story: how the project evolved

Six epochs, reconstructed from git history:

- **E0 — Bootstrap (Nov 4–30, 2025).** Christoph imports ~67k lines of v0.1 (email/newsletter intelligence on Workers + D1 + Clerk). Dibakar joins Nov 7 and immediately ships the **OpenNext → Cloudflare deploy pipeline for Next.js**, the **Cloudflare AI Gateway integration** (~8k lines), **Resend email delivery**, and **LinkedIn OAuth + post generation**.
- **E1 — Product sprint (Dec 2025).** Dibakar builds **personas** (schema, manager UI, chat onboarding, vectorized personas), unified AI workflow architecture, YouTube (Gemini multimodal transcription) and Economist (EPUB parsing) ingestion, admin analytics on Cloudflare Analytics Engine, PostHog LLM tracking. Christoph ships the UI revamp and LinkedIn editor.
- **E2 — Milestone machine v1.0–v1.8 (Jan 9–19, 2026).** Christoph runs a 10-day milestone sprint (49 phases tracked in `.planning/`): Intel UI, LinkedIn publishing, analytics cleanup, **vectorization & persona matching**, code quality. Dibakar ships Vectorize for personas/knowledge, RSS-as-source with paywall scraper, LinkedIn Community Management API scripts (~5.8k lines).
- **E3 — The v2 rebuild (Jan 20–27, 2026) — Dibakar's flagship.** He writes a 485-line system-design proposal ("Global Mind Hive": pub/sub from sources, personas as lenses, full traceability from published posts back to sources) followed by a **2,754-line, 8-part implementation plan** (R2 raw-content layer, ingestion monitoring, processing pipeline, entity model, source credibility, feed ranking, AutoRAG integration). In one week he builds the new `apps/ingest` worker, R2 pipeline, v2 D1 database, queues, and the **Hivemind** (canonicalization, vectorization, matching, opinion diversification, feed API), merged as **PR #2** (Jan 27) — arguably the single most important commit in the repo's history. Christoph responds with a "v2.0 Pipeline Observability" milestone (admin pipeline dashboard, source-quality dashboards).
- **E4 — Hivemind + graph v3 (Feb → Mar 12, 2026).** Dibakar ships the **voting system** (migrations, APIs, ranker integration with user-preference vectors, tests), v2 API consolidation with v1 deprecation, X/Twitter ingestion, Clerk billing + rate limits, image generation (sketchnotes, satirical cartoons), then proposes and executes the **LiteGraphDB migration** (505-line design doc + phases 67–73 research; new graph client, story clustering on the graph, v3 APIs, e2e tests). His finale (Mar): the **AI agent epic (v3.5, phases 74–78)** — agent sessions schema, 25-tool library, streaming SDK-v5 endpoint, agent chat UI — plus story-aware idea generation v3/v4 and the daily **newsletter v2**. Last commit: Mar 12, 2026.
- **E5/E6 — Christoph solo (Mar 2026 → Sep 2026).** Wire + predictions, eval harness, cluster fission, OpenAPI 3.1 spec, public API hardening via PRs #3–#5 (agent-facing endpoints). This is validation that Dibakar's backend kept running as the platform's foundation.

**Total volume:** Dibakar 531 commits / +245,986 −54,548 lines; Christoph 710 commits / +218,230 −131,732 (his higher deletion ratio reflects cleanup/migration ownership). Peak month: Jan 2026 with 430 commits across both. Work stopped almost entirely after June 2026 (6 commits Apr–Jun, then a trickle).

---

## 5. Dibakar's contributions in detail

### Ownership map (file-touch counts)

| Area | Dibakar | Christoph | Reading |
|---|---|---|---|
| `apps/ingest` | **319** | 184 | Dibakar created and owned the pipeline |
| `packages/storage` | **133** | ~30 | Dibakar owned the data layer |
| `packages/ai` | **154** | 165 | Shared; Dibakar built the gateway/workflow foundation |
| `apps/cron-worker` | **114** | 71 | Dibakar owned scheduling |
| `apps/api-worker` | 290 | 358 | Shared |
| `apps/web` | 616 | **1,248** | Christoph owned the UI; Dibakar contributed feeds, personas UI, agent UI |

Net: **Dibakar = greenfield backend builder** (+245k/−54k); **Christoph = product/UI owner + pruner** (+218k/−132k).

### Thematic breakdown of all 531 commits

1. **Deploy & infrastructure (Nov 2025)** — OpenNext/Cloudflare build pipeline for Next.js (7 commits), GitHub Actions prod deploy, Bun lockfile migration.
2. **AI Gateway & AI workflows (Nov–Dec)** — Cloudflare AI Gateway BYOK integration (~8k lines across two commits); unified AI workflow architecture replacing ad-hoc calls; streaming refactor. This became `packages/ai`, the 18-workflow module system every later feature built on.
3. **Email delivery (Nov)** — migration to Resend with webhook delivery; per-user dynamic sender addresses.
4. **LinkedIn integration (Nov–Jan)** — OAuth flow, post generation (~2.7k lines), draft version history, LinkedIn Community Management API scripts (~5.8k lines).
5. **Personas (Dec)** — schema, manager UI, chat panel + onboarding flow, vectorized persona matching (the "lens" concept).
6. **Discover / story clustering v1 (Dec)** — first clustering implementation with image extraction and multi-layer caching.
7. **Sources/Intel (Dec–Jan)** — analysis workflow, approve-all UX, source-name validation, RSS source + paywall scraper.
8. **Analytics (Dec)** — admin analytics dashboard on Cloudflare Analytics Engine; PostHog integration including LLM token/cost tracking.
9. **System v2 / ingestion v2 (Jan–Feb) — the flagship** — system-design proposal + 8-part implementation plan; new ingest worker; R2 raw-content layer; v2 D1 database split; 11.9k-line storage query layer; v2 queue architecture; adaptive v2 polling cron (~11k lines); Hivemind (canonicalization, Vectorize matching, round-robin opinion diversification, feed API, For-You integration); v1 API deprecation. Delivered via PR #2.
10. **Voting + ranking (Feb 5, one-day epic)** — 10 commits in a day: migrations, system design plan, voting queries, APIs (+test mode), ranker integration with user-preference vectors, unit tests. The vote signal feeds `VoteBoost` (3.0× up / 0.1× down) in the feed ranker.
11. **Media ingestion & image AI (Feb)** — X/Twitter API ingestion, R2 logo/image pipeline, nano-banana sketchnotes and satirical-cartoon generation.
12. **Billing (Feb)** — Clerk billing integration, plan limits, rate limiting, pricing page.
13. **LiteGraphDB / Hivemind v3 (Feb)** — 505-line migration proposal + phases 67–73 research docs; graph client with circuit breaker and DELETE+PUT upsert pattern (working around LiteGraphDB's insert-only PUT); story clustering on the graph; v3 API endpoints; e2e integration test.
14. **AI Agent (Mar, v3.5)** — agent_sessions schema, 25-tool library (persona/content/linkedin/research tools), streaming Vercel AI SDK v5 endpoint, AgentProvider + AgentChatPanel UI, cmd-K integration; 48 requirements all verified in `.planning/STATE.md`.
15. **Story-aware ideas v3/v4 + Newsletter v2 (Mar)** — multi-step story-aware idea generation, daily newsletter with 26h window (guarding cron drift), batches of 5 users (respecting Workers' 300s CPU limit), permanent dedup column; cron migrated to v3 generation.

### Signature engineering moments

- **Design-before-code discipline**: the v2 rebuild and the LiteGraphDB migration each started with a substantial written proposal (`docs/proposal/jan20-systemdesign.md`, 485 lines; `docs/proposal/LITEGRAPHDB_MIGRATION_PLAN.md`, 505 lines) plus per-phase research docs — then landed in weeks.
- **Empirical clustering research**: co-authored experiments on 500 articles / 21 sources / 7 days showing (a) centroid averaging alone doesn't fix cross-source clustering, (b) structured embeddings only improve same-source merging (262→193 clusters), and (c) topic-overlap as a secondary signal in the soft zone is what finally produced 28 multi-source clusters. Also diagnosed the mega-cluster failure mode (a "Roboliberalism" cluster absorbing 93 ideas from 19 sources) → mitigations: centroid freeze after 5 ideas, hard cap 30, cluster fission.
- **Pragmatic workarounds documented for the team**: LiteGraphDB insert-only PUT → DELETE+PUT; nested graph data returning as JSON strings → `safeArray()`/`safeJson()` helpers; the BYOK Authorization-header mismatch → custom `createGatewayFetch()`; wrong-model embedding incident (1536-d vectors into a 768-d index) caught and fixed.
- **Cost-consciousness throughout**: per-variant model selection justified by eval data (gpt-5-mini for articles, Haiku for transcripts), free-tier models for chat defaults, fission bounded to ~12 Gemini calls/day (<$0.01/day), batches sized to CPU limits.

### Commit hygiene

Strongly conventional: 244 `feat`, 153 `fix`, 57 `refactor`, 36 `docs`, 15 `chore`, with consistent scopes matching the monorepo layout (`feat(ingest):`, `fix(feed):`) and detailed multi-section bodies on large features. Worked linearly and delivered via one large PR rather than frequent merges.

---

## 6. Engineering practices observed

- **Testing**: Vitest v4 with v8 coverage across packages (19 test files: gateway, voting, litegraph client, email worker, newsletter, RSS parsing, etc.); scripted e2e/integration harnesses with in-memory D1/KV/queue mocks; ~25 operational probe scripts; backfill scripts for graph/embeddings. No test gate in CI (deploy on push to main) — a known gap.
- **Planning system**: `.planning/` (GSD-style) — PROJECT/ROADMAP/REQUIREMENTS/STATE docs, 78 phases with per-phase PLAN/SUMMARY/VERIFICATION files and decision logs (e.g., why the newsletter window is 26h, why batches of 5 users, why `fetch keepalive` instead of `sendBeacon`). Milestones v1.0 → v3.5 fully documented with git ranges.
- **Docs culture**: 119 files under `docs/` with an actively maintained INDEX and an `archive/`; OpenAPI 3.1 spec (~168 paths) generated from the live router; `.claude/memory/` for architecture debt and clustering research — an unusually disciplined docs practice for a 2-person startup.
- **Known tech debt** (recorded honestly in `.claude/memory/architecture-debt.md`, 12 items): the same `DB` binding name means different databases per worker; fire-and-forget persona embeddings with no retry; silent personalized-feed fallback to global; `remote: true` on all bindings meaning local dev writes to production; deferred hierarchical ThemeCluster design.

---

## 7. Numbers worth quoting

| Metric | Value |
|---|---|
| Dibakar's commits / tenure | 531 commits over ~4.5 months (Nov 2025 – Mar 2026) |
| Lines by Dibakar | +246k / −55k |
| Monorepo size | 5 workers + 6 packages; api-worker ~403 route handlers across 22 route modules; OpenAPI spec ~168 paths |
| Pipeline scale | ~60k article vectors in Vectorize after backfill; clustering experiments over 500 articles / 21 sources |
| Clustering improvement | 0 → 28 multi-source clusters (Phase 3 multi-signal); 262 → 193 clusters with structured embeddings |
| Extraction eval | gpt-5-mini: 0 hallucinations vs Haiku's 8 on the frozen v4 eval set |
| Frontend refactor (Dec) | ~75% API-call and memory reduction via centralized hooks |
| Milestones | v1.0 → v3.5, 78 planning phases, 48/48 agent requirements verified |
| AI cost controls | per-variant model routing; fission <$0.01/day; auto-estimated per-user LLM cost tracking |

---

## 8. Raw material for derived artifacts

### CV bullet candidates

- Second engineer (first backend hire) at MC² Ventures on Raisolo, an AI content-intelligence platform on Cloudflare Workers (D1, R2, Vectorize, Queues, AI Gateway); 531 commits in ~4.5 months.
- Designed and built the entire v2 backend from a written system-design proposal: a multi-stage ingestion pipeline (R2 raw layer → queue → parallel LLM extraction → embeddings → knowledge-graph clustering) processing RSS, newsletters, YouTube, Economist, and X sources.
- Built "Hivemind," a multi-source story-clustering system over a self-hosted graph DB + Vectorize, including a multi-signal similarity algorithm (cosine + topic overlap) validated by controlled experiments on 500 articles that raised multi-source cluster count from 0 to 28.
- Implemented the AI Gateway layer (BYOK, provider failover chains, reasoning-model handling) and 18 LLM workflow modules powering extraction, synthesis, personalization, and post generation; added per-variant model routing driven by an Opus-judged extraction eval harness (0 vs 8 hallucinations).
- Shipped the voting/ranking feedback loop, X/Twitter ingestion, Clerk billing + rate limits, image generation, an autonomous 25-tool AI agent (streaming, session memory), and the daily personalized newsletter — plus the AI Gateway→Analytics Engine→PostHog cost-observability stack.

### Blog-post angles

1. **"Designing a story-clustering system for news"** — the strongest technical story: structured vs prose embeddings, the soft-zone multi-signal trick, mega-cluster failure modes, centroid freeze/caps, fission. Full empirical data exists (`.claude/memory/clustering-research.md`).
2. **"Why we run five databases on Cloudflare"** — D1×2 + Vectorize + LiteGraphDB + R2 division of labor; when a graph DB beats SQL JOINs; self-hosting behind Cloudflare Tunnel.
3. **"Building an LLM eval loop for extraction"** — production vs reference vs judge, hallucination counting with verbatim excerpts, A/B via `--prod-model`, and how eval results changed production model routing.
4. **"A v2 rewrite in one week"** — how a 485-line design doc + 8-part implementation plan made a full backend rebuild tractable; working on a two-person team with a milestone process.
5. **"Operating LLMs on Cloudflare Workers"** — AI Gateway BYOK quirks (the Authorization header trap), failover chains, 300s CPU limits, cron drift, `waitUntil` budgets, remote-bindings dev posture.

### LinkedIn headline candidates

- "Built the entire backend of an AI news-intelligence platform in 4.5 months — pipeline, clustering, graph DB, AI agent — on Cloudflare Workers."
- "Second engineer @ MC² Ventures (Raisolo): multi-source story clustering, LLM extraction pipelines, and an agent API on the edge."

---

## 9. Caveats for accuracy

- The repo's git identity splits Christoph across three author strings and Dibakar across two; line counts are inflated somewhat by generated `worker-configuration.d.ts` files (~10.8k lines committed multiple times).
- The Next.js docs sometimes say 15; the app is on 16.1.5. "Intelligence hub" is not a term used in the repo — the concepts are Hivemind feed / For You / Knowledge Brief.
- Dibakar's last commit is 2026-03-12; everything after (wire, predictions, eval harness finalization, public API PRs) is Christoph's solo work — don't claim those.
- The product name changed TLDRBox → Raisolo around Feb 15–17, 2026 (domain strings in commits); `linkedin.json` at repo root is an unrelated data dump.
- App routes `app.raisolo.com` / `api.tldrbox.ai` mixed domains reflect the rename in progress; public site is raisolo.com.

---
---

# Part II — System Design & Infrastructure Reference

> Purpose: standalone technical reference so future work (CV, blogs, portfolios, or new engineering on similar systems) does not require re-reading the codebase. Everything below was extracted directly from the source at analysis time (2026-10-02). File paths are relative to the repo root.

---

## 10. System topology

```
                        ┌─────────────────────────────────────────────────┐
                        │                Cloudflare (acct 5123f2a8…)      │
                        │                                                 │
 Sources                │  ┌──────────┐   ┌────────────┐   ┌───────────┐  │
 RSS ──────────────────►│  │  cron    │──►│  ingest    │──►│ D1 v2     │  │
 YouTube ──────────────►│  │ worker   │   │  worker    │   │ (pipeline)│  │
 Economist/X ──────────►│  │ 5 crons  │   │  pipeline  │   └───────────┘  │
                        │  └────┬─────┘   │  hivemind  │──►► Vectorize    │
 Email ────► Email      │       │         │  clusterer │──►► LiteGraphDB  │
 Routing ──► worker ────┼───────┼────────►│  (queue    │    (self-hosted  │
 *@in.tldrbox.ai        │       ▼         │  consumer) │     VPS, tunnel) │
                        │  ingestion-v2-queue (batch 10, retries 3, DLQ)  │
                        │       ▲                                         │
                        │  ┌────┴──────┐   ┌────────────┐                 │
                        │  │ api-worker│◄──│  web       │  app.raisolo.com│
                        │  │ Hono API  │   │  Next.js   │  (OpenNext on   │
                        │  │ api.tldr… │──►│  (OpenNext)│   Workers)      │
                        │  └─────┬─────┘   └────────────┘                 │
                        │        │ INGEST_WORKER service binding          │
                        │        ▼                                        │
                        │  R2 tldrbox-content (cdn.raisolo.com)           │
                        │  Analytics Engine (tldrbox_analytics)           │
                        └─────────────────────────────────────────────────┘
   External: Clerk (auth) · Resend (outbound email) · Cloudflare AI Gateway BYOK
   (OpenAI / Anthropic / Google / OpenRouter / Perplexity / Grok) · PostHog EU
```

**Who talks to what:** all LLM traffic goes through one gateway chokepoint (`packages/ai/src/ai-gateway.ts`); hivemind reads are proxied api-worker → ingest via the `INGEST_WORKER` service binding; cron-worker and api-worker only *produce* queue messages (ingest is the sole consumer); shared KV namespace IDs are reused across workers so dedup/caches are coherent. Local dev runs with `remote: true` bindings — i.e., **local dev writes to production resources** (a documented hazard, `CLAUDE.md`).

---

## 11. End-to-end data flows

### Flow A — RSS article → personalized feed
1. Cron `*/15` (`pollDueSources`) or `0 */4` (`pollRssSources`) picks due sources; producer emits `{type:'ingestion_v2', metadata:{source_id, source_url, …}}` to `ingestion-v2-queue`.
2. Ingest consumer → `ingestSource` (`handlers/rss.ts`): fetch, parse, hash (SHA-256 of normalized body), dedup check in KV `dedup:{hash}` (24h TTL), scrape full text + images → R2 `raw/{source_type}/{YYYY-MM}/{hash}.json`; emit content-analysis message `{r2_key, content_hash, …}`.
3. Consumer calls `runContentAnalysisPipeline(r2_key)` (`pipeline/index.ts`): ad gate → parallel AI extraction (summary / structured facts-opinions-predictions / opinion analysis) → one shared embedding → Vectorize upserts → `clusterIntoGlobalGraph` (LiteGraphDB find-or-create cluster, D1 dual-write) → synthesis when ≥2 sources → sealed bundle to R2.
4. Feed read: web → `APIClient` (`lib/api-client.ts`) → api-worker `/api/hivemind/v3/feed` (Clerk JWT) → service binding `INGEST_WORKER.fetch('http://ingest/hivemind/…')` (30-min KV cache) → `HivemindMatcher` (Vectorize topK 100, persona vector `persona_{id}`) → `FeedBuilder` hydration + diversity re-ranking → `ranker.ts` scoring.

### Flow B — Inbound newsletter email
`*@in.tldrbox.ai` catch-all → `email()` handler: parse recipient `handle+topic@in.tldrbox.ai` → extract text/HTML/images → content-hash dedup (KV, 24h) → resolve user by handle → find-or-create topic → `detectConfirmation` (heuristic + AI) auto-approves double-opt-in links with safety score >0.5 → enqueue full `QueueMessage` to legacy `INGESTION_QUEUE`. Errors never reject the email (loss prevention). Dedup marked only after successful enqueue.

### Flow C — Wire (breaking-news push)
Cron `*/30` `deliverWireAlerts`: clusters from last 30 min with `importance_score ≥ 0.7 AND source_count ≥ 3` (LIMIT 10) → dedup via KV `wire-sent:{clusterId}` (24h) → `generateWireContent` (persona-voiced headline/hook + predictions; grok-4-1-fast) → POST to active wire webhooks (Slack/Discord payloads, 🔴 BREAKING / 🟡 DEVELOPING / 🟢 UPDATE). Pull side: `GET /api/wire/:personaId` + `/rss` authenticated by persona-scoped `rsl_` key.

### Flow D — Idea → LinkedIn post
Daily cron generates story-aware ideas (argument extraction → hook generation, validated against cluster source IDs) → user picks/edits in web (`/draft/[id]`, Hook Lab, magic-wand) → optional image gen (`gemini-2.5-flash-image` direct to Google) → cron `*/30` `publishScheduledPosts` publishes via LinkedIn API (OAuth tokens in `linkedin_connections`), records `social_posts` + versions.

### Flow E — Daily newsletter (v2)
After idea generation at `0 0 * * *`: users in batches of 5 (Workers 300s CPU limit), 26h window (cron-drift guard), top-5 persona-matched ideas, permanent dedup via `content_ideas.newsletter_sent_at`, delivery via Resend.

---

## 12. Data model reference

### 12.1 The five stores

| Store | Database/index | Contents |
|---|---|---|
| D1 v1 | `tldrbox-prod` (binding `DB` in api-worker/cron/email; `DB_PERSONA` in ingest) | users, personas, user_api_keys, topics/topic_shares, webhooks, linkedin_connections, agent_sessions, legacy knowledge/newsletter tables |
| D1 v2 | `tldrbox-v2-prod` (binding `DBV2`; `DB` inside ingest) | sources, content_analysis, content_summaries, content_opinions, story_clusters, cluster_ideas, predictions/predictors, voting, content_ideas, social_posts, feed_health, ingestion_events |
| Vectorize | `tldrbox-v2-embeddings`, `@cf/baai/bge-base-en-v1.5` (768-d), one unified index | summaries, opinion items, personas, cluster centroids — discriminated by metadata `type` |
| LiteGraphDB | graph `tldrbox-global`, tenant via `LITEGRAPHDB_TENANT_GUID`, at `api-db.raisolo.com` (Cloudflare Tunnel) | StoryCluster / KnowledgeIdea / UserVault / Source nodes; HAS_CLUSTER / PART_OF / CONTAINS edges |
| R2 | `tldrbox-content` via `cdn.raisolo.com` | raw content, extracted images, logos, generated images, cluster bundles |

⚠️ **The `DB` binding name means different databases per worker** — api-worker/cron: v1 personas DB; ingest: v2 pipeline DB (with `DB_PERSONA` back to v1). Documented in `CLAUDE.md`; a standing source of confusion.

### 12.2 Core v2 tables (condensed; all timestamps epoch-ms INTEGER)

- **`sources`** — `id, name (UNIQUE w/ type), type ('person'|'organization'|'platform'), sub_type, credibility_score/user_credibility_score/combined_credibility (REAL, default 0.5)`, bias/domain-authority signals, vetting `status ('approved'|'pending'|'rejected')`, polling: `poll_interval_minutes (default 240; non-RSS 1440), next_poll_at, poll_hits, poll_misses`. Partial index on `next_poll_at WHERE is_disabled=0` powers the smart poller.
- **`content_analysis`** — one row per ingested item. `r2_key (UNIQUE), content_hash, is_ad, ad_score, ad_type, status ('pending'→'processing'→'completed'|'failed'; ads written as completed+is_ad=1), retry_count (<3), last_retry_at, clustering_status ('success'|'failed'|'skipped'), cluster_id`.
- **`content_summaries`** — `analysis_id (UNIQUE FK), title, tldr, summary, main_points/topics/key_knowledge/image_keys (JSON), sentiment, vector_id, primary_source_id/url, article_nature ('breaking_news'|'analysis'|'opinion'|'tutorial'|'research'|'evergreen')`.
- **`content_opinions`** — the extraction workhorse: `analysis_id FK, type ('fact'|'opinion'|'quote'|'comment'), content, attribution(+_id FK sources, +_type), context ('direct'|'paraphrased'|'secondhand'), confidence, impact/novelty/attribution scores, editorial_score = (impact·0.4 + novelty·0.3 + attribution_weight·0.3)/10`.
- **`story_clusters`** — `id = LiteGraphDB node GUID`; `title, summary, topics/sources (JSON)`, `idea_count, source_count`, `centroid_embedding_id ('cluster-centroid:{id}')`, `hive_slug (UNIQUE)`, `synthesis (JSON), synthesis_generated_at`, `importance_score`, `is_expired/expired_at`, fission: `parent_cluster_id, fission_state ('leaf'|'universe')`, bundles: `bundle_revision, bundle_written_at`. Feed index `(is_expired, importance_score DESC)`.
- **`cluster_ideas`** — denormalized idea-per-cluster rows: `id = analysis_id`, `cluster_id FK`, title/tldr/summary/points/topics, `source_id/name/type/logo_url`, `similarity_score`, `article_nature`, `is_expired`.
- **`predictions` / `predictors`** (migration 018) — calibration layer: predictions attach `predictor_id` (normalized slug, e.g. `'jpmorgan'`, with type/aliases), `question` (testable claim), `outcome_type ('binary'|'threshold'|'multi')`, `probability (0–1)`, `qualitative_confidence`, `resolution_date/rule`, `category` (monetary_policy, geopolitics, china, energy, rates_fx, equities, tech, other), `caliber_score (0–100)` + breakdown JSON, `raw_quote`. Sourced `source_idea_id = cluster_ideas.id`.
- **Voting** — `user_votes (UNIQUE(user_id, entity_type, entity_id), vote_value ±1)`, `vote_aggregates (PK entity_type+entity_id, counts + vote_score/ratio + moderation flags)`, `user_preference_profiles (per-user preferred/blocked sources/entities/topics as JSON arrays)`, `moderation_queue (auto-flag on excessive downvotes)`.
- **`content_ideas`** — generated post ideas: `user_id, persona_id, hook, variations (JSON), post_content, platform, score, status ('raw'→…), conviction_question, cluster_id, newsletter_sent_at (NULL = never emailed), generated_image_r2_key` + `content_idea_versions` history.
- **`social_posts`** — `status ('draft'|'scheduled'|'published'|'failed'), scheduled_for, retry_count, external_post_id`.
- **`agent_sessions`** (exists in both DBs) — `user_id, session_start/end, message_count, summary, tools_used/key_outcomes (JSON '[]')`.
- **`feed_health` / `ingestion_events`** — per-source success-rate tracking (`health_status: healthy|warning|critical|stale`) and per-ingestion audit trail (attempt/success/failure/duplicate).

v1 tables worth knowing: `personas` (goal, 3 topics, authority/challenging indexes, `ai_notes`, `linkedin_information` for voice training, `is_active` one-per-user, wire fields `wire_enabled/wire_prompt/wire_threshold (default 0.6)` from migration 037), `user_api_keys` (`key_hash` SHA-256 hex UNIQUE, `key_prefix` 12 chars `rsl_xxxxxxxx`, `persona_id` scoping), `webhooks` (`content_source 'newsletter'|'wire'`, `schedule_cron`), `topic_shares` (email invites, owner/editor/viewer roles, invite tokens).

### 12.3 Vectorize namespaces (single index, metadata-typed)

| Vector | ID format | Embedding text |
|---|---|---|
| Summary | `summary.id` | structured: `TOPICS: …\nFACTS: …\nSUMMARY: …` (8000-char cap) |
| Opinion item | `content_opinions.id` | `{content}\n\nAttribution: {attribution} ({type})` |
| Persona | `persona_{personaId}` | sections: Persona/Goal/Industry/Audience/Topics/Vision/Contrarian view/Principle/Themes/ai_notes/Wire brief (8000-char cap) |
| Cluster centroid | `cluster-centroid:{clusterId}` | running average of member vectors, **frozen after 5 ideas** (`CENTROID_FREEZE_COUNT`) |

### 12.4 LiteGraphDB model

- Node labels: `GlobalRoot` (fixed GUID `00000000-0000-4000-8000-000000000001`), `StoryCluster`, `KnowledgeIdea`, `UserVault` (GUID = persona UUID), `Source`. Edges: `HAS_CLUSTER` (root→cluster, deterministic edge GUID hash), `PART_OF` (idea→cluster, Data carries `{ideaId, sourceId, similarity}`, `Cost = round(similarity·100)` — LiteGraphDB Cost is Int32), `SUBSCRIBES_TO`, `CONTAINS`, `COMPOSED_OF`, `SIMILAR_TO`.
- **PUT is insert-only** → all updates use DELETE+PUT or re-PUT-to-item-path on `UNIQUE` errors (`upsertNode`/`upsertEdge` in `packages/storage/src/litegraph/client.ts`), wrapped in backoff retry (100→400ms, 2 retries).
- **Nested arrays/objects in node `Data` come back as JSON strings** → `safeArray()`/`safeJson()` helpers everywhere.
- Deletion is simulated: pruning re-upserts nodes with `expired: true`; only Vectorize centroids are hard-deleted.
- **Circuit breaker** in the client: 5 failures/30s → OPEN; 60s cooldown → HALF_OPEN; 2 clean probes → CLOSED; state resets on isolate restart. GraphMatcher falls back to the SQL canonical matcher when the circuit is OPEN.

### 12.5 R2 object layout

| Prefix | Key | Notes |
|---|---|---|
| Raw content | `raw/{source_type}/{YYYY-MM}/{content_hash}.json` | `RawContentObject` incl. `raw_body`, `full_text`, `images[]`, custom metadata `{content_hash, source_type, source_uri}`; `processed:'true'` after pipeline |
| Extracted images | `assets/{YYYY-MM}/{content_hash}/{i}.{ext}` | |
| Logos | `logos/{sourceId}.{ext}` | `max-age=31536000` |
| Generated images | `generated-images/{YYYY-MM}/{idea_id}/{version}.png` | metadata carries the prompt |
| Cluster bundles | `clusters/{clusterId}/{revision}.json` | revision = synthesis_generated_at; `immutable` cache; JSON = full cluster (facts/quotes/opinions LIMIT 600, predictions LIMIT 200 w/ predictors) |

### 12.6 KV key families (`DEDUP_CACHE` / `SESSIONS_KV` / `GLOBAL_CLUSTERS_KV`)

`dedup:{content_hash}` (per-source-type TTLs 24h–30d) · `wire-sent:{clusterId}` (24h) · `hive-slug:{slug}` → clusterId (**no TTL** — permanent) · `cluster-list:all` (300s) · `feed:cluster:{id}` · `ratelimit:{userId}:{path}` · `pub_ratelimit:{ip}:{route}` · LinkedIn OAuth state · discovery-brief/summary caches. `ECONOMIST_KV` is bound but unused (legacy).

---

## 13. Pipeline reference (`apps/ingest/src/pipeline/`)

Orchestrator: `runContentAnalysisPipeline(r2Key, env)`. R2 fetch → Stage 1 (gating) → Stages 2–4 in `Promise.all` → shared embedding → Stage 5 (parallel summary+opinion vectorization) → Stage 6 clustering → final D1 `status='completed'` + `clustering_status` + `cluster_id`. Missing `CF_AIG_TOKEN` ⇒ stages skipped, `clustering_status='skipped'`.

| Stage | Model call | Writes | Notable constants |
|---|---|---|---|
| 1 Ad detection | none (heuristic patterns) | `content_analysis` | trusted-source bypass at credibility ≥ **0.85** (`ad_type='trusted_source_bypass'`) |
| 2 Source analysis | Perplexity `sonar` (temp 0.1); relevancy via `gpt-5-nano` | `sources` (author upserts), `source_entities(+_relations)`, `content_sources` | skips `pending`/`rejected` sources |
| 3 Summary + structured extraction | `gpt-5-mini` (narrative) ∥ `structured-extraction` — **per-variant: article→`gpt-5-mini`, transcript→`claude-haiku-4-5`**; temp 0.1; maxTokens **8192** (2048 silently truncated 8/30 long articles) | `content_summaries`, `predictions` (via `predictions-writer.ts`, keyed by analysisId) | body caps 50k (YouTube) / 15k chars; errors classified `[error_class=…]` (`grok_auth`, `anthropic_429`, `openai_length`, `json_parse`…) mirrored in admin FAILURE_CLASSES |
| 4 Opinion analysis | `grok-4-1-fast`, temp 0.1, maxTokens 2048, 5k-char body | `content_opinions` | title-restatement filter: Jaccard > **0.55** drops facts |
| 5 Vectorize | Workers AI `bge-base-en-v1.5` (15s timeout race) | Vectorize + `vector_id` backfill | 8000-char cap; summary-vec failure bubbles up, opinion-vec failure only logs |
| 6 Global clustering | none (vector math) | LiteGraphDB + `story_clusters`/`cluster_ideas` | see §14 |

**Retry/recovery:** queue-level `max_retries 3` → DLQ (`ingestion-v2-dlq-queue`, no in-repo consumer); hourly cron `POST ingest/admin/retry-stale` retries `processing` rows older than **30 min** and `failed` with retry_count <3 (limit 20); `clusterMissedAnalyses` re-clusters completed-but-unclustered rows (batch 5, 500ms delays, bail after 10 consecutive errors).

**Synthesis triggers** (`getClustersNeedingSynthesis`): `new` (≥2 sources, never synthesized) · `new-source` (source count grew past `synthesis.sourceIndex`) · `stale-content` (updated >6h after last synthesis). Synthesis model: `grok-4-1-fast`, temp 0.4, maxTokens 4096, rate-limited 3s between calls.

---

## 14. Hivemind algorithms (`apps/ingest/src/hivemind/`)

**Clustering match** (`global-graph-repository.ts`): Vectorize query `topK 10, filter type='cluster-centroid'` → hard join at cosine ≥ **0.68** (0.55 over-merges, 0.78 fragments); soft zone **0.52–0.68** requires topic overlap ≥ **0.4**, combined = `0.6·cosine + 0.4·topicOverlap`. Cluster ID = `deterministicUuid('cluster:{title}:{processedAt}')`. Caps: `MAX_CLUSTER_SIZE 30`; ideas expire at **30 days**; stale clusters expire at **14 days** (daily `0 2 * * *` prune on ingest).

**Importance score** (recomputed for all clusters every 30 min):
```
3.0·log2(sources+1)·freshness + 1.5·min(ideas/hours,10) + 1.0·log2(ideas+1)·freshness + 2.0·freshness
freshness = 0.5^(hoursSinceUpdate / 18)   // 18-hour half-life
```

**Feed ranker** (`ranker.ts`):
- Weights: similarity/recency `0.6/0.3` anonymous; `0.4/0.2/0.3 (preference)` personalized; summary type ×1.2.
- Recency: linear decay `1 − age/window` clipped at 0.
- Personalization: blocked source → hard filter; preferred source ×1.5; blocked topic ×0.5 (hard filter at ≥2 blocked topics); preferred topic ×1.2; type vote-score < −3 → ×0.8.
- Votes: own upvote ×3.0 / own downvote ×0.1; community boost `1 + log10(netVotes+1)·0.5` capped **2.5×**; netVotes < −2 → ×0.8.
- Diversity (`feed-builder.ts`): per-source penalty 1st ×1.0, 2nd ×0.8, 3rd ×0.6, 4th+ ×0.1, re-sort after each penalty pass.
- Trend re-rank (`trend-ranker.ts`): LLM re-rank `gpt-5-mini` → `[{index, score 0-100, reason}]`; fallback to original order.

**Matcher fallback chain** (`matcher.ts`): persona vector `getByIds` → Vectorize query topK 100 (`published_at > cutoff` filter) → unfiltered query → DB text search (score 0.9) → recent items (score 0.6). Canonical (SQL) feed sets all similarities 1.0 → recency-only ordering.

**Cluster fission** (`cluster-fission.ts`): eligible at ≥6 ideas; one `gemini-3-flash` call (temp 0.2) proposes 2–4 themes; validation gate: ≥2 themes, ≥2 ideas/theme, no unknown/double-assigned IDs, ≥**80%** coverage (empty proposal = "already coherent"). Children get fresh centroids upserted *before* graph/D1 writes; parent demoted to `fission_state='universe'`, expired, centroid deleted. Children commit is the point of no return.

**Idea generation v3** (`story-idea-generator.ts` + `argument-extractor.ts`): argument extraction pre-step (`gpt-4o`, temp 0.4, 4096 tokens) → hook generation (`story_ideas_v3`, temp 0.8, 2800–3000 tokens) → hallucination guards: source IDs validated against extracted arguments; unresolved cluster resolved by sourceIds overlap, else skipped; saved `score 0.9, status 'raw'` + version row. (Legacy v1 generator: batch of exactly 8 ideas across 6 styles + 2 free, `gpt-4o` temp 0.8, `score 0.8`.)

---

## 15. AI Gateway & model catalog (`packages/ai/src/`)

**Transport:** Cloudflare AI Gateway BYOK — endpoint `https://gateway.ai.cloudflare.com/v1/{account}/{gateway='tldrbox'}/{provider}`. Headers: `cf-aig-authorization: Bearer {CF_AIG_TOKEN}` (the SDK's `Authorization` is deleted; a dummy `apiKey:'byok-gateway-managed'` satisfies the SDK constructor — this was the load-bearing BYOK fix), `cf-aig-metadata` (≤5 scalar entries for per-user/per-op tracking). Provider keys live in the CF dashboard, not in workers.

**Failover chains** (`callAIGatewayWithFailover`): default `[openai → google-ai-studio → openrouter → grok → perplexity-ai]`; extraction-priority `[grok, openai, google, openrouter, perplexity]`; streaming `[openai, openrouter, perplexity, grok]`. Terminal fallback: Workers AI `@cf/meta/llama-3.1-8b-instruct` via `ai.run` with gateway metadata. Exceptions that bypass the gateway: Gemini multimodal (YouTube transcription; 3 retries, exp backoff 1s→10s + jitter on 429/5xx) and `gemini-2.5-flash-image` generation → `generativelanguage.googleapis.com` directly with `GEMINI_API_KEY`.

**Reasoning-model handling:** models matching `gpt-5|o3|o1` get `max_completion_tokens = max(maxTokens, 4096)` and `temperature=1` (they reject the normal params).

**Model map (what calls what):**

| Operation | Provider / model | Temp / maxTokens |
|---|---|---|
| Article structured extraction | openai `gpt-5-mini` | 0.1 / 8192 |
| Transcript extraction | anthropic `claude-haiku-4-5` | — |
| Narrative summary | openai `gpt-5-mini` | — |
| Opinion extraction | grok `grok-4-1-fast` | 0.1 / 2048 |
| Source research | perplexity `sonar`; relevancy `gpt-5-nano` | 0.1 |
| Cluster synthesis | grok `grok-4-1-fast` | 0.4 / 4096 |
| Cluster fission | google `gemini-3-flash` | 0.2 / 2048 |
| Wire content | grok `grok-4-1-fast` | 0.6 / 1024 |
| Trend re-rank / cluster scoring | `gpt-5-mini` | 0.2 |
| Idea generation (v1/v3) | `gpt-4o` | 0.8 |
| YouTube transcription/topics | Gemini (direct) | — |
| Image generation | `gemini-2.5-flash-image` | — |
| Generic `generateText` default | `grok-4-1-fast` (provider auto) | per-type table in `text-generation.ts` |
| Embeddings | `@cf/baai/bge-base-en-v1.5` (768-d) | — |
| Anthropic default (catalog) | `claude-sonnet-4-5-20250929` | — |

**Observability:** `trackAIUsage` writes typed `ai_usage` events to Analytics Engine (tokens + auto-estimated cost, per user/operation; model price table in `ANALYTICS.md`; 90-day retention, queried via GraphQL) + PostHog `$ai_generation` events; product events (`clustering_failed`, `cluster_idea_added`) via the PostHog server client. Anthropic 4.x rejects `temperature` (400) — handled in the gateway layer.

---

## 16. API & auth reference (`apps/api-worker`)

**Middleware order:** CORS → Analytics Engine → path-based auth gate → rate limit. Auth gate skips Clerk for `/api/monitoring/*`, `/api/public/*`, `/api/partner/*`, `/api/me/*`, `/api/wire/*`, LinkedIn OAuth callback.

| Layer | Mechanism | Details |
|---|---|---|
| Clerk JWT | `@clerk/backend verifyToken` (RS256) | auto-provisions D1 `users` on first call (`INSERT OR IGNORE`, pending invites linked); role from `role`/`publicMetadata.role` (default USER); `azp` checked-log-only; `TESTING_MODE` bypass via `test-token` |
| Personal API keys | `rsl_` + 40 hex chars | SHA-256 hex digest stored (`key_hash` UNIQUE); 12-char display prefix; persona-scoped (key's `persona_id` or user's `is_active` persona); `last_used_at` via `waitUntil`; wire routes enforce key↔persona match (403) |
| Partner | `X-API-Key` constant-time compare vs `PARTNER_API_KEY` | |
| RBAC | `requireRole(['ADMIN'|'SUPPORT'])` | 403 with required/current roles |
| Rate limits | KV counters `ratelimit:{userId}:{path}` | e.g. `/api/me` 200/60s, `/api/me/ideas/generate` 5/hour, default 1000/60s; ADMINs and localhost exempt; public routes use IP-based `pub_ratelimit:*` |
| Plan limits | Clerk Billing claims (`pla`, `fea`, entitlements) | FREE: 5 drafts/mo, 2 published posts/mo, 1 persona; usage counted in `content_ideas`/`personas` |

**Route groups:** v1 Clerk-authed CRUD (topics, personas, newsletters, webhooks, summaries, rss, linkedin, analytics, invites, internal) · `/api/me/*` (rsl_ key: capabilities, profile, feed, opinions, personas, ideas CRUD/generate/schedule/image, sources, stories) · `/api/wire/:personaId` (+`/rss`, `?key=`) · `/api/hivemind/*` incl. `/v3/*` (Clerk; reads proxied to ingest w/ 30-min KV cache; admin ops RBAC) · `/api/public/*` (no auth, IP-limited: opinions JSON+RSS, global hivemind, predictions/predictors for calibration — consumed by raisolo.com and thisisledger.com) · `/api/library/*` (Clerk + admin subroutes) · `/api/ideas/*` (Clerk + plan limits) · `/api/voting/*` · `/api/monitoring/*` (**unauthenticated** admin/debug surface — a known sharp edge) · `/api/partner/*` · `/api/keys` · `/api/agent` (sessions/context for the chat agent).

OpenAPI 3.1 spec: `docs/api/openapi.yaml`, ~168 paths, "generated from the live router; treat as source of truth"; admin endpoints intentionally omitted.

**Web app data access:** `lib/api-client.ts` — base client with Clerk bearer injection, 401-triggered token refresh, request dedup, 3 retries (1s backoff); typed sub-clients per domain in `lib/api/` (hivemind, ideas, library, voting, monitoring). AuthContext gates rendering on `isReady` to kill 401 races. Deployed via OpenNext (`@opennextjs/cloudflare`) as worker `tldrbox-web`.

---

## 17. Scheduling & queue contracts

**Cron matrix** (cron-worker `cpu_ms=300000`; ingest has its own `0 2 * * *` graph prune):

| Schedule | Jobs |
|---|---|
| `*/15` | Smart polling: due sources (`next_poll_at`), advance interval by `poll_interval_minutes` |
| `0 */4` | All RSS-subtype sources |
| `0 *` | Scheduled webhook execution (cron-expression scheduler) + `admin/retry-stale` pipeline retry (limit 20) |
| `*/30` | `publishScheduledPosts` (LinkedIn) · `recomputeAllImportanceScores` · `deliverWireAlerts` |
| `0 0` | Content ideas → user stories → non-RSS polling → `autoTunePollingIntervals` → author-photo enrichment (limit 15, via service binding) → daily newsletter |

**Adaptive polling:** for sources with ≥10 hits+misses — hitRate >0.7 → interval halved (min 30 min); <0.2 → ×1.5 (max 2880 min); counters reset.

**Queue message contract** (`packages/shared/src/types`, two shapes on `ingestion-v2-queue`):
1. **Content-analysis trigger** (has `r2_key`): `{content_hash, r2_key, source_type, user_id?, metadata:{source_uri, source_url, source_name, title, ingested_at, image_count, source_id, reprocess?}}` → consumer runs the pipeline.
2. **`ingestion_v2` source trigger** (no `r2_key`): `{type:'ingestion_v2', metadata:{source_id?, source_url, source_name, user_id, type: rss|youtube|article, force, added_by?, added_reason?}}` → with `source_id` = reingest, without = new ingest. Also recognized: `reingest_feed`, `reprocess_source(_full)`, `reprocess_youtube_url`.

Consumer config: `max_batch_size 10`, `max_batch_timeout 30s`, `max_retries 3`, DLQ `ingestion-v2-dlq-queue` (no consumer). Errors → `message.retry()`; success → `ack()`. Legacy `ingestion-queue` still produced by email-worker (full raw content inline).

---

## 18. Bindings, secrets & deployment

**Bindings matrix:**

| Binding | api-worker | ingest | cron-worker | email-worker |
|---|---|---|---|---|
| D1 | `DB`=v1, `DBV2`=v2 | `DB`=v2, `DB_PERSONA`=v1 | `DB`=v1, `DBV2`=v2 | `DB`=v1 |
| KV | `SESSIONS_KV`, `GLOBAL_CLUSTERS_KV`, `ECONOMIST_KV`, `DEDUP_CACHE` | `DEDUP_CACHE` | all four | `DEDUP_CACHE` |
| R2 | `CONTENT_BUCKET` | `CONTENT_BUCKET` | `CONTENT_BUCKET` | — |
| Queue producer | `INGESTION_V2_QUEUE` | both queues | `INGESTION_V2_QUEUE` | `INGESTION_QUEUE` |
| Queue consumer | — | `ingestion-v2-queue` | — | — |
| Service binding | `INGEST_WORKER` | — | `INGEST_WORKER` | — |
| Workers AI / Vectorize / Analytics | `AI` / `VECTORIZE_INDEX` / `ANALYTICS` | `AI` / `VECTORIZE_INDEX` / `ANALYTICS` | `AI` / — / `ANALYTICS` | `AI` / — / `ANALYTICS` |
| send_email | — | — | — | `EMAIL` |
| Routes/crons | `api.tldrbox.ai/*` | cron `0 2 * * *` | 5 schedules | catch-all `*@in.tldrbox.ai` |

**Secrets (names only):** api-worker `CLERK_SECRET_KEY, RESEND_API_KEY, CF_AIG_TOKEN, OPENROUTER_API_KEY, GEMINI_API_KEY, POSTHOG_API_KEY, PARTNER_API_KEY, LITEGRAPHDB_URL/API_KEY/TENANT_GUID`; ingest `CF_AIG_TOKEN, GEMINI_API_KEY, LITEGRAPHDB_*, POSTHOG_API_KEY`; cron `RESEND_API_KEY, CF_AIG_TOKEN, OPENROUTER_API_KEY, GEMINI_API_KEY, LINKEDIN_CLIENT_ID/SECRET`; email `OPENROUTER_API_KEY, GEMINI_API_KEY`. Provider LLM keys are NOT in workers (BYOK in the AI Gateway dashboard) — except `GEMINI_API_KEY` for the direct multimodal/image calls.

**CI/CD** (`.github/workflows/deploy.yml`, push to `main`): Bun 1.3.1 frozen install → turbo build (remote cache) → OpenNext web build → wrangler-action deploys in order **api-worker → ingest → cron-worker → email-worker → web**. No test gate, no preview envs. D1 migrations are manual (`wrangler d1 execute … --remote`) and must precede dependent code; D1 has no migration tracking — verify by PRAGMA (`MIGRATION-STATUS.md`). Rollback via `wrangler rollback`; schema changes are forward-fix only.

---

## 19. Operational gotchas & key file map

**Gotchas (from `CLAUDE.md`, `.claude/memory/architecture-debt.md`, and code comments):**
- `DB` binding is a different database per worker (see §12.1).
- LiteGraphDB: insert-only PUT, JSON-stringified nested Data, Int32 Cost, no deletes (simulate with `expired:true`).
- Anthropic 4.x 400s on `temperature`; gpt-5/o1/o3 need `max_completion_tokens`; maxTokens 2048 silently truncated long extractions (fixed to 8192).
- Embedding model is single-source-of-truth `bge-base-en-v1.5` (768-d) — a backfill once wrote 1536-d vectors into the index (documented incident).
- `remote: true` on ingest bindings = local dev hits production data.
- `@tldrbox/storage` builds to `dist/` — rebuild after source changes.
- Fire-and-forget persona embeddings via `waitUntil` (no retry/status field); silent personalized-feed fallback to global (mitigated with `feedSource`/`fallbackReason` fields).
- Dashboard code must never `fetch('/api/...')` relatively — use the typed clients through api-worker → service-binding chain.
- Mega-cluster control: centroid freeze after 5 ideas, hard cap 30, fission, 14-day dormancy expiry.
- `/api/monitoring/*` is unauthenticated by design — never expose publicly.

**Where to look first:**

| Topic | File |
|---|---|
| Pipeline orchestrator | `apps/ingest/src/pipeline/index.ts` |
| Clustering + importance + prune | `apps/ingest/src/hivemind/global-graph-repository.ts` (1.7k LOC) |
| Feed ranking / diversity | `apps/ingest/src/hivemind/ranker.ts`, `feed-builder.ts` |
| LiteGraph client + circuit breaker | `packages/storage/src/litegraph/client.ts` |
| AI gateway + failover | `packages/ai/src/ai-gateway.ts`, `client-factory.ts`, `text-generation.ts` |
| Extraction model routing | `packages/ai/src/workflows/structured-extraction.ts` (`MODEL_BY_VARIANT`) |
| Wire delivery | `apps/cron-worker/src/wire-delivery.ts` |
| Newsletter v2 | `apps/cron-worker/src/v2/newsletter-v2.ts` |
| Adaptive polling | `apps/cron-worker/src/v2/source-polling.ts` |
| Auth / API keys | `apps/api-worker/src/middleware/auth.ts`, `user-api-auth.ts`; `packages/shared/src/api-keys.ts` |
| Rate limits & plan limits | `packages/shared/src/constants/index.ts`, `apps/api-worker/src/middleware/plan-limits.ts` |
| Cluster bundles | `apps/ingest/src/hivemind/cluster-bundle.ts` |
| Eval harness | `apps/ingest/tests/eval-extraction.ts`; `packages/ai/src/eval/` |
| v2 schema | `packages/storage/migrations/001…019` |
| v1 schema | `packages/database/schema.sql` + `migrations/032–038` |
| Design docs | `docs/proposal/jan20-systemdesign.md`, `docs/proposal/LITEGRAPHDB_MIGRATION_PLAN.md`, `docs/proposal/implementation/00–07`, `.planning/ROADMAP.md` |
| Clustering research | `.claude/memory/clustering-research.md`, `docs/archive/proposals/STORY_CLUSTERING_STRATEGY.md` |
| Tech debt ledger | `.claude/memory/architecture-debt.md` |

---

*End of Part II. Part I (§1–9) is the narrative/achievement view; Part II (§10–19) is the technical reference. Regenerate both together if the codebase changes materially.*
