# TheGarageOS / Jemeti `infra` — Codebase Writeup

> **Internal document — not for publication.**
> Repo: `/Users/dibakar/Downloads/Projects/thegarageos/infra` (GitHub: `jemeti/infra`)
> Analysis date: 2026-10-02 · History span: 2026-07-02 → 2026-10-01 · 92 commits (6 PR merges)
> Companion document to `internal/thegarageos-core-writeup.md` (same project, same scoping decisions: whole project with attribution, founder/solo framing, may name Jemeti publicly). This doc covers the AWS plumbing; the core writeup covers the application.

---

# Part I — Narrative & Achievement View

## 1. TL;DR

The `infra` repo is the **Terraform configuration that backs Jemeti's entire AWS production footprint**: 15 reusable modules composing ~103 resource blocks (~9,100 lines of HCL) into one production environment — 4 CloudFront distributions, 3 SvelteKit SSR Lambdas fronted by API Gateway HTTP APIs, one EC2 host running the two Rust binaries, 4 S3 buckets, Route 53 public + private zones, SSM Parameter Store with a customer-managed CMK, SQS, and a CloudWatch→SNS→Sentry alerting pipeline — plus three self-applying GitHub Actions OIDC deploy workflows. Built solo by Dibakar Sutra Dhar in a 92-commit sprint (2026-07-02 → 2026-10-01), it migrated the product off Cloudflare Workers/Tunnel onto AWS mid-project, absorbed a teardown-and-rebuild of the SSR frontend stack within its first three weeks, and turned two production incidents into a **plan-time routing-matrix guard** that fails `terraform plan` on the "valid-but-wrong" config class that caused them.

Ready-to-adapt CV summary sentence:
> *Designed and operated the AWS infrastructure for a multi-tenant SaaS as code: 15 Terraform modules, 4 CloudFront distributions, 3 SSR Lambdas, OIDC-based self-applying CI deploys, and a plan-time routing-matrix guard that fails builds on misconfigurations.*

## 2. The "product" — what this repo provisions

| Layer (module) | What it provisions |
|---|---|
| `networking` | VPC `10.0.0.0/16`, 2 public subnets, IGW. **Deliberately no private subnet, no NAT Gateway, no PrivateLink endpoints** — a recorded architecture decision (README "Networking model") |
| `security_groups` | **One** security group: 8080/8081 open only to the CloudFront origin-facing managed prefix list; port 22 closed; SSH via SSM Session Manager. Collapsed from a previous 4-SG design ("adding a third internal service is now one line" — driven by `internal_service_ports` in `environments/production/main.tf:51-54`) |
| `ecr` | OS + Platform repos + lifecycle policies |
| `compute` | EC2 t4g.small (pinned Ubuntu 24.04 arm64 AMI `ami-090c5beedb164155b`) + EIP; boot script batch-fetches ~20 SSM parameters into `/etc/jemeti/jemeti-secrets.env`; IAM role scoped including a `Route53Write` statement pinned to the hosted-zone ARN so the Platform binary can provision tenant CNAMEs |
| `lambda` + `apigatewayv2` | 3 SSR Lambdas (web 512MB/30s `*.jemeti.app`, admin `platform.jemeti.app`, onboard `jemeti.app`), **no `vpc_config`**, native `handler.handler` from `adapter-node` output (no Lambda Web Adapter, no `run.sh`); Function URLs with AWS_IAM kept wired for instant rollback, but live traffic goes through one API Gateway HTTP API per app |
| `edge` | 4 CloudFront distributions (apex, platform, web, media) with OAC; ACM wildcard cert in us-east-1; CloudFront Function for host routing; S3 maintenance-page fast-fail on 5xx; the **plan-time routing-matrix guard** (`modules/edge/routing_matrix.tf`) |
| `storage` | 4 S3 buckets: `static-assets` (OAC read-only, per-app path prefixes `onboard/`, `admin/`, `web/`), `tenant-uploads` (presigned PUT only; `media.jemeti.app` fronts its public prefix), `lambda-bundles`, `logs` (CloudFront access logs, 90-day lifecycle). The `vehicles` bucket was decommissioned 2026-10-01 (core issue #65) |
| `dns` | Public zone + ALIAS records; private zone `internal.jemeti.app` with per-service A records → EC2 private IP |
| `parameters` | SSM Parameter Store, SecureString under a customer-managed CMK — replaced Secrets Manager (recorded rationale: ~$0/mo vs ~$3.20/mo, one batched `get-parameters` call at boot, same CloudTrail audit) |
| `sqs` | `email`, `provisioning`, `dashboard-invalidations` queues |
| `observability` | CloudWatch alarms (Lambda errors, CF 5xx) → SNS → 80-line Node forwarder Lambda (`forwarder/src/index.js`) → Sentry `capture_message` with alarm-name fingerprinting; severity map ALARM→error / OK→info / INSUFFICIENT_DATA→warning |
| `iam_github_oidc*` (×3) | Three GitHub OIDC roles: `frontend-deploy` (trusts `jemeti/core`@main), `terraform-deploy` (trusts `jemeti/infra`@main **plus** a `repository_dispatch` subject for cross-repo triggers), `crates-deploy` (ECR push, SSM/KMS reads, SSM send-command to the one EC2 instance by resource tag) |

## 3. Architecture (summary level)

One Terraform stack, one environment (`environments/production/`), S3-native-locked remote state (`jemeti-tfstate-prod`, key `core/prod/terraform.tfstate`). Request path: **Browser → CloudFront (4 distributions) → {S3 static assets via OAC | API Gateway → Lambda (SSR) | EC2 :8080/:8081 (Rust)}**, with CloudFront injecting per-app `X-Origin-Secret` headers. The SSR Lambdas are outside the VPC and reach the Rust binaries through CloudFront's public hostnames because the private-zone hostname is unresolvable from Lambda — a decision recorded with its rejected alternative (VPC-attached Lambdas: cold start + NAT cost). Deep detail in Part II.

## 4. The story: how the project evolved

| Epoch | Dates | Theme | Evidence |
|---|---|---|---|
| 0 · Greenfield module build | Jul 2–10 | Initial commit `1c8083f` drops the full module library; **Secrets Manager → SSM swap** (`ad5955c`, rationale rewritten into README); `bootstrap-state.sh` (`0111c93`); operator policy collapsed to two deny statements (`ba0d4da`); SQS module; Sentry DSN wiring (ATR-29) | git log |
| 1 · Deploy identities & network shape | Jul 11–14 | Three OIDC deploy roles; ECR cache repos for BuildKit; EC2 pinned to Ubuntu Noble; **IPv6 dual-stack added then dropped one day later** — `36a401f` (Jul 15, PR #1): "Supabase via session pooler" doesn't do IPv6, so the VPC went back to IPv4-only | `36a401f`, `90ebd49` |
| 2 · SSR R1 cutover & rebuild saga | Jul 15–19 | The densest week. Lambda@Edge removed, CloudFront Functions + per-FQDN distributions land (`ccaad94`, R1 cutover Jul 16); **Jul 17 the whole SvelteKit SSR stack is decommissioned in-state and rebuilt from scratch Jul 18** (v2 lambda module: native adapter-node handler, zip <1.5 MB, no LWA/run.sh); API Gateway HTTP API introduced Jul 19 to fix browser POSTs that OAC-SigV4 Function URLs rejected; maintenance-page fast-fail `826d65e`. ~20 consecutive CI-debug commits on Jul 18 break the **IAM bootstrap trap** (role lacks the perms terraform refresh needs before it can grant them) | `ccaad94`, main.tf removal/reintroduction comments, `docs/RUNBOOKS/ssr-r1-deployment-2026-07-16.md` (581 lines), three Jul-16 runbooks |
| 3 · First-tenant incident hardening | Jul 21–26 | First real tenant (`tokent1`) logs in Jul 25 → every POST returns `404 tenant not found`: CloudFront's `AllViewerExceptHostHeader` strips the viewer Host, OS falls back to the EC2 hostname, tenant resolution fails → `INTERNAL_CALLER_SECRET` wired into the web Lambda (`4ffa592`, documented at `main.tf:147-164`). **Cache policy swapped CachingOptimized → CachingDisabled to prevent cross-tenant data leaks** on SSR responses (`6cf27e1`). Cross-repo DB role-isolation work: `rotate-db-roles.sh` + 4 fix commits (`3964d83`→`c3cc53f`); EC2 16,384-byte user_data limit hit and fixed (`2d285bd`) | `6cf27e1`, `4ffa592`, `.superpowers/sdd/progress.md` |
| 4 · Cleanup | Aug | WAF removed after the legacy distribution's deletion (`2d10fc1`, Aug 5); S3 env for logo rendering (`1273911`); CI smoke test switched to the real `tokent1` tenant (`becb995`) | git log |
| 5 · PR discipline & edge maturity | Sep–Oct | Direct pushes stop; 6 squash-merge PRs (#3–#8). **PR #3 (issue #14): the routing-matrix guard** — after the `/api/vehicles/*` misroute incident (core #8, empty-body 404s in prod, `eceda13`), every CloudFront behavior→origin pair is asserted at plan time. PR #5: `media.jemeti.app` distribution. PR #6: Polar SSM params. PR #7: `TRUST_PROXY_HEADERS` so the OS records the viewer IP, not the SSR hop's. PR #8 (Oct 1): vehicles bucket decommission, API Gateway access logging, CloudWatch agent trimmed to 3 metrics | merge list, `routing_matrix.tf` header |

**Tenure boundary:** first commit `1c8083f` 2026-07-02, last `4accea7` 2026-10-01 (yesterday as of analysis). Unlike `core`, this repo is **still active**. Attribution: 90/92 commits by Dibakar (two identities, same email — 83 + 7); one commit by `jemeti devops <devops@jemeti.app>`.

## 5. The user's contributions in detail

### 5.1 Ownership map

Solo build: 90/92 commits, all directories, including the CI workflows, the forwarder Lambda source, and 2,473 lines of runbooks. The repo self-documents its AI-assisted workflow honestly: `.superpowers/sdd/GROUND-RULES.md` (2026-07-22) establishes two "non-negotiable" rules for the assistant — never add `Co-Authored-By:` trailers ("the user is the sole author of record"), never push to shared branches without explicit permission.

### 5.2 Thematic breakdown

1. **Module library** (Jul 2–10): 15 modules, thin root composition, common-tags/name-prefix conventions throughout.
2. **IAM/OIDC**: three deploy roles with narrowly scoped inline policies; the bootstrap-trap fix pattern (push the inline policy JSON *before* `terraform refresh` — `.github/workflows/terraform-deploy-inline.json` exists because `terraform output` and `terraform console` were evaluated and rejected, per the workflow comments).
3. **SSR cutover & rebuild**: R1 runbook-governed cutover with 24h parallel running; teardown of LWA/run.sh plumbing for native adapter-node handlers (zip <1.5 MB).
4. **Incident-driven hardening**: tenant-resolution 404s → `INTERNAL_CALLER_SECRET`; cross-tenant cache leaks → `CachingDisabled`; outbound vs inbound origin-secret mismatch (2026-07-20, `main.tf:123-132`) → `PLATFORM_ORIGIN_SECRET`; IP attribution → `TRUST_PROXY_HEADERS` (core PR #79).
5. **The routing-matrix guard** (PR #3): see §5.3.
6. **Media edge** (PR #5): `media.jemeti.app` distribution fronting the `tenant-uploads` public prefix, exploiting CloudFront's most-specific-host-match rule over the `*.jemeti.app` wildcard.
7. **Ops tooling**: `bootstrap-state.sh` (idempotent, S3-native locking, no DynamoDB), `bootstrap-parameters.sh`, `rotate-db-roles.sh` (TTY-enforced, two confirmations), `bootstrap-lambda-bundle.sh`.

### 5.3 Signature engineering moments (with the user's own reasoning)

- **Turning a misroute into a compiler error** (`71a1b5f`, PR #3, closes core issue #14). The header comment in `modules/edge/routing_matrix.tf` states the problem precisely: a `/api/vehicles/* → ec2-platform` cache behavior was "only correct on the platform distribution... on the apex distribution it hijacked the workshop SSR's OS vehicle calls... The config was **'valid' — just wrong** — and nothing in CI, plan review, or runtime flagged it." The fix: a single-source-of-truth matrix of every (distribution, path pattern, origin) with a rationale per entry, enforced by `terraform_data` preconditions at **plan** time. The file even records the rejected alternative: "`check` blocks were rejected because they only warn — a misroute must fail the deploy." And it mandates process: matrix and behavior changes "must land in the same PR, with the rationale recorded in the matrix entry."
- **The Secrets Manager → SSM decision** (`ad5955c`, README "Why SSM"): "~$0/month for the parameters (free tier covers our 9 by 100x) vs ~$3.20/mo for Secrets Manager. Both have the same CloudTrail audit trail via KMS. The EC2 boot script does one batched `aws ssm get-parameters --names ... --with-decryption` call instead of one Secrets Manager call per secret." Same session deleted the whole private-subnet/VPC-endpoint/Lambda-extension design (ATR-15/ATR-28 marked Superseded).
- **Breaking the CI bootstrap trap** (Jul 18, ~20 commits in one day): the terraform-deploy OIDC role couldn't refresh state because it lacked permissions that only `terraform apply` could grant it. The workflow now pushes the role's inline policy from a committed JSON file *before* refresh, and targets `module.lambda` on first apply. Every dead end is preserved in commit messages (`7982db8`, `ea497f8`, `51c1e2a`, `28b3c99`).
- **The rollback-ready edge design**: API Gateway replaced Lambda Function URLs for browser POSTs (OAC SigV4 rejected `?<name>` SvelteKit form actions), but the Function-URL origins and `lambda:InvokeFunction` permissions are *kept wired* — "a future rollback is one TF change deep" (`main.tf:833-845`).
- **A 404 that taught the header pipeline**: the `main.tf:147-164` comment narrates the first-tenant login failure end-to-end — CloudFront strips Host, OS falls back to `ec2-13-229-5-208...`, `extract_subdomain` returns None, "404 tenant not found" — and shows the fix (shared SSM secret, two sides) plus its twin (`INTERNAL_WEB_SECRET`, "non-fatal but visible": login page showed the subdomain instead of the workspace brand).

### 5.4 Commit hygiene

Conventional commits with scopes (`fix(edge)`, `feat(parameters)`, `ci(onboard-apply)`, `fix(iam)`); 100% descriptive; the fix commits carry full incident narratives. Message-quality outlier: none — even the CI-debugging chain stays conventional. (Contrast with `core`, where the same session produced two bare `debug:` commits.)

## 6. Engineering practices observed

- **Plan-time assertions over warnings**: preconditions fail the deploy; `terraform test` compositions (Terraform 1.16 mock provider) exercise the detection logic separately via the `edge_routing_violations` output.
- **Runbook culture**: 4 runbooks totalling ~1,500 lines, each a point-in-time sign-off-able document (`ssr-r1-deployment-2026-07-16.md` declares itself "the single source of truth for the R1 deployment sequence").
- **Committed-production-config pattern**: `terraform.tfvars` is committed (config only, no secrets — verified); per-operator drift goes in gitignored `*.override.tfvars`; secrets live exclusively in SSM via `bootstrap-parameters.sh`.
- **README as architecture doc**: 252 lines, includes a failure-modes table and a "hardcoded values to be careful about" section; mostly current (one stale row — see §9).
- **SDD discipline**: `.superpowers/sdd/` holds ground rules, progress tracking, and committed review diffs for the assistant-driven workflow.

## 7. Numbers worth quoting

| Metric | Value | Source |
|---|---|---|
| Commits | 92 (90 by Dibakar), 2026-07-02 → 2026-10-01; 6 PR merges (#3–#8) | `git shortlog -sne HEAD`, `git log --merges` |
| Terraform | 15 modules, 103 resource blocks, ~9,114 lines of `.tf` | `grep -c '^resource '`, `wc -l` |
| Edge | 4 CloudFront distributions; 14-entry asserted routing matrix | `modules/edge/main.tf`, `routing_matrix.tf` |
| Compute | 1 EC2 t4g.small + EIP; 3 Lambdas (512 MB / 30 s / nodejs22.x); 3 API Gateway HTTP APIs | `terraform.tfvars`, `main.tf` |
| Storage | 4 S3 buckets; `logs` retention 90 days | `modules/storage/`, `terraform.tfvars` |
| Secrets | ~20 SSM parameters under 1 customer-managed CMK; 4 per-app origin secrets + 1 shared outbound secret | `main.tf` data blocks, `bootstrap-parameters.sh` |
| CI | 3 self-applying workflows (~960 lines) with 3 scoped OIDC roles | `.github/workflows/` |
| Docs | 4 runbooks, 1,514 lines; README 252 lines with failure-modes table | `docs/RUNBOOKS/` |
| Churn | 20.8k insertions / 6.9k deletions raw — inflated by committed `.terraform.lock.hcl`, `forwarder/build/forwarder.zip`, and `.superpowers/sdd/*.diff` review artifacts; real config+code ≈ 11k lines | `git log --numstat` + file inspection |
| Incidents → controls | ≥4 production incidents each converted into a permanent control (routing guard, CachingDisabled, INTERNAL_CALLER_SECRET, TRUST_PROXY_HEADERS) | git log, runbooks |

## 8. Raw material for derived artifacts

### CV bullet candidates

- Provisioned a multi-tenant SaaS's entire AWS footprint as code — 15 Terraform modules, 4 CloudFront distributions, 3 SSR Lambdas behind API Gateway, and 3 OIDC-scoped self-applying GitHub Actions deploy pipelines.
- Built a plan-time routing-matrix guard that fails `terraform plan` on any CloudFront cache-behavior misroute, converting a production empty-404 incident into a permanent compile-time-style control with per-route rationale.
- Designed a deliberately minimal AWS network (no NAT, no private subnets, no VPC endpoints; Lambdas outside the VPC) with per-app CloudFront origin secrets and SSM Parameter Store under a customer-managed CMK, cutting secrets spend to ~$0/month.
- Diagnosed and fixed a cross-tenant response-caching leak by migrating CloudFront from managed caching to disabled for SSR, and closed an IP-attribution gap via the CloudFront-Viewer-Address header chain.
- Wrote runbook-governed cutovers (SSR R1: 24-hour parallel running, per-step verify/rollback) and three postmortem runbooks for Lambda runtime incidents.

### Blog-post angles

- **"'Valid' but wrong: making CloudFront misroutes a plan-time failure"** — the routing-matrix guard is a genuinely unusual Terraform pattern (`terraform_data` preconditions over `check` blocks, with a testing escape hatch) born from a real incident.
- **"The cheapest AWS architecture that works"** — no NAT, no private subnet, no VPC endpoints, Secrets Manager→SSM at $0/month, Lambdas out of the VPC: every simplification has a recorded *why* and a rejected alternative.
- **"The bootstrap trap: how a deploy role locks itself out"** — an IAM chicken-and-egg incident solved by pushing inline policy JSON before `terraform refresh`, with ~20 preserved debugging commits.
- **"Four incidents, four permanent controls"** — the tenant-404, cache-leak, secret-mismatch, and IP-attribution stories, each ending in config that can't regress.

### LinkedIn headline candidates

- "Turned a production CloudFront misroute into a plan-time guard that fails the deploy — infrastructure as code with a memory."
- "Solo-built the AWS backbone of a SaaS: 15 Terraform modules, OIDC self-applying deploys, zero NAT, ~$0 secrets spend."
- "Infrastructure that learns from incidents: every outage in this SaaS's first quarter became a CI-enforced invariant."

## 9. Caveats for accuracy

- **⚠️ Local-disk credential exposure (not committed):** `state/role-rotation.log` contains a plaintext Supabase database URL **with password**. It is deliberately gitignored (`state/.gitignore`: "Logs that may capture pre-rotation Supabase superuser passwords"), but it sits on local disk and holds the pre-rotation (or possibly current) `postgres.zixczlgeieofqmczrjmz` password for the Supabase session pooler. Recommend: verify the current SSM `jemeti-database-url` differs from the logged value; if not, rotate; and consider having `rotate-db-roles.sh` redact passwords in its rollback log.
- **⚠️ Corrections to the core writeup** (`internal/thegarageos-core-writeup.md`): (1) the **WAF is currently unattached** — removed 2026-08-05 (`2d10fc1`) after the legacy distribution's deletion; the 2000-req/5min rate limit is not active. Part II §16 of that doc and `infra/README.md`'s "WAFv2 web ACL" row both need this caveat. (2) The **`vehicles` S3 bucket was deleted 2026-10-01** — the core writeup's five-bucket inventory is now four. Both postdate the core repo's last commit, which is why they diverge.
- **Generated/artifact inflation:** 20.8k raw insertions include committed `.terraform.lock.hcl`, the built `forwarder/build/forwarder.zip`, and 4 committed review diffs under `.superpowers/sdd/`. Quote ~11k real lines.
- **Stale bits in-repo:** `environments/production/main.tf:27` still lists a `backup` module ("EventBridge + pg_dump") that is not invoked; README's resources table still claims WAFv2 (see above); both conflict with README's own "Backup: None" row. `main.tf` comments reference local absolute paths (`/Users/dibakar/.puku-cli/plans/...`) that won't resolve for other readers.
- **Committed identifiers:** AWS account ID `623577190620`, the EC2's public DNS hostname, and GitHub's public OIDC thumbprint appear in comments/tfvars — normal for IaC but worth knowing before publishing excerpts.
- **Post-tenure:** active through 2026-10-01; no handoff to account for.

---

# Part II — Technical Reference

*Standalone reference extracted from source at analysis date (2026-10-02). Paths relative to repo root. Section numbering continues from Part I. Pair with `internal/thegarageos-core-writeup.md` §10 for the request-path topology from the app side.*

## 10. System topology

```
                              ┌───────────────────── AWS ─────────────────────┐
 Browser ──► Route 53 (public zone jemeti.app)                                │
                │ ALIAS                                                       │
                ▼                                                             │
        CloudFront — 4 distributions (us-east-1 ACM wildcard *.jemeti.app)    │
         ├─ apex    jemeti.app          ├─ web    *.jemeti.app               │
         ├─ platform platform.jemeti.app├─ media  media.jemeti.app            │
         │  each injects X-Origin-Secret (per-app value from SSM)             │
         │                                                                    │
         ├─ /<app>/_app/*, assets → OAC(SigV4) ─► S3 static-assets           │
         │                                     (prefixes onboard/ admin/ web/)│
         ├─ default (SSR) ─► API Gateway HTTP API ($default, AWS_PROXY)      │
         │                     ─► Lambda web/admin/onboard (no VPC,          │
         │                        native adapter-node handler, 512MB/30s)    │
         │                        └─ outbound SSR calls go BACK through CF   │
         │                           public hostnames (can't resolve the     │
         │                           private zone)                           │
         ├─ /api/* families ──► EC2 t4g.small (public subnet, EIP)           │
         │    ec2-os :8080 / ec2-platform :8081                               │
         │    SG ingress = CloudFront origin-facing prefix list only          │
         │    └─ reads /etc/jemeti/jemeti-secrets.env (SSM batch fetch)       │
         ├─ media ──► OAC ─► S3 tenant-uploads (public key prefix only)      │
         └─ 5xx ──► fast-fail to S3 maintenance page                          │
                                                                              │
 SSM Parameter Store (CMK) ◄── boot fetch / CI deploy reads                   │
 SQS email/provisioning/dashboard-invalidations ◄── EC2 containers            │
 CloudWatch alarms ─► SNS ─► forwarder Lambda ─► Sentry                       │
 ECR os/platform ◄── crates-deploy OIDC role (jemeti/core CI)                 │
 S3 jemeti-tfstate-prod (remote state, S3-native lock) ◄── terraform-deploy   │
└──────────────────────────────────────────────────────────────────────────────┘
```

Who talks to what:
- **Lambdas ↔ Rust binaries**: only via CloudFront public hostnames (`PLATFORM_PUBLIC_URL`/`OS_PUBLIC_URL` env on each function, `main.tf:637-638`); the private `internal.jemeti.app` zone is unreachable from Lambda by design.
- **Two distinct origin-secret chains** (`main.tf:116-136`): *inbound* per-app secrets (CloudFront→each Lambda/EC2, `X-Origin-Secret`) and *outbound* shared `PLATFORM_ORIGIN_SECRET` (SSR→Platform authenticated calls). "The two secrets serve different purposes... and intentionally rotate independently" — conflating them was the 2026-07-20 outage of onboard/admin token-preview calls.
- **Tenant resolution chain**: web Lambda sends `X-Internal-Caller: <INTERNAL_CALLER_SECRET>` + `X-Tenant-Subdomain`; OS middleware (`core: crates/os/src/middleware/tenant.rs:50-96`) only honors the override when the header matches SSM's shared value.
- **Cross-repo CI handshake**: `jemeti/core` frontend deploys upload a bundle then fire `onboard-bundle-uploaded` `repository_dispatch`; `jemeti/infra`'s apply workflows consume it — the terraform-deploy role's trust policy includes the dispatch subject explicitly (`main.tf:1016-1020`).

## 11. End-to-end flows

**Flow 1 — SSR request (web):** browser → `*.jemeti.app` (web distribution) → static assets hit the `web/` prefix OAC origin; everything else hits `apigw-web` (API Gateway → Lambda). Lambda validates `X-Origin-Secret` (per-app `ORIGIN_SECRET` env), resolves tenant via the internal-caller chain, and proxies to OS/Platform through CF. **Cache policy is `Managed-CachingDisabled`** for SSR behaviors (`6cf27e1`) — the managed optimized policy cached authenticated responses across tenants.

**Flow 2 — EC2 boot:** user_data (≤16,384 bytes, hand-compressed in `2d285bd`) runs `jemeti-fetch-secrets.sh`: one batched `aws ssm get-parameters --with-decryption --query` with `BeginsWith` filter and NextToken pagination → writes `/etc/jemeti/jemeti-secrets.env` (preserving non-SSM vars, `bd3fe12`) → docker compose starts with `env_file:`. Gotcha: `lifecycle.ignore_changes = [user_data]` means script patches need a one-shot SSM Send-Command to take effect on the running instance (`.superpowers/sdd/progress.md`).

**Flow 3 — Frontend deploy (cross-repo):** `jemeti/core` `{web,admin,onboard}-deploy.yml` builds → uploads `<app>/build.zip` to `lambda-bundles` → dispatches. `infra`'s `{web,admin,onboard}-apply.yml`: (1) `terraform init`; (2) push `terraform-deploy-inline.json` onto the role **before** refresh (bootstrap-trap fix); (3) `terraform apply` (refresh picks up the new bundle object); (4) `aws lambda update-function-code` → wait Active; (5) publish `$LATEST` → flip `live` alias; (6) CloudFront invalidation scoped to the app's distribution; (7) curl smoke test; (8) tail Lambda logs from the smoke window.

**Flow 4 — Crates deploy (from `jemeti/core`):** `crates-deploy` OIDC role → ECR push → SSM `send-command` to the one instance (scoped by resource tag `jemeti-prod-ec2`) running `docker compose pull && up -d`. The runner fetches SSM parameters (KMS decrypt on the CMK required) and SQS queue URLs to inline into the payload.

**Flow 5 — Alerting:** CloudWatch alarm (Lambda errors, CF 5xx) → SNS topic → forwarder Lambda (`forwarder/src/index.js`): parses the SNS-wrapped alarm JSON, maps severity, posts to Sentry's events API with `fingerprint: ['cw-alarm', <name>]` so state flips collapse into one issue; errors bubble up so SNS redrive handles poison messages.

**Flow 6 — DB role rotation (operator-run):** `scripts/rotate-db-roles.sh` — enforces TTY, two confirmations, logs **pre-rotation SSM values** to `state/role-rotation.log` (gitignored) for rollback, rotates `jemeti_app`/`jemeti_mv` passwords via psql bound variables (`--set=p_app=...`; `:'var'` interpolation silently fails in `--command` mode — `2b08f9e`), writes URL-safe creds to SSM with a parse gate (`ed5b3ef`).

## 12. State & parameters ("data model")

**Terraform state:** S3 backend, bucket `jemeti-tfstate-prod` (versioned, AES256, all public access blocked; created by idempotent `scripts/bootstrap-state.sh`), key `core/prod/terraform.tfstate`, **native S3 locking** (`use_lockfile = true` — no DynamoDB; a legacy LockID-table path is documented in README for compatibility). First apply expects "hundreds of resources."

**SSM parameter inventory** (`var.parameters_to_create`, ~20 names, all SecureString under CMK alias `alias/jemeti-prod-ssm-parameters`): DB URLs (`jemeti-database-url`, `jemeti-migrate-database-url`, `jemeti-mv-database-url`), JWT secrets (`OS_JWT_SECRET`, `PLATFORM_JWT_SECRET`), origin secrets (4 per-app + shared `jemeti-origin-secret`), internal secrets (`jemeti-internal-caller-secret`, `jemeti-internal-web-secret`), payment (`STRIPE_*`, `SSLCZ_*`, Polar per PR #6), `RESEND_API_KEY`, S3 coordinates (`jemeti-s3-tenant-assets-bucket`, `jemeti-s3-public-base-url`), `SENTRY_DSN_*`, `SENTRY_FORWARDER_TOKEN`. The `parameters` module creates String-type entries; SecureString values are upserted by `bootstrap-parameters.sh` (never in tfvars).

**Secret design invariant:** one origin secret per app "keeps the blast radius small: a leak from one app's logs doesn't compromise the others" (`main.tf:82`); the shared outbound secret exists because the Platform binary is a single authority that can't know which app is calling.

## 13. Edge routing reference

The asserted matrix (`modules/edge/routing_matrix.tf`), condensed — every entry carries a rationale in-source:

| Distribution | Path pattern | Origin | Why |
|---|---|---|---|
| apex / platform / web | `/api/webhooks/*` | `ec2-platform` | Signed webhook payloads are Platform's |
| apex / platform / web | `/api/public/*` | `ec2-platform` | Public APIs must not enter OS tenant middleware |
| platform | `/api/auth/*` | `ec2-platform` | Admin login is Platform's super_admin auth; OS :8080 rejects those credentials |
| apex / platform / web | `/api/platform/v1/*` | `ec2-platform` | Versioned control plane |
| apex | `/api/*` | `ec2-os` | Catch-all is OS; **a `vehicles→platform` alias here was the core#8 misroute — "Do not add one"** |
| platform | `/api/*` | `ec2-os` | Catch-all; platform namespaces above |
| platform | `/api/admin/*` | `apigw-admin` | Admin's SSE/fetch proxies exist only on the Lambda |
| web | `/api/*` | `apigw-web` | OS middleware rejects browser-direct requests (no Host, no X-Tenant-Subdomain); workshop SSR's OS calls go out via apex |

Other edge constants: maintenance fast-fail on 5xx → S3 per-app pages (`826d65e`); `tenant_cname_ttl` 300 normally, lowered to 60 for 24h around DNS cutover (README "Cutover"); logs bucket lifecycle 90 days; ACM + WAF pinned to us-east-1 via the `aws.us_east_1` provider alias.

## 14. The guard algorithm

`local.edge_routing_matrix` (source of truth, `gated_on` mirrors the `for_each` gates in main.tf so unrendered behaviors are skipped, not failed) → `edge_actual_routing` (read straight off the planned distribution resources, so the guard sees *new* config) → one `terraform_data` per entry with a `lifecycle.precondition` whose error message names the distribution, path, expected origin, rationale, and remediation (update matrix in the same PR, review the runbook, re-run the E2E smoke suite). `routing_matrix_guard_enabled` exists **only** for `terraform test` compositions, which assert on the `edge_routing_violations` output instead (tested against Terraform 1.16's mock provider — `54f25fb`). Design notes recorded in-source: `check` blocks rejected (warn-only); plan-time so it gates every apply including CI.

## 15. External services

Sentry (events API, project-scoped token — "the events API does not accept org-level tokens", `forwarder/src/index.js:16-18`); Supabase (session pooler — the reason for IPv4-only VPC and `network_mode: host` in the core repo's compose); GitHub OIDC (thumbprint pinned `6938fd4d…`); AWS services: Route 53, CloudFront, WAF (unattached since Aug 5), ACM, API Gateway v2, Lambda, EC2/SSM/SSM-Messages, ECR, S3, SQS, SNS, CloudWatch, KMS, IAM/OIDC, Systems Manager Session Manager for operator access.

## 16. IAM & auth reference

| Principal | Trust | Grants (essence) |
|---|---|---|
| `frontend-deploy` OIDC role | `jemeti/core`@main, env `production` | S3 static/bundles, `lambda:UpdateFunctionConfiguration`, CF invalidation on all 4 distribution ARNs (the platform ARN was missing once — `main.tf:966-977` narrates the fix), SSM/KMS reads |
| `terraform-deploy` OIDC role | `jemeti/infra`@main **+** `repository_dispatch:onboard-bundle-uploaded` | State bucket R/W, lambda publish/alias, KMS decrypt for SSM refresh, s3:GetObject on bundles; explicitly **no** EC2/SSM/ECR ("strictly a state-management role") |
| `crates-deploy` OIDC role | `jemeti/core`@main | ECR push (per-repo statements), SSM send-command scoped to the instance Name tag, SSM/KMS/SQS reads for the env payload |
| EC2 instance role | — | SSM Session Manager + batched SSM reads + `Route53Write` scoped to the exact hosted-zone ARN (tenant CNAME provisioning only) |
| Per-function Lambda roles | — | Logs, own bundle read, own static-assets prefix, own origin-secret read — "no tenant-uploads presign perms (those live with EC2)" (`modules/lambda/main.tf:24`) |
| Operator | — | `iam/operator-policy.json` "collapsed to two deny statements" over an allow-all (`ba0d4da`) |

Request auth on the app path (six layers) is documented in the core writeup §16; the infra-side counterparts are the per-app `ORIGIN_SECRET` injections (edge `custom_header` blocks) and the `try(data.aws_ssm_parameter...)` first-apply pattern: before `bootstrap-parameters.sh` runs, the secret resolves to `""` and the Lambda **rejects all requests** — "acceptable cold-start pain" (`main.tf:486-494`).

## 17. Scheduling & queues

No cron inside this repo except the event-driven workflows (push / `repository_dispatch`). Queues provisioned: `email`, `provisioning`, `dashboard-invalidations` (required by the OS binary — it fails closed without it). Alarms: Lambda errors + CF 5xx → SNS; CloudWatch agent on EC2 trimmed to 3 metrics (`10c8674`, Oct 1). The `backup` module named in `main.tf`'s header comment is **not invoked**; Postgres backup is Supabase's (managed daily + PITR).

## 18. Deployment topology & secrets handling

- **Environments:** one (`production`); README documents the copy-to-staging recipe. Providers: primary `ap-southeast-1` + `aws.us_east_1` alias (ACM/WAF hard requirement). Region is validated in `variables.tf`.
- **State safety:** plan before apply recommended ("skim for resources you didn't expect — especially WAFv2 in us-east-1"); destroy documented with `force_destroy` caveats.
- **Secrets flow:** operator → `bootstrap-parameters.sh` (CMK-encrypted puts) → three consumers: EC2 boot batch-fetch, CI runners (with KMS decrypt grants), Terraform data blocks (sensitive, flow into CF `custom_header` and Lambda env — Lambda env vars are KMS-encrypted at rest, a tradeoff argued in `main.tf:651-665`).
- **AMI pinning:** `ec2_ami_id` pinned (2026-06-26 Noble arm64); `ec2_key_pair_name` left empty → **no SSH key exists**; access is SSM Session Manager only.

## 19. Operational gotchas & key file map

**Gotchas:**
1. **Cross-tenant caching**: never re-enable managed caching on SSR behaviors — `CachingOptimized` served one tenant's authenticated HTML to another (`6cf27e1`).
2. **Host header is stripped** behind CloudFront (`AllViewerExceptHostHeader`): anything deriving tenant from Host gets the EC2 hostname; the internal-caller chain exists to replace it.
3. **Two origin secrets, not one**: per-app inbound vs shared outbound `PLATFORM_ORIGIN_SECRET` — mixing them fails Platform's `require_origin_secret` silently.
4. **SSM filter options**: `StartsWith` is invalid (`InvalidFilterOption`); `BeginsWith` is correct — and the failure was masked by `2>/dev/null || true`, truncating the secrets env file. Don't swallow errors in boot scripts.
5. **EC2 user_data ≤16,384 bytes** and `lifecycle.ignore_changes = [user_data]`: script patches need SSM Send-Command, not re-apply.
6. **psql `:'var'` doesn't interpolate in `--command` mode** — rotate-db-roles initially set passwords that didn't match what went to SSM (`3d5b724` body).
7. **API Gateway integrates the unqualified function ARN, not `:live`** — CI updates `$LATEST` in place, so the alias flip is only for rollback (`main.tf:910-916`).
8. **WAF is unattached since 2026-08-05** — reintroduce `waf_enabled` + reattach before relying on edge rate limiting.
9. **First-apply secret dance**: origin secrets resolve to `""` until `bootstrap-parameters.sh` + a second apply; Lambdas reject everything in between.
10. **`terraform output`/`console` rejected in CI** — fragile (TTY, init-required); the committed inline-policy JSON is deliberate.
11. **Local absolute paths** in `main.tf` comments (`/Users/dibakar/...`) — plan-file references that don't travel.

**Key file map:**

| Topic | File |
|---|---|
| Composition & secret wiring (with incident narratives) | `environments/production/main.tf` |
| Routing matrix + plan-time guard | `modules/edge/routing_matrix.tf`; runbook `docs/RUNBOOKS/edge-routing-matrix.md` |
| Architecture decisions & failure modes | `README.md` (incl. failure-modes table) |
| Lambda design rationale | `modules/lambda/main.tf` header |
| Cross-repo CI bootstrap-trap fix | `.github/workflows/{web,admin,onboard}-apply.yml` + `terraform-deploy-inline.json` |
| SSR cutover saga | `docs/RUNBOOKS/ssr-r1-deployment-2026-07-16.md` (+ the two Jul-16 Lambda runbooks) |
| Alarm forwarding | `forwarder/src/index.js`; `modules/observability/` |
| DB role rotation | `scripts/rotate-db-roles.sh`; `state/.gitignore` (why logs are ignored); `.superpowers/sdd/progress.md` |
| Bootstrap | `scripts/bootstrap-state.sh`, `bootstrap-parameters.sh`, `bootstrap-lambda-bundle.sh` |
| AI-workflow ground rules | `.superpowers/sdd/GROUND-RULES.md` |

*End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially — note this repo was still receiving commits one day before analysis.*
