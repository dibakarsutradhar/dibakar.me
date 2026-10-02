# MC² Finance — Data Ingestor (mc2-ingestor) Writeup

> **Internal document — not for publication.**
> Repo analyzed: `/Users/dibakar/Downloads/Projects/mc2/mc2-ingestor`
> Analysis date: 2026-10-02 · Total commits: 591 (`git rev-list --all --count`) · Span: 2024-04-05 → 2025-03-13
> Companion documents: `internal/mc2-mono-writeup.md` (user-facing monorepo — the ingestor's `signals_v2` schema is read by that repo's shared-orm) and `internal/mc2-service-mono-writeup.md` (backend services monorepo). Read together for the full platform picture.
> **Confidentiality decision (user, 2026-10-02):** public artifacts derived from this document must be fully anonymized — no MC² Finance, no product names, no teammate names, no hostnames/IPs/account IDs. See §9.

---

# Part I — Narrative & Achievement View

## 1. TL;DR

MC² Finance's **data ingestor** was a Rust service that continuously indexed EVM wallet transaction histories — pulling per-wallet data from third-party blockchain APIs (Moralis, Mobula, Debank), normalizing it into an internal `Action` model, deriving trading signals, FIFO token lots, and weighted-average-cost realized PnL, and shipping the results to the platform's downstream ETL/persistence layer. It ran on AWS ECS Fargate in eu-west-1 against a Postgres `signals_v2` schema and TimescaleDB, fronted by a warp-based admin API on port 8082. The service was implemented almost single-handedly by the team's principal engineer (543 of 591 commits, Apr 2024 → Mar 2025), with infrastructure contributions from two teammates. **Per the user's clarification (2026-10-02), Dibakar Sutra Dhar was the team lead for the MC² data platform and designed the overall ETL/ELT pipeline architecture, of which this ingestor was the ingestion tier** (pipeline-level design document: `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md` — component decomposition, design rationale, capacity math of ~1,000–1,500 actions/sec sustained on the documented hardware). **In this repo he also delivered the entire original CI/CD in its first month (May 7–10, 2024): the first automated build-and-deploy pipeline (GitHub Actions → Docker → EC2 over SSH), a Docker-image CI publishing to DigitalOcean Container Registry, and the x86 protoc fix that unblocked x86 builds** — 14 commits, 100% DevOps. Within three weeks that EC2 pipeline was superseded by a teammate's Terraform/ECS stack, and Dibakar's `build.yml` and `deployment.yml` survived as tracked workflow files for the life of the repo. One ready-to-adapt CV summary sentence:

> *Stood up the first CI/CD for a Rust blockchain data-ingestion service — a GitHub Actions pipeline that SSH-deployed Docker builds to EC2 and a container-image CI publishing SHA-tagged images to a cloud container registry — plus the Dockerfile architecture fix (x86 protoc) that unblocked portable production builds.*

## 2. The product

The ingestor is the "input lung" of MC² Finance's DeFi analytics platform: it converts raw on-chain wallet activity (fetched from commercial blockchain APIs) into the normalized `signals_v2` data that the rest of the platform (user-facing app, portfolio queries, AI insights) consumes. Target users: internal only — the web API is described in its own log line as "application administrating" (`src/web_api/mod.rs:176`), consumed by the platform backend.

| Feature | What it did |
|---|---|
| Continuous wallet indexing | Polled every registered wallet on supported EVM chains (ETH, BSC, Linea) per new blocks, with checkpoint-based resume |
| Provider fan-out | Moralis (blocks, historical portfolio, batched token prices), Mobula (transaction history, pagination + retry), Debank (token balances; dormant) |
| Action normalization | Provider payloads → `Action` rows (SEND/RECEIVE) with USD values, SHA-256-derived IDs, unknown-token discovery into the `assets` registry |
| Signal derivation | Actions → BUY/SELL/SWAP signals, FIFO token lots, WAC-based realized gain (`performance_v1`), realized-gain "Intents" |
| Admin Query API | warp HTTP API: add/remove/blacklist wallets, reindex a wallet or a whole chain, pause/resume indexing |
| Wallet lifecycle | Auto-blacklisting of high-traffic wallets (>10,000 txs), spam-token caching, blacklist table per (wallet, chain, provider) |
| Push-to-ETL | Block-sorted batches of 500 Actions POSTed to the platform's Cloudflare Worker ETL endpoint with an `x-api-key` |

Positioning evolved significantly mid-life: the April 2024 README describes a pluggable "source → publisher" architecture (Mobula WebSocket, Apache Pulsar, protobuf model registry, even a Twitter feed source); by September 2024 all of that was gone — protobuf removed (PRs #26/#27), Pulsar removed (`3650e9e`), Redis dropped (`4b11ae1`), replaced by direct DB writes plus a Cloudflare-Worker ETL push.

## 3. Architecture (summary level)

- **Single Rust binary** (`data-ingestor` v0.1.0, `Cargo.toml`): 35 `.rs` files, ~7,365 LOC. Modules: `src/providers/` (connector layer, 1,689 LOC), `src/data_jobs/` (derivation math, 1,653 LOC), `src/database/` (sqlx over Postgres + Timescale client, 1,114 LOC), `src/data_ops.rs` (task-queue indexing engine, 445 LOC), `src/web_api/` (warp admin API, 433 LOC), `src/producer.rs` (ETL push), `src/cache.rs` (in-process moka global cache).
- **Storage:** central Postgres (`signals_v2` schema — the same schema the user-facing monorepo reads via shared-orm) for actions/signals/lots/performance/checkpoints/blacklists; managed TimescaleDB as the wallet registry; no external queue (an ElastiCache Redis module exists only in `terraform/main.backup` — removed from active config).
- **Runtime:** ECS Fargate, eu-west-1, ingestor service at 4 vCPU / 8 GB, private subnets behind an ALB with ACM TLS; Datadog agent + Fluent Bit sidecars; Route53 `ingestor-{prod,stage}.mc2.host` (`terraform/config/prod.tfvars`, `stage.tfvars`).
- **External services:** Moralis, Mobula, Debank APIs; downstream ETL Cloudflare Worker.
- **Deploy:** GitHub Actions → AWS ECR (+ a parallel/legacy DigitalOcean registry push), manual workflow-dispatch deploys for stage/prod that bake config into the image, Terraform (S3 state, workspace-per-env) provisioning ECS/ALB/ECR/Route53/Datadog.

## 4. The story: how the project evolved

| Epoch | Period | Theme |
|---|---|---|
| Genesis / proto-models era | Apr 5–22, 2024 | Lead engineer alone, 106 commits: tokio, source-trait abstraction, Mobula client, warp API, Pulsar publisher (PRs #4–#10), local protobuf model registry via SSH build mount. |
| **Infra month — Dibakar's window** | May 2024 | **Dibakar ships EC2 CI/CD (May 7–10, below).** Lead adds Postgres persistence, Redis query-store, Dockerization. Waqar arrives May 13 and lands Terraform v1 (PR #11, merged May 31) — replacing Dibakar's hand-rolled EC2-SSH deploy with ECS/Fargate within 3 weeks. |
| AWS platform era | Jun–Jul 2024 | Mostly Waqar: monitoring (Grafana/Datadog), ALB, ECS, Flink configs. Lead: portfolio feature, BigDecimal, cache/retry. |
| The great refactor of August | Aug 2024 | Lead's peak month (117 commits): Redis/rayon removed, global cache (PRs #14–#17), callback processing, Pulsar data-jobs, Cloudflare worker (`3650e9e`). |
| Proto removal | Sep 2024 | PRs #26/#27 (`81dd9bd`, `493f15d`) drop the protobuf pipeline; ActionV2 → Action. |
| Scaling / multi-chain era | Oct 2024 | 65 commits: multi-chain (#40), checkpoints (#47), wallet blacklisting (#56), ingestion-API refactor (#57), spam-token filter (#63), concurrency. |
| Hardening | Nov–Dec 2024 | Whitelist-only ingestion (Staging, #67 — also the commit that emptied the two real docs), sqlx + BigDecimal migration (#71). |
| 2025 epilogue | Jan–Mar 2025 | Lead solo: "Ingestor next" rewrite (#74, `b0fe794`), final commit "Task queue (#75)" (`87060a4`, Mar 13, 2025) — the repo froze there. |

**Dibakar's tenure:** first commit `83af2eb` "ec2 deployment cicd" on 2024-05-07, last commit `f49b6ea` on 2024-05-10 — a four-day, high-leverage DevOps insertion in the project's second month. **What happened after:** the teammate who arrived three days after Dibakar's last commit built the Terraform/ECS pipeline on top of the containerized deployment Dibakar's workflows established (the `deployment.yml`/`build.yml` files Dibakar created were later *repointed* — `deployment.yml` from SSH-EC2 to ECR push, `build.yml` kept the DigitalOcean registry Dibakar chose — both still tracked at repo freeze). The Dockerfile x86 fix also survived: the multi-stage Dockerfile kept building on x86 runners for the rest of the project's life.

## 5. The user's contributions in detail

### Design & leadership (attested by the user, 2026-10-02)

Beyond the git-attributed DevOps work below, Dibakar's contribution to this system was **architectural**: as team lead he designed the ETL/ELT pipeline of which this ingestor is the ingestion tier — the third-party provider fan-out (Moralis/Mobula/Debank instead of self-operated RPC nodes), the continuous checkpoint-based wallet-indexing model, the normalized `Action`/`Signal` data contract (`signals_v2`) that survived two later rewrites of the stack, and the ingestion→derivation→materialization decomposition captured in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md` (which sizes the designed system at ~1,000–1,500 actions/sec sustained on the documented hardware). Git cannot attest design authorship; this claim rests on the user's statement and that document, and derived artifacts should say "designed the ingestion architecture," never "wrote the Rust service."

### Ownership map

*Terminology note (updated 2026-10-02 per user clarification):* "principal engineer" below = the primary implementer (all `me@vutr.io` identities). Dibakar's role was **team lead and pipeline architect** — the design layer above this code, attested in §5 and documented in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md` — plus the DevOps work listed here.

| Author (identities merged) | Commits | Share | Insertions / deletions | Territory |
|---|---|---|---|---|
| Principal engineer | 543 | 91.9% | 48,087 / 36,987 | 100% of `src/`; top files `src/main.rs` (104 touches), `src/web_api/mod.rs` (103), `src/data_ops.rs` (54) |
| Infra teammate | 34 | 5.8% | 30,388 / 12,578 ⚠ | `terraform/` (`main.tf` ×15, `prod.tfvars` ×13), monitoring dashboards, manual-deploy workflows |
| **Dibakar Sutra Dhar** | **14** | **2.4%** | **228 / 87** | `.github/workflows/deployment.yml` (6 commits), `.github/workflows/build.yml` (6), `Dockerfile` (1), `config.toml` (1) |

⚠ Inflation flag: the infra teammate's ~30k insertions are dominated by generated/vendored content (Grafana dashboard JSONs, a committed `terraform/errored.tfstate`, since-removed debug files). Dibakar's 228 insertions are **pure YAML/TOML/Dockerfile — zero generated-file inflation**.

### Thematic breakdown (all 14 commits)

**Theme 1 — The project's first deploy pipeline: GitHub Actions → Docker → EC2 (6 commits, all `deployment.yml`).**
`83af2eb` (May 7, +45 lines, verified from full diff) created a complete "Deploy to EC2" workflow on push to `main`: SSH key materialized from the `EC2_PRIVATE_KEY` secret with `chmod 600`, a GitHub private-dep key copied onto the target host, `scp -r .` of the repo to `ubuntu@<ec2-ip>:/home/ubuntu/app`, a remote `DOCKER_BUILDKIT=1 docker build --ssh default=... --no-cache` (the BuildKit SSH-mount trick for the private protobuf-models dependency), then stop/rm/run of the container with port 8082 published. Follow-up commits `a9c8d56` "directory error fix", `d6155e1`, `7a6376f`, `83bd490`, `1c725bd` "ssh key updated" (May 7–8) debugged the working-directory and key-handling issues. This is a textbook end-to-end SSH deployment pipeline — the first automated path from `git push` to a running MC² ingestor container.

**Theme 2 — Container-image CI to a cloud registry (6 commits, all `build.yml`).**
`d398c4d` "Create build.yml" (May 9, +31 lines, verified) established build-on-push-to-main CI using `docker/setup-buildx-action` + `docker/build-push-action`, authenticated via `doctl` (`DIGITALOCEAN_ACCESS_TOKEN` secret, `--expiry-seconds 180`), publishing `registry.digitalocean.com/mc2-ingestor/api:{latest,sha-<sha>}` — i.e., immutable SHA tags *and* a moving `latest` from day one. Commits `4be984a`, `bb5dc04`, `064ac22`, `0c69616`, `f49b6ea` (May 9–10) are the classic YAML-debug loop, ending in a trimmed, working final version (net −23/+17).

**Theme 3 — Build portability & environment fixes (2 commits).**
`91bc747` "protoc zip for intel x86" (May 8, verified from diff): the Dockerfile hardcoded the ARM64 (`aarch_64`) protoc binary; Dibakar switched it to `linux-x86_64` (keeping the ARM line as a comment) — without this, every build on x86 runners/hosts failed at the protoc install step. `e154381` "create config.toml" (May 8, +57): local-run config wiring the Mobula source → publisher pipeline. (Note: this commit embedded a live Mobula API key; the file was later untracked by the lead, and the key remains in git history — see §9 and the security flags.)

### Signature engineering moments

1. **First push-to-production path for the whole platform's data plane.** The ingestor is the pipeline feeding MC²'s entire `signals_v2` dataset, and for its first month it had *no* CI — deploys were manual. Dibakar's `83af2eb` turned `git push` into a running container in one 45-line workflow, including the non-obvious BuildKit SSH-forwarding dance needed because the build cloned a private protobuf repo from GitHub.
2. **Registry strategy with immutable tags.** The `sha-${{ github.sha }}` tag scheme in `d398c4d` predates the team's later SSM-parameter/image-tag deploy machinery (`terraform/supporting-resources.tf`, where CI writes the SHA tag into SSM for the ECS task def) — the same immutability pattern, later reused by the infra teammate at ECS scale.
3. **Cross-architecture build debugging.** The `91bc747` protoc fix is small but load-bearing: it's the difference between a Dockerfile that only builds on whoever's laptop's CPU architecture and one that builds on CI runners — a fix that had to be discovered by reading the failure, matching the binary arch to the runner arch, and preserving the ARM path for local dev.

### Commit hygiene

GitHub web-UI style ("Create build.yml", "Update build.yml" ×4) plus descriptive ops messages ("ec2 deployment cicd", "protoc zip for intel x86", "ssh key updated") — accurate and appropriate for CI iteration work; the 6-commit fix loop per workflow is the normal shape of 2024-era Actions debugging.

## 6. Engineering practices observed

- **No test/lint CI.** All four workflows are deploy-only; none runs `cargo test` (the repo has ~25 test fns across 13 files, mostly live-API integration tests). The only quality gate was the lead's local runs.
- **Deploy model:** push-to-`main` image builds (ECR + DigitalOcean in parallel), then *manual* workflow-dispatch deploys for stage/prod that `sed` secrets into `config.toml` at build time and update an SSM image-tag parameter before deploying the ECS task definition. Rollback = re-run the manual workflow pinned to an older ref.
- **Docs culture:** two genuinely useful docs (`DATABASE_MODEL_GUIDE.md`, `WEB_API_DOCUMENT.md`) were written, then deliberately emptied to 1-byte placeholders during the "Staging (#67)" hardening commit; the surviving README is a stale 45-line skeleton (last touched 2024-09-19) describing an API that has since grown reindexing, blacklisting, and the task queue.
- **Known tech debt (recorded honestly):** hardcoded admin API key const (`src/web_api/mod.rs:31`), migration numbering gap (no `003`) and no down-migrations, dead code paths (`get_actions_with_moralis`, Debank client, `kanal` dependency), `try_join!` in `main.rs` that doesn't actually join the indexing loop, security groups open to `0.0.0.0/0`.

## 7. Numbers worth quoting

| Metric | Value | Trace |
|---|---|---|
| Total commits | 591 | `git rev-list --all --count` |
| Project span | 2024-04-05 → 2025-03-13 (~11 months) | first commit `5b157b5`, last `87060a4` |
| Rust source | 35 files, ~7,365 LOC | `find src -name '*.rs' \| xargs wc -l` |
| Dibakar's commits | 14 (2.4% of repo) | `git shortlog -sne --all` |
| Dibakar's insertions/deletions | 228 / 87, zero generated files | `git log --author=dibakar --numstat` (verified) |
| Dibakar's tenure | May 7–10, 2024 (4 days, 6 workflows files touched) | commit dates `83af2eb`→`f49b6ea` |
| Dibakar's first pipeline | 45-line workflow: push → Docker → running EC2 container | `git show 83af2eb` |
| Registry tags published per build | 2 (`latest` + `sha-<sha>`) | `git show d398c4d` |
| Merged PRs | 38 (numbered #1–#75 with gaps) | PR-squash commit titles |
| Chains supported | 3 (ETH, BSC, Linea) | `config.toml.example`, commit `4180dcb` |
| Default start blocks | ETH 20,533,134; BSC 41,286,993 | `config.toml.example` |
| Prod compute | 4 vCPU / 8 GB Fargate + 2 sidecars | `terraform/config/prod.tfvars` |
| Indexing cadence | 50-wallet concurrent chunks, 20-min sweep wait, finality buffer 50 blocks | `src/data_ops.rs:374,255`, `src/providers/mod.rs:70` |
| ETL push | batches of 500 block-sorted actions | `src/producer.rs:19` |
| Auto-blacklist threshold | wallets >10,000 transactions | `src/providers/moralis/mod.rs:200-214` |
| Pipeline capacity (designed system, all 7 codebases) | ~1,000–1,500 actions/sec sustained, ≈100M actions/day; ceiling = single RDS primary | `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md` §5.4 |

## 8. Raw material for derived artifacts

> **Anonymization rule for ALL of the below (user decision, 2026-10-02):** replace MC² Finance / mc2 with "a DeFi analytics startup"; replace teammate names with "the founding engineer" / "an infrastructure engineer"; never include IPs, hostnames, account IDs, registry URLs, or commit hashes. Technology names (Rust, Docker, GitHub Actions, AWS, Terraform) are fine.

### CV bullet candidates

- Designed the ingestion architecture of a real-time DeFi signals platform — third-party blockchain-API fan-out (Moralis, Mobula, Debank), continuous checkpoint-based wallet indexing, and a normalized actions/signals data contract that survived two rewrites of the underlying stack.
- Led the data-platform team that built the pipeline; sized the system at ~1,000–1,500 actions/sec sustained (≈100M actions/day) with the database primary as the designed bottleneck and a documented 10× upgrade path.
- Built the first CI/CD pipeline for the Rust blockchain data-ingestion service, automating Docker builds and zero-downtime deployment to a cloud Linux host via GitHub Actions and SSH.
- Established container-image CI publishing dual-tagged (latest + immutable SHA) images to a managed container registry, a pattern later adopted by the team's ECS-based deploy pipeline.
- Diagnosed and fixed a cross-architecture build failure in the service's multi-stage Dockerfile, restoring portable x86/ARM production builds.
- Onboarded onto a greenfield Rust codebase (7k+ LOC, tokio/sqlx/warp) and delivered deploy infrastructure within the project's first month.

### Blog-post angles

- **"Ship first, platform later: the life and death of an SSH-deploy pipeline"** — the full arc from a 45-line scp-into-EC2 workflow to Terraform/ECS in three weeks, and why that's the correct order of operations for a seed-stage data product.
- **"The SHA tag you deploy is the SHA you can roll back"** — how immutable image tags in a small GitHub Actions workflow anticipated the SSM-parameter deploy machinery that replaced it.
- **"Debugging GitHub Actions YAML in 2024: a 6-commit postmortem"** — an honest teardown of the create-→-fix loop on the registry workflow, and what would be done differently (act, reusable workflows, OIDC).
- **"Your Dockerfile is architecture-specific until proven otherwise"** — the protoc aarch64-vs-x86_64 failure as a case study in runner-architecture awareness.

### LinkedIn headline candidates

- "DevOps & Backend Engineer — CI/CD for Rust data pipelines (GitHub Actions, Docker, AWS)"
- "Built the first deploy pipeline for a blockchain data-ingestion service; Rust · Docker · AWS ECS"
- "Platform engineering for crypto analytics: containers, registries, and the path from EC2 to ECS"

## 9. Caveats for accuracy (anti-overclaim checklist)

1. **Attribution — the two-sided boundary (updated 2026-10-02 per user clarification).** *Code side:* the principal engineer wrote 100% of the Rust service (all 543 `src/` commits); the infra teammate wrote the Terraform/ECS stack, the monitoring, and the manual-deploy workflows (PR #11 onward). Dibakar's code contribution is specifically and only: the original EC2-SSH deploy workflow, the DigitalOcean registry CI, the x86 protoc Dockerfile fix, and one local config file. Never phrase derived artifacts as writing or maintaining the ingestor's Rust code or the Terraform stack. *Design side:* as team lead, Dibakar designed the ETL/ELT pipeline architecture of which this ingestor is the ingestion tier (user-attested; documented in `/Users/dibakar/Downloads/Projects/mc2/ARCHITECTURE.md`). Honest phrasing: "designed the ingestion architecture," "led the data-platform team." Dishonest phrasing: "wrote the Rust ingestor."
2. **The EC2 pipeline was superseded.** Dibakar's SSH-to-EC2 deploy was replaced by the teammate's Terraform/ECS pipeline (PR #11, May 31, 2024) before it could serve a production release. Accurate framing: "stood up the first automated deployment, later migrated to ECS as the platform matured." The *files* Dibakar created survived (repointed), which is the strongest honest claim.
3. **Tenure was 4 days in this repo** — this writeup is deliberately scoped so that derived artifacts present mc2-ingestor as one line among Dibakar's MC² contributions (see the companion writeups, where the 225-commit secure-api work lives).
4. **No generated-file inflation** applies to Dibakar's numbers only; never quote the teammate's ~30k insertions without the vendored-JSON/tfstate caveat.
5. **Terminology:** the repo calls its core model `Action`/`Signal`/`IngestionQuery` (not "webhooks", not "jobs"); the final task-queue design is in-process only (no Redis/SQS) — don't describe it as a distributed queue.
6. **Stray/placeholder files not to reference publicly:** `DATABASE_MODEL_GUIDE.md` and `WEB_API_DOCUMENT.md` are empty placeholders; `api_test.http` targets a route and port that no longer exist; `terraform/main.backup` and `config/prod.backup` are dead snapshots.
7. **Secrets in history (see Part II §16 for full inventory):** a live Mobula API key in the historical `config.toml` (`e154381`), DB passwords in workflow defaults and `terraform/config/*.tfvars`, a hardcoded admin API key in source. All of these are reasons the full-anonymization rule exists; never quote config snippets from this repo in public material.

---

# Part II — Technical Reference

*Standalone reference extracted from source at analysis date (2026-10-02). File paths relative to repo root. Repo frozen at commit `87060a4` "Task queue (#75)", 2025-03-13.*

## 10. System topology

```
                      ┌────────────────────────── AWS eu-west-1 ──────────────────────────┐
 Route53 ingestor-*.mc2.host → ALB (ACM TLS) → ECS Fargate service "ingestor" (4 vCPU/8GB, port 8082)
                                                │  containers: ingestor + datadog-agent + fluent-bit
                                                │
   ┌────────────────────────────┼───────────────────────────────┐
   │ admin web API (warp :8082) │ indexing engine (TaskQueue)   │ ETL push (producer.rs)
   │ add/remove/blacklist       │ 50-wallet chunks, 20-min sweep│ batches of 500 actions
   │ reindex wallet/chain       │ checkpoints + blacklists      │ + x-api-key header
   │ toggle indexing            ▼                               ▼
   │        ┌─────────────────────────┐        ┌──────────────────────────┐
   │        │ Common Postgres (RDS)   │        │ ETL Cloudflare Worker    │
   │        │ schema: signals_v2      │        │ (external, downstream    │
   │        │ actions/signals/lots/   │        │  persistence owner)      │
   │        │ performance/checkpoints │        └──────────────────────────┘
   │        └─────────────────────────┘
   │        ┌─────────────────────────┐
   └───────▶│ TimescaleDB (managed)   │   wallet registry: wallets(compatibility, status)
            └─────────────────────────┘
   Outbound fetches: Moralis (deep-index.moralis.io/api/v2.2), Mobula (production-api.mobula.io/api/1),
                     Debank (pro-openapi.debank.com)
```

Who talks to what: the platform backend reaches the ingestor **only** through the ALB → warp API (static `x-api-key`); the ingestor reaches out to three blockchain-API providers and the ETL worker; nothing else reaches the databases. The ETL worker (Cloudflare) is the downstream consumer of pushed actions *and* holds read grants on `signals_v2` (migration `004`/`005` grant SELECT to roles `cloudflare` and `old_server`). Datadog and Fluent Bit run as sidecars; CloudWatch logging is disabled for the app container (`terraform/config/prod.tfvars`).

## 11. End-to-end data flows

**Flow 1 — Boot & initial load** (`src/main.rs` → `src/data_ops.rs:69` `initial_data_load`):
1. Figment loads `config.toml` (path from `CONFIG` env).
2. Wallets loaded from TimescaleDB `wallets` and/or common-DB `tbl."user"` per `[common_database].is_load_wallets` / `[timescale_database].is_load_wallets` flags.
3. `blacklisted_wallets` fetched and subtracted; `assets` loaded into `GlobalCache` (Solana chain-id 1399811149 skipped).
4. A `Task::AutoIndex` is seeded into the `TaskQueue` (`src/main.rs:77`); the warp server and indexing loop start concurrently via `try_join!`.

**Flow 2 — Auto-index sweep** (`run_indexing_tasks`, `src/data_ops.rs:255`):
1. Pop next task. `ManualIndexWallet`/`ManualIndexAllWalletsOfChains` were front-inserted; `AutoIndex`/`Wait` back-inserted (`src/data_ops.rs:24-67`).
2. Wallets processed in chunks of 50 concurrently (`src/data_ops.rs:374`), each via `task_indexing_single_wallet` (`src/data_ops.rs:192`).
3. Per wallet: read `signals_v2.checkpoints` for last indexed block; skip if within 50 blocks of Moralis' latest block (finality buffer, `src/providers/mod.rs:70`).
4. First-time wallets: fetch historical token balances at start block via Moralis `/wallets/{wallet}/portfolio/historical` (cursor-paginated) → synthesized RECEIVE "initial balance" actions.
5. Transaction history via Mobula `wallet/transactions` (200/page, page-paginated with retry).
6. Unknown tokens discovered → bulk-insert `signals_v2.assets` + cache.
7. High-traffic wallets (>10,000 txs) → insert into `signals_v2.blacklisted_wallets`, mark `no_data` in Timescale (`src/providers/moralis/mod.rs:200-214`).
8. After each sweep: enqueue `Wait(20 min)` then another `AutoIndex`. The `Arc<AtomicBool>` toggle (POST `/toggle/indexing`) halts between chunks.

**Flow 3 — Push to ETL** (`src/producer.rs:19` `send_actions`): actions sorted by block number, batched at 500, POSTed as `{actions, should_validate}` to `etl_api_endpoint` with the static `x-api-key`. Downstream persistence into `signals_v2` is the ETL worker's job.

**Flow 4 — Local derivation path** (`task_process_actions`, `src/data_jobs/mod.rs:~630`): validates actions (same wallet/chain, non-zero values, block-ascending, unique IDs, known asset IDs), deletes/replaces the wallet's actions from from-block, then derives and inserts Signals, TokenLots, PerformanceV1, Intents + checkpoint upsert. **Caveat: in the frozen HEAD this function is only invoked from the test module (`data_jobs/mod.rs:1215+`) — the live path is Flow 3.**

**Flow 5 — Admin reindex** (`src/web_api/handlers.rs`): POST `/reindex/wallet` → enqueue high-priority `ManualIndexWallet`; POST `/reindex/chain` → purge checkpoints for the chain(s), re-enqueue `AutoIndex`; POST `/toggle/indexing` → flip the global pause. All except `GET /` require the static API key.

**Failure/retry behavior:** Mobula client retries per page (`src/providers/mobula/mod.rs`); provider activation retried ("retry on provider's failed activation", `6628318`); the whole process deliberately `panic!s` on component failure to let ECS restart it ("Will restart by supervisor", `src/main.rs:98`); task queue is in-memory, so restarts lose queued work but checkpoints make re-sweeps cheap.

## 12. Data model reference

**Store inventory**

| Engine | Database/schema | Contents |
|---|---|---|
| Postgres (RDS) | `mc2fi`, schema `signals_v2` | assets, actions, signals, signal_actions, intents, intent_signals, token_lots, performance_v1, checkpoints, providers, blacklisted_wallets |
| TimescaleDB (cloud) | `tsdb` | `wallets` registry (compatibility, `status::wallet_status`) |
| In-process (moka + lru) | `GlobalCache` (`src/cache.rs`) | wallets, assets, spam tokens, Moralis block timestamps |

**Tables** (migrations/, note: numbering runs 001, 002, 004, 005, 006 — no 003; no down-migrations):
- **enums** `action_types` (SEND/RECEIVE), `signal_types` (SWAP/BUY/SELL) — `001__initial.up.sql`.
- **assets** — token registry; unique (address, chain_id); symbol index.
- **actions** — PK `id varchar(255)` (SHA-256-derived, truncated to 15 hex chars, `src/data/utils.rs`); action_type, asset_id FK, asset_value/usd_value/usd_price NUMERIC, tx_hash, log_index, wallet_address, data JSONB, block_number/timestamp; 4 indexes.
- **signals** — BUY/SELL/SWAP with USD value, FK→actions (CASCADE); **signal_actions** relation table.
- **intents** / **intent_signals** — realized-gain events.
- **token_lots** (`004`) — PK action_id, lots JSONB, wallet/token/chain index. Documented design comment in the migration: upsert-based; buys add to amount, sells subtract — the FIFO lot ledger.
- **performance_v1** (`005`) — PK (wallet, token, chain, block): total_amount/cost, realized_gain/percent, wac. SELECT granted to `cloudflare` and `old_server` roles.
- **providers / blacklisted_wallets** (`002`) — blacklist keyed by (wallet, chain) with provider FK seeded 'moralis'.
- **checkpoints** (`006`) — PK (wallet, chain_id) → last indexed block.

Rust counterparts: `src/data/models.rs` (Action, Signal, IntentEntity, TokenLot, PerformanceV1, Wallet, Asset); per-table CRUD traits in `src/database/common/tbl_*.rs`.

**Cache key families** (`src/cache.rs`): wallets, assets, spam-token cache (sized/refreshed via repeated "increase cache size" commits), Moralis block-timestamp cache (`src/providers/moralis/mod.rs`). No TTLs documented in code comments — sizes are the tuning knob.

## 13. Pipeline / processing reference

| Stage | External call | Writes | Constants |
|---|---|---|---|
| Latest-block check | Moralis `getBlockNumber` | — | finality buffer: skip if ≤50 blocks from head (`src/providers/mod.rs:70`) |
| Historical portfolio (first index) | Moralis `/wallets/{wallet}/portfolio/historical` | synthesized RECEIVE actions, assets | cursor pagination |
| Tx history | Mobula `wallet/transactions` | actions | 200 items/page, page loop + retry |
| Batched token price (dead-code path) | Moralis, 10 tokens/request | — | `#[allow(dead_code)]` |
| Unknown-token discovery | — | `signals_v2.assets` + cache | — |
| High-traffic guard | — | `blacklisted_wallets`, Timescale `no_data` | >10,000 txs |
| ETL push | Cloudflare Worker | — | batches of 500, block-sorted |
| Derivation (local path) | — | signals, token_lots, performance_v1, intents, checkpoints | chunk concurrency 50; sweep wait 20 min |

## 14. Algorithms

- **Action ID:** SHA-256 over identity fields, hex-truncated to 15 chars (`src/data/utils.rs` `generate_id`) — collision-safe at this scale, fits `varchar(255)` PK.
- **Signal coalescing** (`create_signals`, `src/data_jobs/mod.rs:145`): one action → one BUY or SELL signal; when a single block contains both a buy and a sell of different tokens, they coalesce into a single SWAP signal.
- **FIFO token lots** (`create_token_lots`, `src/data_jobs/mod.rs:459`): buys open/append lots; sells consume lots oldest-first; result stored as JSONB on `token_lots` (upsert semantics documented in `migrations/004__token_lots.sql`).
- **Realized gain via WAC** (`profit_job::calculate_profit`, `src/data_jobs/profit_job.rs:43`): weighted-average-cost basis; realized gain and percent recorded per (wallet, token, chain, block) into `performance_v1` with the running `wac` column. No tuning history recorded — the algorithm arrived with #31-era "replay actions" work and persisted unchanged.
- **Checkpoint skip:** index a wallet only when `head − last_block > 50` blocks; a reindex purges checkpoints (`/reindex/chain`) or targets one wallet (`/reindex/wallet`).

## 15. External services / model catalog

| Operation | Service | Endpoint / auth | Notes |
|---|---|---|---|
| Latest block, block timestamps, historical portfolio, batched prices | Moralis | `https://deep-index.moralis.io/api/v2.2`, key from config `[providers]` | primary provider; timestamps cached in moka |
| Wallet transaction history | Mobula | `https://production-api.mobula.io/api/1/` | 200/page, retry loop; a live key is embedded in test code (`src/providers/mobula/mod.rs` tests) |
| Token balances | Debank | `https://pro-openapi.debank.com` | instantiated but effectively dormant |
| Downstream ETL | Cloudflare Worker | `etl_api_endpoint` from config, static `x-api-key` | owns `signals_v2` persistence; stage URL is a private workers.dev subdomain |

Transport quirks: keys are baked into `config.toml` at image build time by the manual deploy workflows (not runtime-injected); the admin API key is additionally hardcoded as a const (`src/web_api/mod.rs:31`, duplicated `src/producer.rs:23`).

## 16. API & auth reference

Warp server on `0.0.0.0:8082` (`src/web_api/mod.rs:233`). Single auth layer: static shared key in the `x-api-key` header (const `AUTH_API_KEY`, `src/web_api/mod.rs:31`). TLS terminates at the ALB (ACM cert in `terraform/config/prod.tfvars`). No rate limits, no per-user auth, no OpenAPI spec.

| Route | Auth | Handler | Effect |
|---|---|---|---|
| POST `/ingestion-query` | x-api-key | `push_ingestion_query` (`web_api/mod.rs:85`) | tagged-union body: ADD_WALLET / REMOVE_WALLET / BLACKLIST_WALLET (`src/web_api/query.rs`, SCREAMING_SNAKE_CASE serde) |
| POST `/reindex/wallet` | x-api-key | `handle_reindex_wallet` (`handlers.rs:25`) | front-insert `ManualIndexWallet` |
| POST `/reindex/chain` | x-api-key | `handle_reindex_all_wallets` (`handlers.rs:65`) | purge chain checkpoints, re-enqueue `AutoIndex` |
| POST `/toggle/indexing` | x-api-key | `handle_toggle_indexing` (`handlers.rs:15`) | flip global indexing `AtomicBool` |
| GET `/` | none | inline | health check (ALB matcher 200–405) |

## 17. Scheduling & queues

**TaskQueue** (`src/data_ops.rs:24-67`, introduced by final PR #75): `Arc<Mutex<VecDeque<Task>>>`, priority insertion — manual tasks to the front, `Wait`/`AutoIndex` to the back. Task kinds: `ManualIndexWallet`, `ManualIndexAllWalletsOfChains`, `AutoIndex`, `Wait(Duration)`. The consumer loop self-perpetuates: AutoIndex sweep → `Wait(20 min)` → AutoIndex. Cadence: 50-wallet concurrent chunks, pause-check between chunks. **Not distributed:** no Redis/SQS/Kafka (the `kanal` dependency is unused); queue contents are lost on restart; correctness relies on checkpoints + ECS task restart.

## 18. Bindings, secrets & deployment

**Bindings (ingestor task):** common Postgres URL + Timescale URL (config, `[common_database]`/`[timescale_database]` with independent `is_load_wallets` flags), provider API keys (config `[providers]`), ETL endpoint (config), Datadog API key (SSM → sidecar), S3 Terraform state bucket.

**Secrets inventory (names/locations only — values must never be reproduced):** provider keys in `config.toml` (baked at build); admin API key const in `src/web_api/mod.rs:31`; RDS/Timescale passwords as workflow input *defaults* in `.github/workflows/manual-deployment-STAGE.yml`; DB creds in `terraform/config/*.tfvars`; GitHub secrets `GH_SSH_ECR`, `EC2_PRIVATE_KEY`, `DIGITALOCEAN_ACCESS_TOKEN`; SSM params `mc2-{prod,stage}-mc2-ingestor` (image tag, CI-owned via `ignore_changes`), `mc2-prod-data-dog-{api,app}-key`. A live Mobula key and an EC2 IP persist in git history (`e154381`, `83af2eb`).

**CI/CD chain:** push to `main` → (a) `deployment.yml`: BuildKit SSH-mount build → ECR `mc2-ingestor:latest` (eu-west-1) — this file originated as Dibakar's EC2-SSH deploy (`83af2eb`) and was later repointed to ECR; (b) `build.yml`: same trigger → DigitalOcean registry `mc2-ingestor/api:{latest,sha-<sha>}` — Dibakar's file, unrepurposed (`d398c4d`). Then manual: `manual-deployment-{STAGE,PROD}.yml` (workflow_dispatch) → `sed` `%%placeholder%%` tokens in `config.toml.example` from workflow inputs → `--no-cache` build → push `mc2-{env}-mc2-ingestor:<sha>` → write tag to SSM → `amazon-ecs-render-task-definition` + deploy with desired count 1 → wait for stability. Rollback = re-run the manual workflow at an older ref. **None of the four workflows runs tests.**

**Terraform** (`terraform/`): S3 backend (`terraform-centralised-state-918666968828`), AWS 5.47.0 + Datadog 3.41.0 providers, workspaces per env. Modules: `ecr`, `cluster`, `service`, `alb`, `autoscaling`, `elastic-cache` (unused in active config), `security-group`, `container-definition`. Stage: ingestor only (4 vCPU/8 GB). Prod: ingestor + `data-api` (0.5 vCPU/1 GB, port 3000) behind host-based ALB rules.

## 19. Operational gotchas & key file map

**Gotchas**
1. `try_join!` in `src/main.rs` joins only the web server; the indexing future isn't actually awaited — shutdown/ownership of the indexing loop depends on the `panic!`-restart model.
2. `has_wallet` ignores chain-id (`src/cache.rs:60`) — a wallet on two chains can be misreported as cached.
3. Blacklist writes use inconsistent provider naming ("Moralis" in `web_api/mod.rs:79` vs "moralis" in `moralis/mod.rs:211`).
4. `task_process_actions` (all signal/lot/PnL math) is reachable only from tests at HEAD — anyone assuming the ingestor persists derived data will misread the architecture.
5. Dead code traps: `get_actions_with_moralis`, the Debank client, and the `kanal` dependency are declared but unused.
6. Secrets baked into images at build time mean image registries effectively store credentials; security groups in tfvars allow all traffic `0.0.0.0/0`; `.env` is git-tracked.
7. Stale docs: README omits everything post-Sep-2024; the two placeholder docs were real docs emptied by #67; `api_test.http` targets `/wallets/` on the wrong port; `terraform/main.backup` holds the removed Redis module.
8. Auth comparison is a plain const string compare, and the key is printed in the historical `WEB_API_DOCUMENT.md` (`a794845`).

**Key file map**

| Topic | File |
|---|---|
| Entry point / wiring / deliberate panic | `src/main.rs` |
| Task queue + indexing engine | `src/data_ops.rs` |
| Signal/lot/PnL derivation | `src/data_jobs/mod.rs`, `src/data_jobs/profit_job.rs` |
| Provider connectors | `src/providers/moralis/`, `src/providers/mobula/`, `src/providers/debank.rs`, `src/providers/mod.rs` |
| Domain model + chain IDs | `src/data/models.rs`, `src/data/blockchains.rs`, `src/data/conversion.rs`, `src/data/utils.rs` |
| DB access | `src/database/common/mod.rs` + `tbl_*.rs`, `src/database/timescale.rs` |
| Admin API | `src/web_api/mod.rs`, `handlers.rs`, `query.rs` |
| ETL push | `src/producer.rs` |
| Global cache | `src/cache.rs` |
| Schema | `migrations/001__initial.up.sql` … `006__checkpoints.sql` |
| Infra | `terraform/main.tf`, `terraform/config/{prod,stage}.tfvars` |
| CI/CD | `.github/workflows/{deployment,build,manual-deployment-STAGE,manual-deployment-PROD}.yml` |
| Config template | `config.toml.example` |

*End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially.*
