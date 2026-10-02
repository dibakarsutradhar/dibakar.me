# MC² Finance — Pulsar Message Transport (pulsar-message-transport) Writeup

> **Internal document — not for publication.**
> Repo analyzed: `/Users/dibakar/Downloads/Projects/mc2/pulsar-message-transport`
> Analysis date: 2026-10-02 · Total commits: 15 · Span: 2024-07-18 → 2024-08-20
> Companion documents: `internal/mc2-ingestor-writeup.md` (the Rust ingestor whose Pulsar era this service bridges), `internal/mc2-mono-writeup.md`, `internal/mc2-service-mono-writeup.md`.
> **Confidentiality decision (user, 2026-10-02):** public artifacts derived from this document must be fully anonymized — no MC² Finance, no product names, no teammate names, no hostnames, no tokens/credentials. See §9.
> **Attribution headline (updated 2026-10-02 per user clarification): Dibakar Sutra Dhar has ZERO code commits in this repository.** However, he was the team lead and designed the ETL/ELT pipeline this service is a component of — including the architectural decision that a separate relation-materializer tier should exist (see `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md` §3.6). Code authorship is not his; the architecture is. See §5 and §9.

---

# Part I — Narrative & Achievement View

## 1. TL;DR

`pulsar-message-transport` (npm name `pulsar-cloudflare-sink`) was a small Node.js 20 **bridge service** in MC² Finance's August-2024 "Pulsar era": it subscribed to the platform's Apache Pulsar signal-relations topic, wrote signal→action and intent→signal relations directly into the central Postgres `signals_v2` schema, and notified the platform's Cloudflare consumer worker per processed signal. It was built by the team's principal engineer (13 of 15 commits, 985 insertions) in the last two weeks of July 2024 and hardened through August 20, 2024; the infra teammate added the ECS Dockerfile and the deploy pipeline (2 commits). **Dibakar wrote none of this code (zero commits, verified) — but the service is a designed component of the Pulsar-era ETL pipeline he architected as team lead: the CQRS-flavored seam that offloads cross-table relation materialization and consumer-worker fan-out from Flink task slots onto a cheap, horizontally-scalable Node.js tier** (design rationale recorded in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md` §3.6, "Why a separate service?"). The repo matters to this documentation series as (a) a load-bearing piece of the platform story (it consumed what the ingestor produced during the Pulsar epoch and died with that epoch when the platform moved to direct Cloudflare-Worker ETL push) and (b) a cautionary case study in rapid prototyping under deadline (hardcoded production credentials in source, unbounded retry loops, no tests).

## 2. The product

A single-purpose sink: **Pulsar topic → Postgres relations tables + Cloudflare Worker trigger**. Target users: internal platform services only.

| Feature | What it did |
|---|---|
| Pulsar reader | Non-durable reader (`Pulsar.MessageId.latest()`, reader name `relation-consumer`) on topic `persistent://mc2/signal-v3/relations` (`main.js:60-71`) |
| Relation message handling | Messages are the string form `relation_type\|id1,id2,...`; `signal_action` → insert into `signals_v2.signal_actions` then GET `{workerUrl}/{signal_id}`; `signal_intent` → insert into `signals_v2.intent_signals` (`main.js:73-91`) |
| Retry-on-write | Unbounded `while(true)` retry with 1s sleep for each Postgres insert (`main.js:16-44`) |
| Health endpoint | Bare `http` server, `GET /health` → 200 JSON, port 3000 (`main.js:96-119`) |
| Proto reference | `signals_v2.proto` documents the sibling message schema (`SignalV2` SWAP/BUY/SELL, `SignalIntent`, `Intents`) — **not used by this service's own parsing**, which is pipe-delimited strings |

## 3. Architecture (summary level)

- **Runtime:** one Node.js 20 Alpine container (145-line `main.js` is the entire logic; `Dockerfile` non-root `node` user, `EXPOSE 3000`).
- **Position in the platform:** during Jul–Aug 2024 the Rust ingestor published signals to Pulsar; this service was the Pulsar side of the bridge into persistence (`signals_v2.signal_actions`, `signals_v2.intent_signals` — the same tables the ingestor's own derivation path writes) and the Cloudflare consumer worker. It sits chronologically between the ingestor's "Pulsar data-jobs" epic (Aug 10, 2024, PR #18) and the Cloudflare-Worker cleanup (`3650e9e`) that eventually replaced the whole Pulsar path; the ingestor's final architecture (Jan–Mar 2025, "Ingestor next" #74, "Task queue" #75) pushes actions straight to the ETL worker with no Pulsar and no service like this one.
- **Deployment:** manual workflow-dispatch pipeline (`manual-deployment-PROD.yml`) — ECR build with BuildKit SSH mount, image short-SHA tag written to SSM, render + deploy ECS task definition on cluster `mc2-prod-ec2-cluster`, desired count 1, wait for stability. Same pattern as the ingestor's manual deploys, minus the stage pipeline (PROD only here).
- **No tests, no lint, no CI** — `package.json` test script is the npm placeholder; the only workflow is the PROD deploy.

## 4. The story: how the project evolved

| Date | Commit | Event |
|---|---|---|
| 2024-07-18 | `7366a87` → `a558f83` | Lead initializes the service and adds Docker the same day |
| 2024-07-19 | `644cb4d`, `962e90b` | Infra teammate lands the ECS Dockerfile + PROD deploy pipeline (his only commits; this mirrors his role in the ingestor repo) |
| 2024-07-29/30 | `f64d2c9`, `3c1cbb9`, `700ba58` | "update new logic" / "fix" / "update logs" — first production iteration cycle |
| 2024-07-31 | `9b722b7` | Adds the unbounded retry loops |
| 2024-08-14 | `9cbb3b6` | Topic update (`signal-v3` generation) |
| 2024-08-20 | `63453a9` → `c90ee1e` | Final burst: relation consumer added (+95 lines), worker request logic rewritten (−89/+13), logs/delay tuned, worker URL updated — the service's last commit |

Lifespan: ~5 weeks, 15 commits, no version tags, package version pinned at 1.0.0. Nothing after 2024-08-20 — consistent with the platform's Pulsar-era services being retired as the Cloudflare-Worker ETL path became the standard (see the ingestor writeup's epoch table).

## 5. The user's contributions

**Design & leadership (attested by the user, 2026-10-02).** As team lead for the MC² data platform, Dibakar designed the ETL/ELT pipeline this service belongs to — the seven-codebase decomposition (Rust ingestor → Pulsar → four Flink jobs → relation materializer → Cloudflare consumers) documented in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md`. This service embodies one of his architectural decisions specifically: keeping Flink jobs free of DB-write fan-out and consumer notification by pushing relation tuples as pipe-strings onto a Pulsar topic and materializing them on a separate Node.js tier (ARCHITECTURE.md §3.6 "Why a separate service?", §4.3).

**Code authorship (git-verified): none — zero commits by Dibakar Sutra Dhar** (`git shortlog -sne --all`: principal engineer 13 commits / 985+ 190−, infra teammate 2 commits / 115+ 11−; every Dibakar-authored query returns empty). Author split: all `main.js`, `signals_v2.proto`, and the initial Docker work are the principal implementer's; the teammate's 2 commits are the ECS-hardened Dockerfile and the deploy workflow. This document's value is design-credit context plus platform understanding: read §3 and Part II to understand how signals moved through the platform during July–August 2024, and treat §4 as evidence for the platform timeline in the companion writeups. Personal CV bullets derived from *this repo alone* are not appropriate — the design claim is better carried by the pipeline-level material (ARCHITECTURE.md, the cf-ingestor writeup §8).

## 6. Engineering practices observed

- **Speed-first prototyping:** init → Docker → ECS pipeline → production in 2 days; the service then absorbed fixes continuously ("update logs", "fix", "add retry") rather than being redesigned.
- **No tests, no local dev story:** `package.json` has the placeholder test script; config is env-vars-with-hardcoded-fallbacks, which doubles as the local-run convenience and the security problem.
- **Resilience by brute force:** unbounded `while(true)` + 1s-sleep insert retries and a 5s sleep between messages — simple, effective for a desired-count-1 service, but a poison message or DB outage wedges the single consumer with no DLQ and no logging of parse failures beyond `console.error`.
- **Config as code smells:** live fallback credentials committed in `main.js` (see §9) rather than requiring env vars.

## 7. Numbers worth quoting

| Metric | Value | Trace |
|---|---|---|
| Total commits | 15 | `git rev-list --all --count` |
| Span | 2024-07-18 → 2024-08-20 (~5 weeks) | first `7366a87`, last `c90ee1e` |
| Core logic size | 142 lines (`main.js`) | `wc -l` |
| Lead engineer share | 13 commits, 985+/190− | per-author numstat |
| Infra teammate share | 2 commits, 115+/11− (Dockerfile + pipeline) | per-author numstat |
| Dibakar's commits | **0** | `git shortlog -sne --all` |
| Message format | `relation_type\|id,id,...` (2 handled types) | `main.js:73-91` |
| Deployment | PROD-only manual workflow, desired count 1 | `.github/workflows/manual-deployment-PROD.yml` |
| Tests | 0 (placeholder script) | `package.json` |

## 8. Raw material for derived artifacts

**Personal artifacts from this repo alone: design-credit context only** (see §5; the first-person claims belong to the pipeline-level material — `ARCHITECTURE.md`, the cf-ingestor writeup §8). Honest uses of this repo's material:

- **Platform-context sentence** (for a cover letter or interview narrative about MC², always anonymized): *"The platform's data pipeline went through an event-streaming generation — a Rust indexer published signals to Apache Pulsar, small consumer services materialized relations into Postgres and fanned out to downstream workers — before settling on a direct Cloudflare-Worker ETL architecture. I designed that pipeline and led the team that built it."*
- **Interview story material (as the architect, with honest authorship framing):** the pipe-delimited relation contract and the "cheap Node tier so Flink never blocks on DB writes" seam are good concrete details for explaining the design; credit the implementation to the team.
- **Blog angle (postmortem framing):** *"Five weeks, fifteen commits, three hardcoded credentials: what a tiny bridge service teaches about prototype-era hygiene"* — works as a team retrospective the lead can write about his own pipeline's component.

## 9. Caveats for accuracy (anti-overclaim checklist)

1. **The two-sided rule (updated 2026-10-02 per user clarification).** *Code side:* zero Dibakar commits — any artifact implying he wrote, deployed, or maintained this service's code is false. *Design side:* he was the team lead and designed the pipeline this service is a component of (user-attested; `ARCHITECTURE.md`). Honest phrasing: "designed the event-driven pipeline," "specified the relation-materializer tier"; dishonest phrasing: "built/wrote the transport service."
2. **Authorship split:** the principal implementer wrote all application logic; the infra teammate wrote the ECS Dockerfile and deploy pipeline. Neither is Dibakar.
3. **The proto file is decorative here** — `signals_v2.proto` documents sibling services' schema; this service's own wire format is `type|id,id` strings. Don't describe it as "protobuf-based transport."
4. **Lifespan:** retired-by-neglect after 2024-08-20; the platform later standardized on the ingestor's direct ETL push. Don't describe this as current architecture.
5. **Secrets (names/locations only, never values):** `main.js` contains live fallback credentials — a Pulsar JWT (`main.js:124`), a staging RDS password with full hostname (`main.js:125`), and a Cloudflare worker token + internal workers.dev URL (`main.js:55-57`) — plus internal hostnames in the workflow defaults. This is the single most sensitive repo in the series so far; never quote `main.js` in any public artifact, and treat the committed credentials as exposed (they should be rotated/already rotated).
6. **Anonymization:** all MC² names, hostnames (`*.mc2.host`, `*.workers.dev`, RDS host), cluster/repo names, and the `mc2_signal_v2` proto package name must be stripped from any derived public material.

---

# Part II — Technical Reference

*Standalone reference extracted from source at analysis date (2026-10-02). Paths relative to repo root. Repo frozen at `c90ee1e`, 2024-08-20.*

## 10. System topology

```
 Apache Pulsar broker (pulsar://p-broker-prod.mc2.host)
   topic: persistent://mc2/signal-v3/relations
        │  (JWT token auth; reader starts at MessageId.latest())
        ▼
 pulsar-message-transport  (Node.js 20 container, ECS, desired count 1)
   ├─ relationConsumer (main.js:46) ── INSERT ──▶ Postgres (RDS) schema signals_v2
   │                                    signal_actions / intent_signals
   ├─ processSignal (main.js:2) ──── GET /{signal_id} ──▶ Cloudflare consumer worker
   └─ httpServer (main.js:96) ──── GET /health ──▶ ECS/ALB health checks (port 3000)
```

Who talks to what: Pulsar is the sole input; Postgres and the Cloudflare worker are the two outputs; the health server exists only for orchestration. Produced by the ingestor's Pulsar-era publisher (see the ingestor writeup, epoch table Aug 2024). No queue, no DLQ, no state — if the single task restarts, messages since `latest()` are skipped by design.

## 11. End-to-end data flows

**Flow 1 — Relation consumption** (`main.js:46-94` `relationConsumer`):
1. Connect to Pulsar (`operationTimeoutSeconds: 30`), create reader named `relation-consumer` starting at `MessageId.latest()`.
2. `readNext()` → parse `message.getData().toString().split('|')` → `[relation_type, id,id,...]`.
3. `sleep(5_000)` (fixed per-message backoff).
4. `signal_action` → `retryInsertSignalActions(signal_id, action_id)` → then `processSignal(signal_id)` (GET `{workerUrl}/{signal_id}`).
5. `signal_intent` → `retryInsertSignalIntents(signal_id, intent_id)`.
6. Any other type: logged and dropped. Any thrown error: logged, loop continues.

**Flow 2 — DB write with unbounded retry** (`main.js:16-44`): `while(true) { INSERT ...; break; } catch { sleep(1_000) }` — no max attempts, no circuit breaker, no re-queue; the reader stalls while retrying.

**Flow 3 — Worker notify** (`main.js:2-14` `processSignal`): plain `axios.get(url)`; non-200 returns false (logged); **fire-and-forget — failure is not retried**, unlike the DB writes.

**Flow 4 — Health**: `GET /health` → `{"status":"OK","timestamp":...}`; everything else 404.

**Failure semantics summary:** DB writes retry forever; worker notification is at-most-once; message parse errors and Pulsar errors are swallowed into the outer loop; restart skips to the latest message (no replay).

## 12. Data model reference

| Store | Table | Write |
|---|---|---|
| Postgres (RDS) | `signals_v2.signal_actions (signal_id, action_id)` | from `signal_action` messages (`main.js:16-27`) |
| Postgres (RDS) | `signals_v2.intent_signals (intent_id, signal_id)` | from `signal_intent` messages (`main.js:29-44`) |
| Cloudflare worker | URL-path-triggered processing per signal_id | after successful `signal_action` insert |

These are the same relation tables defined in the ingestor's `migrations/001__initial.up.sql` (see the ingestor writeup §12) — this service is a second, parallel writer to them during the Pulsar era. `signals_v2.proto` (39 lines) documents `SignalV2` (signal_type SWAP/BUY/SELL, total_usd_value, tx_hash, token_address, chain_id, block_number, signal_id), `SignalIntent`, and `Intents` — the message schema of the broader signal-v2/v3 generation, not parsed by this service.

## 13. Pipeline / processing reference

| Stage | Call | Constant |
|---|---|---|
| Pulsar connect | `pulsar-client` 1.11.1, token auth | `operationTimeoutSeconds: 30` |
| Read | `reader.readNext()` | non-durable reader, start `latest()` |
| Per-message backoff | `sleep(5_000)` | fixed, every message |
| DB insert retry | `while(true)` | 1s interval, unbounded |
| Worker notify | `axios.get` | at-most-once, no retry |
| Health | node `http` | `PORT` env, default 3000 |

## 14. Algorithms

None beyond retry loops — the service computes nothing; it is a pure transport/relation-materializer. (The actual math — WAC, FIFO lots — lives in the ingestor; see the ingestor writeup §14.)

## 15. External services

| Service | Use | Auth | Quirk |
|---|---|---|---|
| Apache Pulsar | relations topic consumer | JWT token | reader is non-durable; restarts skip to latest |
| Postgres (RDS staging) | relation inserts | user/password URL | staging host hardcoded as fallback |
| Cloudflare consumer worker | per-signal processing trigger | token (unused in the actual request — see §19 #3) | URL/token hardcoded as fallback |
| ECS/ALB | health | — | `/health` returns 200 with any method via explicit check |

## 16. API & auth reference

Single unauthenticated endpoint: `GET /health` (port 3000, `PORT` env). No auth layers on the HTTP surface; all real credentials are outbound (Pulsar JWT, Postgres URL, worker token). ECS health check integrates via this endpoint (workflow deploys with `wait-for-service-stability: true`).

## 17. Scheduling & queues

No scheduler. The Pulsar reader **is** the queue — one consumer thread (`main()` fires `relationConsumer` and `httpServer` concurrently without awaiting either), sequential processing, 5s per message throughput ceiling, no batching, no concurrency, no dead-letter path.

## 18. Bindings, secrets & deployment

**Bindings:** env vars `PORT`, `PULSAR_URL`, `PULSAR_TOKEN`, `PULSAR_TOPIC`, `PULSAR_RELATION_TOPIC`, `WORKER_URL` (readme), `CLOUDFLARE_WORKER_URL`, `CLOUDFLARE_WORKER_TOKEN`, `DATABASE_URL` — each with a hardcoded fallback in `main.js` (see §19 #1; values not reproduced here).

**Deploy pipeline** (`.github/workflows/manual-deployment-PROD.yml`, workflow_dispatch): AWS creds from repo secrets → ECR login → BuildKit build with `--ssh default=ssh_key` (secret `GH_SSH_ECR`) and `--no-cache`, short-SHA tag → push → `aws ssm put-parameter` (image tag, `--overwrite`) → describe/render/deploy ECS task definition (cluster and service names from workflow inputs, PROD defaults) → desired count 1 → wait for stability. Identical pattern to the ingestor's manual deploys; PROD-only, no stage pipeline. Rollback = re-run workflow at an older commit.

## 19. Operational gotchas & key file map

**Gotchas**
1. **Live credentials are the default config.** `main.js` hardcodes a Pulsar admin JWT, a staging RDS URL+password, and a worker token/URL as fallbacks — anyone running `npm start` without env vars silently connects to staging infra. Highest-severity issue in the MC² repo series.
2. **`startMessageId.latest()` + desired count 1** means: deploy restarts skip every relation published during the deploy window, and there is no replay mechanism.
3. **The worker token is dead code:** `processSignal` builds the request without attaching `workerToken` (only the error log references it) — so either the worker ignores auth on this path or the notify silently degrades; worth confirming if this pattern is ever revived.
4. **`while(true)` retries with `sleep` inside the read loop** — a bad DB state blocks the single consumer indefinitely; no poison-message handling.
5. `main()` fires both async functions without awaiting or error handling; a crashed consumer leaves only the health server up (task still passes ALB checks).
6. The readme's env list (`WORKER_URL`, `PULSAR_TOPIC`) drifts from the code's actual names (`CLOUDFLARE_WORKER_URL`, `PULSAR_RELATION_TOPIC`).
7. Dockerfile runs `npm install --only=prod` without a lockfile copy (lockfile is copied later with the source) — non-reproducible builds.

**Key file map**

| Topic | File |
|---|---|
| All logic (consumer, retries, health server, credentials) | `main.js` |
| Signal message schema reference | `signals_v2.proto` |
| Container | `Dockerfile` |
| PROD deploy pipeline | `.github/workflows/manual-deployment-PROD.yml` |
| Env documentation (partly stale) | `readme.md` |

*End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially.*
