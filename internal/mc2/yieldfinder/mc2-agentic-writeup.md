# MC2 Agentic — Codebase Writeup

> **Internal document — not for publication.**
> Repo: `mcsquaredfi/mc2.agentic` (local: `~/Downloads/Projects/mc2/mc2.agentic`)
> Analysis date: 2026-10-02 · 33 commits on `main` · 2025-06-18 → 2025-09-16
> Purpose: source of truth for deriving CV bullets, LinkedIn material, and blog posts. Scope: whole project with attribution (Dibakar Sutra Dhar = primary author / employee at MC² Finance; naming the company is approved). **Unlike its successor repo, here the user is the main author.**
> Companion document: [mc2-agentic2-writeup.md](./mc2-agentic2-writeup.md) covers the successor repo (`mc2ventures/mc2.agentic2`, Sept–Oct 2025).

---

# Part I — Narrative & Achievement View

## 1. TL;DR

MC² Agentic is **"Albert" — the AI crypto-analysis assistant for MC² Finance's DeFi Terminal** (mc2.fi): a Cloudflare Workers chat agent (Durable Object per session, gpt-4o via Cloudflare AI Gateway) that analyzes tokens and wallets through MC²'s internal APIs, searches a Typesense token database with LLM-generated structured queries, and optionally connects to a remote MCP server for DeFi vault/yield tools. After a June scaffold by Christoph Richter (from Cloudflare's `agents-starter`), **Dibakar Sutra Dhar built essentially the entire product over six weeks (Aug 6 – Sep 16, 2025): 29 of 33 commits, ~2,250 net-new hand-written lines (+2,247/−1,881 excluding generated files), including a full in-app MCP server (later deliberately removed), four production tools, the Albert system prompt, and the GitHub Actions deploy pipeline.** The repo's successor, `mc2.agentic2`, rearchitected this into a multi-tenant platform — making this repo the founding codebase of MC²'s AI assistant line.

Ready-to-adapt CV summary sentence: _Built the production AI chat agent for a DeFi analytics platform on Cloudflare Workers — Durable Object agent architecture, OpenAI via AI Gateway, LLM-generated structured search queries against Typesense, resilient optional MCP tool integration, and CI/CD to production — as primary author (29 commits over 6 weeks)._

## 2. The product

**What it is:** an embedded chat assistant ("Albert", an Einstein-themed Swiss-scientist persona) in the MC² Finance DeFi Terminal. Users ask about tokens, wallets, portfolios, and DeFi vaults; the agent answers by calling MC²'s own backend APIs and a Typesense search index, optionally extended by remote MCP tools.

**Target users:** mc2.fi traders and investors, beginner to advanced.

**Feature table:**

| Feature                                                                | What it does                                                                                                                                                                        | Status                                                 |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Chat agent on Durable Objects                                          | One `Chat` DO per browser session (localStorage UUID); WebSocket streaming via the `agents` SDK; history persisted in per-DO SQLite                                                 | **Live**                                               |
| 4 internal tools                                                       | `searchTokenTool` (token analysis), `searchAddressTool` (address analysis), `generalSearchTool` (MC² feeds search), `tokensSearchTool` (structured Typesense query)                 | **Live** (`src/agents/mc2fi-agent.ts:30-74`)           |
| LLM-generated token search                                             | Model compiles a Zod-typed query (chain, marketcap, liquidity, authenticity_score, holders, …) into a Typesense `filter_by` string; results deep-linked to `app.mc2.fi/tokens/{id}` | **Live** (`src/agents/apis/tokensSearch.ts`)           |
| MCP client integration                                                 | Optional, non-blocking connection to `${MCP_HOST}/sse`; remote tools merged over local tools; degrades gracefully when absent                                                       | **Live** (`mc2fi-agent.ts:87-135`)                     |
| In-app MCP server                                                      | Full MCP server (tools/resources/prompts, session management, HistoryManager/PreferenceManager)                                                                                     | **Built Aug 6–12, removed Aug 28** (868 lines deleted) |
| "Albert" system prompt                                                 | Persona + tool-routing rules + vault/yield capabilities + risk-assessment rules                                                                                                     | **Live, iterated to the last commit**                  |
| Amplitude analytics                                                    | `chat_message` event per user message, userId = session                                                                                                                             | **Live** (from Christoph's June commit)                |
| CI/CD                                                                  | GitHub Actions → `wrangler deploy` to Cloudflare on push to main                                                                                                                    | **Live** (user-authored)                               |
| Agentic network (multi-agent RPC, feedback scoring, prompt versioning) | `AbstractBaseAgent` + 8-table schema + specs                                                                                                                                        | **Designed + implemented, never wired in** (dead code) |

## 3. Architecture (summary level)

- **Runtime:** single Cloudflare Worker (`src/server.ts`, 29 LOC) exporting `class Chat extends Mc2fiChatAgent`; one SQLite-backed Durable Object binding. No KV/D1/AI/Vectorize bindings despite the specs imagining them.
- **Size:** 47 files in `src/`, **3,517 LOC** of TS/TSX. Backend core: `src/agents/mc2fi-agent.ts` (181), `src/agents/apis/*` (~450), `src/agents/base-agent.ts` (474, dead). Frontend: `src/app.tsx` (411) + ~1,100 LOC of shadcn-style components.
- **LLM:** OpenAI `gpt-4o-2024-11-20` through a **hardcoded Cloudflare AI Gateway URL** (`src/agents/mc2fi-agent.ts:19-24`), agentic loop capped at `maxSteps: 10`.
- **Data:** per-session chat history via the `agents` SDK's DO SQLite; two localStorage keys client-side; no other persistence.
- **The signature design decision:** the repo started as both an MCP **server** and client, then pivoted (Aug 28) to client-only with a non-blocking optional connection — remote vault tools merge over the four local tools, and the agent works fully when MCP is down or unset.

Deep detail in Part II.

## 4. The story: how the project evolved

| Epoch                | Dates           | Theme                                                                                                                                                                                                                                               | Author    |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| A. Scaffold          | Jun 18–21, 2025 | Cloudflare `agents-starter` scaffold (+64K lines incl. build artifacts, all 3 lockfiles), Amplitude tracking (`b702c54`); then a 6-week gap                                                                                                         | Christoph |
| B. MCP server era    | Aug 6           | Dibakar's first day: 6 commits — new deps, worker renamed `mc2-mcp-server`, and the standalone **512-line MC² MCP server** (`3badab5`) with session management                                                                                      | Dibakar   |
| C. Specs             | Aug 7           | +809 lines of Claude-drafted multi-agent specs (`30f1ccc`) — Christoph's last commit on main                                                                                                                                                        | Christoph |
| D. MCP agent day     | Aug 12          | 9 commits in 3 minutes of wall-clock: in-agent `Mc2fiMCPAgent` (`60647ea`), tools/resources/prompts (`3f15676`, `531321e`, `a9fff7a`), HistoryManager + PreferenceManager (`28cc9cf`) — and deletion of the 6-day-old standalone server (`708218c`) | Dibakar   |
| E. The pivot         | Aug 28          | **MCP server half removed** (`5a14a40`, 868 deletions incl. HistoryManager/PreferenceManager); `Mc2fiChatAgent` gains optional MCP-client connection (`e095be6`)                                                                                    | Dibakar   |
| F. Infra day         | Sep 5           | 10 commits: staging → main **PR #1** (carries all 19 prior commits, +3,496/−1,869), GitHub Actions deploy (`ddd8696`), AsyncLocalStorage context extracted (`09af9c9`), non-blocking MCP (`bbae9e4`), wrangler 4.34                                 | Dibakar   |
| G. Prompt refinement | Sep 11–16       | DeFi analysis clarity + **vault filtering & risk assessment rules** (`4816081`, `2f7d959`) — last commit on main                                                                                                                                    | Dibakar   |

**Dibakar's tenure:** first commit `3b1b42f` (2025-08-06 16:35 +0600), last `2f7d959` (2025-09-16). **What happened after:** Christoph's follow-up work (Sept 16–23, e.g. "feat(generativeUI)", "fix sse and mcp connection") went to the `origin/generic-chat` branch, not main — and the whole architecture was then superseded by `mc2.agentic2` (sibling repo, see companion writeup), which adopted AI SDK v5, per-client Durable Objects, and the hard-won MCP schema/truncation fixes. The Aug–Sep arc here — build MCP server → move it into the agent → delete the server half and go client-only — is the direct ancestor of that successor's design.

Two full build-and-remove cycles in 22 days (Aug 6 server deleted Aug 12; Aug 12 managers deleted Aug 28) read as churn, but the commit trail shows deliberate architecture convergence: each removal shrank the surface toward "one chat agent + optional remote tools," which is exactly the shape that survived into `mc2.agentic2`.

## 5. The user's contributions in detail

### Ownership map

29 of 33 commits; 44 unique paths touched; **primary author of everything except the June scaffold, Amplitude wiring, and the Aug 7 spec files** (Christoph). Dominant files: `package.json` ×6, `src/agents/mc2fi-agent.ts` ×5, `wrangler.jsonc` ×4, `src/server.ts` / `system-prompt.ts` / `types.ts` / `deploy.yml` ×3 each. Created from scratch: the entire `src/mcp/**` tree (now removed), `src/agents/system-prompt.ts`, `src/agents/context.ts`, `.github/workflows/deploy.yml`.

### Thematic breakdown (all 29 commits grouped)

**Theme 1 — Standalone MCP server (Aug 6).** `3badab5` (512 lines): MC² MCP server with session management, analysis tools, resource registration; `12f728c` Chat-class fetch handler; entry-point/worker renames (`3daf45b`). Superseded within 6 days.

**Theme 2 — In-agent MCP server with state (Aug 12).** `Mc2fiMCPAgent extends McpAgent` (`60647ea`); MCP tools incl. `advanced-token-search` and `personalized-recommendations` (`3f15676`, 205 lines); MCP resources for session state, analysis history, user preferences (`531321e`); system/token-analysis prompts (`a9fff7a`); **HistoryManager** (50-entry history cap, last-10 context assembly) and **PreferenceManager** (learns risk tolerance from marketcap thresholds: min >$1B → "low", max <$100M → "high"; remembers last-5 preferred chains) (`28cc9cf`).

**Theme 3 — The pivot to client-only (Aug 28).** Deleted the server half (`5a14a40`, −868); wired `MCPClientManager` into `Mc2fiChatAgent` as an optional tool source (`e095be6`); improved token-search filter descriptions (`3bf3843`).

**Theme 4 — Resilience & context engineering (Sep 5).** Non-blocking, error-tolerant MCP connection — connect in background on `onStart`, guard with `mcpConnected`, flip off on tool-fetch failure (`bbae9e4` + `e095be6`, verified in source at `mc2fi-agent.ts:87-135`); `AsyncLocalStorage` extracted to `src/agents/context.ts` so tools can reach the agent without prop-drilling (`09af8c9`); system prompt integrated (`b3aaa44`).

**Theme 5 — Delivery infrastructure (Sep 5).** GitHub Actions deploy workflow: push-to-main → pnpm 10/Node 23 → typegen → build → `wrangler-action@v3` with `CLOUDFLARE_API_TOKEN` (`ddd8696`, fixed same evening in `1c81775`/`a5a7d46`); wrangler upgraded (`d810e31`); all prior work merged to main via PR #1 (`f425ad8`).

**Theme 6 — Domain prompt engineering (Sep 11–16).** Refined the Albert prompt: tool-routing rules per query type, DeFi analysis clarity (`4816081`), vault filtering + risk-assessment instructions incl. the "higher scores = lower risk" rule for `getVaultsByRiskScore` and the 2-week stable-APY lookback (`2f7d959`).

**Plus housekeeping:** dependency/quote/formatting hygiene commits (`4a3e4e0`, `aa0396e`, `6d500c4`, `1a08589`, `91d6e46`).

**Line accounting:** +5,521/−2,796 raw; **+2,247/−1,881 excluding generated files** — `worker-configuration.d.ts` (+2,474/−775) and `pnpm-lock.yaml` (+800/−140) account for ~59% of raw insertions. The June scaffold (Christoph) had committed 37K lines of build output and a SQLite blob, which the user gitignored on day one (`91d6e46`).

### Signature engineering moments

1. **The MCP server→client pivot.** Built a complete standalone MCP server (512 lines: sessions, tools, resources, prompts), folded it into the agent as `Mc2fiMCPAgent` a week later, then deleted the server half entirely and kept only the client — with the user-facing rationale visible in commit messages ("remove unused MCP configuration files and scripts to streamline the project"). The learned lesson (don't host tools in the chat app; connect out) directly shaped `mc2.agentic2`.
2. **Graceful-degradation MCP integration.** The connection is fire-and-forget on DO start (`onStart` does not await it), tool-fetch failures flip `mcpConnected` off instead of throwing, and every user message logs a `chat_message` Amplitude event with the session as userId — the agent never hard-fails because an external tool server is down. Commit `bbae9e4`'s title is the design: "make MCP connection fully asynchronous and non-blocking."
3. **Compiling LLM intent into search filters.** `tokensSearchTool` gives the model a Zod schema (14 filter dimensions, 10 sort fields) and the code compiles the model's structured output into a Typesense `filter_by` string (e.g. `marketcap:>=1000000 && stablecoin:=true`), capped at 10 results, deep-linked to the product UI — a clean "LLM as query planner" pattern with typed guardrails.
4. **Domain prompt as product spec.** The last three commits of the user's tenure are all system-prompt iterations: routing rules ("DO NOT use tokensSearchTool for vault searches"), capability declarations for MCP-provided vault tools, and the risk-communication ruleset (always state risks, the 🥵→💪💪💪 strength scale for numbers, no investment advice without disclaimers).
5. **Greenfield infra ownership.** CI/CD, wrangler config, dependency upgrades, code hygiene — the deploy pipeline the team still used at repo freeze was built and debugged in one evening.

### Commit hygiene

29/29 commits use Conventional Commits with scopes (`feat(mcp)`, `refactor(agent)`, `fix(deploy)`) and descriptive multi-clause subjects — against a primary-author baseline of informal messages in the sibling repo. One PR (`#1` from `staging`) carried the first three weeks of work to main.

## 6. Engineering practices observed

- **Testing:** one smoke test (`tests/index.test.ts`, 26 LOC — Worker 404). CI has **no test/lint/type gates** before deploy (only typegen + build) — `pnpm run check` exists but is manual.
- **Docs:** the README was never updated from the upstream starter template; the four `spec*.md` files are aspirational AI-drafted designs (three by Christoph, later deleted by PR #1). The living spec is `src/agents/system-prompt.ts` itself.
- **Recorded tech debt (honest inventory):** `src/agents/base-agent.ts` (474 LOC) + `migrations.sql` (8 tables) implement a full multi-agent subsystem (RPC, feedback points, prompt versioning, DO alarms) that the live agent never extends — it references bindings (`AGENT_DO`, `DB`, `VECTORIZE_INDEX`) absent from `wrangler.jsonc`. `src/tools.ts` is starter residue and broken (imports `agentContext` from a module that no longer exports it). `src/lib/langsmith.ts` is complete but orphaned. Unused deps: `@cloudflare/workers-oauth-provider`, `workers-mcp`, `@langchain/*`. Three parallel lockfiles. No auth of any kind.

## 7. Numbers worth quoting

| Metric                           | Value                                                                              | Source / how to reproduce                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| User's share of commits          | 29 of 33 on main (Aug 6 – Sep 16, 2025)                                            | `git shortlog -sne HEAD` (merge the "Dibakar"/"Dibakar Sutra Dhar" identities — same email) |
| User's diff, hand-written code   | +2,247 / −1,881                                                                    | numstat excluding `pnpm-lock.yaml`, `worker-configuration.d.ts`, lockfiles                  |
| User's diff, raw                 | +5,521 / −2,796 (59% generated-file inflation)                                     | numstat; generated = wrangler typegen + lockfile                                            |
| Codebase size                    | 47 files, 3,517 TS/TSX LOC in `src/`                                               | `find src -type f \( -name "*.ts" -o -name "*.tsx" \) \| xargs wc -l`                       |
| Largest single artifact          | 512-line MCP server (built Aug 6, deleted Aug 12)                                  | `3badab5`, `708218c`                                                                        |
| MCP server code removed in pivot | 868 lines across 11 files                                                          | `5a14a40`                                                                                   |
| Production tools                 | 4 local + N remote MCP tools                                                       | `src/agents/mc2fi-agent.ts:30-74`                                                           |
| Token-search query schema        | 14 filter dimensions, 10 sort fields, 10 results/page                              | `src/agents/apis/tokensSearch.ts`                                                           |
| Agentic loop                     | `maxSteps: 10`                                                                     | `mc2fi-agent.ts:170`                                                                        |
| LLM                              | `gpt-4o-2024-11-20` via Cloudflare AI Gateway                                      | `mc2fi-agent.ts:19-24`                                                                      |
| Learned-preference thresholds    | marketcap >$1B → low risk; <$100M → high risk; last-5 chains; 50-entry history cap | `preference-manager.ts` at `5a14a40^` (removed code, git history only)                      |
| PR #1 (staging→main)             | +3,496/−1,869, carried 19 commits                                                  | `f425ad8`                                                                                   |

## 8. Raw material for derived artifacts

### CV bullet candidates

- Built and shipped "Albert," the production AI chat agent for MC² Finance's DeFi Terminal, on Cloudflare Workers + Durable Objects — primary author (29 of 33 commits over six weeks), from architecture through CI/CD.
- Designed a resilient MCP tool-integration layer for a Durable Object chat agent: non-blocking background connection, connection-state guards, remote tools merged over local tools, full functionality when MCP is unavailable.
- Implemented an LLM-as-query-planner search pipeline: Zod-typed query schemas the model fills in, compiled into Typesense filter expressions across 14 dimensions (marketcap, liquidity, authenticity score, holders), with result deep-links into the product.
- Pivoted the product's tool architecture from an in-app MCP server (512 lines) to a client-only integration, cutting 868 lines and simplifying the runtime to one Durable Object class.
- Authored the domain system prompt for a DeFi analysis assistant: tool-routing rules, vault filtering and risk-assessment criteria, and a risk-communication format (strength-scale emoticons, mandatory disclaimers).
- Built the deployment pipeline (GitHub Actions → wrangler → Cloudflare Workers) and repo hygiene (typegen, formatting, dependency upgrades) for a production AI service.

### Blog-post angles

1. **"I built an MCP server, then deleted it six days later"** — the full build→fold→delete arc is reconstructible commit-by-commit, including the removed PreferenceManager's risk-inference thresholds; a genuinely useful "what I learned about where MCP belongs" story.
2. **"Your LLM is a query planner: compiling model intent into Typesense filters"** — the `tokensSearchTool` pipeline is a reusable pattern with real code to show.
3. **"Non-blocking MCP connections in Durable Objects"** — the graceful-degradation pattern (`onStart` fire-and-forget, `mcpConnected` guards) with the failure modes it prevents.
4. **"Designing an agentic network before the runtime was ready"** — the honest story of the 474-line `AbstractBaseAgent`, 8-table schema, and multi-agent specs that shipped as dead code; a good "architecture ahead of product" post-mortem.

### LinkedIn headline candidates

- "Built the AI chat agent for MC² Finance's DeFi Terminal — Cloudflare Workers, Durable Objects, MCP, GPT-4o via AI Gateway."
- "Software engineer — AI agents & infrastructure: primary author of a production DeFi assistant on Cloudflare's Agents platform."

## 9. Caveats for accuracy

- **This repo is the user's to claim** — but scope honestly: the June scaffold, Amplitude wiring, and Aug 7 spec files are Christoph's; the user's own first commit is Aug 6. Don't claim the `agents` SDK or `agents-starter` itself.
- **Dead code is dead:** the multi-agent subsystem (`base-agent.ts`, `migrations.sql`, specs), LangSmith helper, OAuth provider, and `workers-mcp` were never live. Never present them as running production systems — at most as "designed and prototyped."
- **The MCP server no longer exists in the codebase** — everything about it (tools, resources, HistoryManager/PreferenceManager, risk thresholds) is recoverable only from git history (`5a14a40^`). Verify against `git show`, not the working tree.
- **Generated-file inflation:** quote +2,247/−1,881, not +5,521/−2,796.
- **No authentication exists** — the OAuth-provider dependency was never imported. Don't imply auth/security work.
- **Hardcoded internals in source:** staging API URLs (`tokenadmin-staging.chris-9e6.workers.dev`, `staging.api.mc2.fi`) and a Cloudflare AI Gateway account ID are committed in `mc2fi-agent.ts`/`mc2Api.ts`; the Typesense default key is the placeholder `"xyz"`. Secrets scan of full history came back clean (no real keys committed).
- **README is the untouched upstream template** — never cite it as product documentation.
- **Post-tenure:** after Sep 16 the user made no further commits to main; Christoph's Sept work went to `generic-chat`, and `mc2.agentic2` superseded the architecture. Say "later rearchitected," not "evolved into," without checking the companion writeup.
- **Latent bug worth knowing before deep-diving publicly:** `TokensSearchAPI` passes a full URL host into a client that builds `https://{cluster}.a1.typesense.net:443` — works only with correct env config; the defaults are internally inconsistent.

---

# Part II — Technical Reference

Purpose: standalone reference extracted from source at analysis date (2026-10-02), so future work never requires re-reading the codebase. File paths relative to repo root. Note: several subsystems described here exist only in git history and are marked as such.

## 10. System topology

```
Browser (React 19 SPA, src/app.tsx, 411 LOC)
  │  useAgent({ agent: "chat", name: <localStorage UUID> }) — WebSocket via agents SDK
  ▼
Cloudflare Worker "mc2-agent" (src/server.ts)
  │  routeAgentRequest()  [agents ^0.0.95]
  ▼
Chat Durable Object (SQLite class, per-session)  =  Mc2fiChatAgent (src/agents/mc2fi-agent.ts)
  ├─ streamText() → OpenAI gpt-4o-2024-11-20
  │      via hardcoded AI Gateway: gateway.ai.cloudflare.com/v1/9e6fbc31…/agents2/openai
  ├─ 4 local tools → MC² backend APIs + Typesense
  │      (mc2Api.ts · tokensSearch.ts → typesense.ts)
  ├─ MCPClientManager("MC2FI-MCP") → ${MCP_HOST}/sse  (optional, non-blocking)
  ├─ Amplitude (chat_message per user message)
  └─ ALS context (src/agents/context.ts) exposes the DO to tool code
```

Who talks to what: the browser talks only to `/agents/chat/{session}`; only the DO calls OpenAI/MC² APIs/Typesense/Amplitude/MCP; no other runtime exists. The removed in-app MCP server (`Mc2fiMCPAgent`, git-only) once exposed SSE + `/mcp` endpoints from the same Worker.

## 11. End-to-end data flows

**Flow 1 — Chat message → streamed answer**

1. `app.tsx:31-39`: session UUID generated once, persisted in localStorage; `useAgentChat({ agent, maxSteps: 5 })` drives the UI.
2. `server.ts:16-29`: 500 with setup instructions if `OPENAI_API_KEY` unset; else `routeAgentRequest` → `Chat` DO named by session id.
3. `AIChatAgent` (agents SDK) loads history from per-DO SQLite, invokes `Mc2fiChatAgent.onChatMessage` (`mc2fi-agent.ts:117-178`).
4. New `TokensSearchAPI(env)` per request; tools = `{ ...baseTools, ...mcpTools }` (remote merged last, can shadow local); Amplitude `chat_message` logged.
5. Wrapped in `agentContext.run(this, ...)`; `streamText({ model: gateway gpt-4o, maxSteps: 10 })` → `createDataStreamResponse` → WebSocket.
6. On finish, the SDK persists the exchange into the DO's SQLite message table.

**Flow 2 — MCP connection lifecycle** (`mc2fi-agent.ts:87-135`)
`onStart` → if `MCP_HOST` set, `initializeMCP()` fired without await → `connect(${MCP_HOST}/sse)` sets `mcpConnected = true`, failures warn + flag false. Per message: `mcp.unstable_getAITools()` in try/catch; any throw flips `mcpConnected = false` permanently (until DO restart). No `MCP_HOST` → runs with 4 local tools only.

**Flow 3 — Structured token search**

1. Model fills `searchQuerySchema` (`tokensSearch.ts`): `searchTerm`, filters (`chain`/`chain_id`, `marketcap`, `volumeMcapRatio`, `authenticity_score` 0–1, `price`, `stablecoin`, `primitive`, `cexlisted`, `holders`, `price_change_24h`, `liquidity`), sort from 10 fields (default `token_ranking:asc`).
2. `TokensSearchAPI.searchTokens` compiles it into a Typesense `filter_by` string → `GET {host}/collections/tokens/documents/search` (`query_by: name,symbol,chain`, `per_page: 10`).
3. Hits decorated with `website: https://app.mc2.fi/tokens/{id}` (`tokensSearch.ts:163-169`) and returned to the model as tool output.

**Flow 4 — Analysis tools** (`src/agents/apis/mc2Api.ts`, staging URLs hardcoded)
`searchTokenTool` → `GET {tokenAdmin}/test-analyzetokenaddress?address=` (response must include `data` + `albertSummary` fields); `searchAddressTool` → `GET {portfolioAdmin}/address/analyze`; `generalSearchTool` → `GET https://staging.api.mc2.fi/feeds/search?q=`. Unused methods: `analyzeWallet`, `analyzePortfolio`, `addWallet` (POST `/createcommunityportfolio`).

**Flow 5 — Removed MCP server** (git-only, at `5a14a40^`)
`Mc2fiMCPAgent extends McpAgent` served `/sse` + `/mcp`; registered tools (`health`, `search-token`, `search-address`, `general-search`, `advanced-token-search`, `personalized-recommendations`), resources (`greeting://{name}`, `mcp://mc2/session/{id}/state`, `mcp://mc2/analysis/history`, `mcp://mc2/user/preferences`), and prompts (`system_prompt`, `token_analysis_prompt` with `analysisDepth` basic|intermediate|advanced). `MC2MCPState` per-session: 50-entry history cap; `PreferenceManager` inferred risk tolerance from marketcap (>$1B min → "low", <$100M max → "high"), remembered last-5 chains, defaults `{ riskTolerance: "medium", preferredChains: [], analyticsEnabled: true }`.

## 12. Data model reference

**Live persistence is minimal — by design:**

| Store                               | Contents                                                           |
| ----------------------------------- | ------------------------------------------------------------------ |
| Per-DO SQLite (agents SDK internal) | chat messages per session; no app-managed keys in `mc2fi-agent.ts` |
| localStorage: `agentSessionId`      | stable per-browser session identity                                |
| localStorage: `theme`               | dark/light preference                                              |

**Git-only schema** (`src/agents/migrations.sql`, 8 tables, for the _unused_ `AbstractBaseAgent`): `feedback_points`, `task_prompts` (versioned, `performance_score`), `interaction_logs`, `agent_state` (KV), `scheduled_tasks` (DO-alarm driven, `next_run`), `error_logs`, `task_logs`, `tool_usage_logs` + 9 indexes. No D1/SQL binding exists in `wrangler.jsonc`, so none of this can run today.

## 13. Pipeline / processing reference

| Stage             | External call                           | Constants                                                     |
| ----------------- | --------------------------------------- | ------------------------------------------------------------- |
| LLM stream        | OpenAI gpt-4o-2024-11-20 via AI Gateway | `maxSteps: 10`                                                |
| Token analysis    | tokenadmin staging API                  | requires `data` + `albertSummary` in response                 |
| Structured search | Typesense (`tokens` collection)         | 14 filters, 10 sorts, `per_page: 10`                          |
| MCP tools         | `${MCP_HOST}/sse`                       | optional; connect = background; failure → permanent flag-off  |
| Analytics         | `POST api2.amplitude.com/2/httpapi`     | event `chat_message`, userId = session name                   |
| Removed server    | —                                       | 50-entry history cap; 5-min session-break nudge (`300000 ms`) |

No queues, no alarms in the live agent, no retries beyond the SDK's own behavior.

## 14. Algorithms

- **Typesense filter compilation** (`tokensSearch.ts`): Zod schema → `filter_by` string; e.g. `marketcap:>=1000000 && stablecoin:=true`; multi-value chains become `chain_id:=[8453,1]`-style lists; `authenticity_score` is a 0–1 minimum threshold.
- **Risk-tolerance inference** (removed, git-only): `min_marketcap > $1B → "low"`; `max_marketcap < $100M → "high"`; else `"medium"`; chains remembered FIFO, last 5.
- **Feedback scoring** (dead code, `base-agent.ts`): prompt `performance_score` updated as rolling mean `(old + new) / 2` per feedback point.
- **System-prompt rules** (`src/agents/system-prompt.ts`): routing table (token price → `tokensSearchTool`; vault info → `searchVaults`; address → `searchTokenTool`; broad market → `generalSearchTool`; stablecoin yields → `getStablecoinYieldData`; security-filtered vaults → `getVaultsByRiskScore`, "higher scores = lower risk"; stable APY = stable over **last 2 weeks**); risk-communication ruleset with the 🥵/🙂/💪/💪💪/💪💪💪 strength scale.

## 15. External services / model catalog

| Operation                        | Service                                         | Notes                                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat completion                  | OpenAI `gpt-4o-2024-11-20`                      | via hardcoded Cloudflare AI Gateway URL (account `9e6fbc31e203e0af03a5f03a21368cf6`, gateway `agents2`) — `mc2fi-agent.ts:19-24`                                                                                            |
| Token/address/portfolio analysis | MC² tokenadmin + portfolioadmin staging Workers | hardcoded defaults in `mc2Api.ts`                                                                                                                                                                                           |
| Market search                    | `staging.api.mc2.fi/feeds/search`               |                                                                                                                                                                                                                             |
| Token search                     | Typesense (`typesense.mc2.fi` default)          | client URL template inconsistent with full-URL host inputs (latent bug)                                                                                                                                                     |
| MCP tools                        | `${MCP_HOST}/sse`                               | remote vault/yield tools: `searchVaults`, `getVaultsByRiskScore`, `getStableYieldVaults`, `getYieldFarmingOpportunities`, `searchProtocols`, `getStablecoinYieldData` — prompted-for but only present when MCP is connected |
| Analytics                        | Amplitude HTTP API                              |                                                                                                                                                                                                                             |
| LLM observability                | LangSmith (`src/lib/langsmith.ts`)              | **complete but never imported**                                                                                                                                                                                             |

## 16. API & auth reference

- **Routes:** `routeAgentRequest()` owns `/agents/chat/{session}` (WebSocket + AI SDK data stream); no other app routes; static assets from `public/`.
- **Auth: none.** `@cloudflare/workers-oauth-provider` and `workers-mcp` are declared but zero-import. `Env.JWT_SECRET` declared, unused. Sole gate: `OPENAI_API_KEY` presence check at `server.ts:16-21`. The DO is reachable by anyone who can name a session id.
- **Client:** `useAgent`/`useAgentChat` from `agents/ai-react`; no REST client code.

## 17. Scheduling & queues

Live agent: none. Starter residue: `scheduleTask` tool (scheduled/delayed/cron via `agents/schedule`) exists in `src/tools.ts` but is unregistered. Dead-code layer: `scheduled_tasks` table + `state.storage.setAlarm(startAt)` in `base-agent.ts:230`.

## 18. Bindings, secrets & deployment

| Binding | Type                                  | Notes                                             |
| ------- | ------------------------------------- | ------------------------------------------------- |
| `Chat`  | Durable Object (SQLite, migration v1) | only binding; class exported from `src/server.ts` |

Env: `OPENAI_API_KEY`, `TYPESENSE_HOST`, `TYPESENSE_API_KEY`, `AMPLITUDE_API_KEY`, `MCP_HOST` (optional) — `worker-configuration.d.ts:5-14`. Compat date 2025-02-04, `nodejs_compat`. CI/CD (`.github/workflows/deploy.yml`, user-authored): push to `main` → pnpm 10 / Node 23 → `pnpm install --frozen-lockfile` → `pnpm run types` (wrangler typegen) → `pnpm run build` (vite) → `cloudflare/wrangler-action@v3` (wrangler 4.34.0, `CLOUDFLARE_API_TOKEN` secret). **No test/lint gates.** No staging deploy; the `staging` branch was a dev-integration branch, not an environment.

## 19. Operational gotchas & key file map

**Gotchas:**

1. `src/tools.ts` is broken starter residue (imports `agentContext` from `./server`, which no longer exports it) — do not import it; the live tools are built inside `mc2fi-agent.ts`.
2. The system prompt advertises six vault/yield tools that exist only on the remote MCP server; with `MCP_HOST` unset the model is told about tools it cannot call — expect failed tool attempts.
3. `mcpConnected` never recovers within a DO lifetime — a single failed `getAITools()` call permanently disables MCP tools until the DO restarts.
4. `TokensSearchAPI` host handling: env expects a host, client prepends `https://…a1.typesense.net:443` — the defaults are mutually inconsistent.
5. Staging URLs and the AI Gateway account ID are hardcoded in source (`mc2Api.ts`, `mc2fi-agent.ts`) — environment changes require code edits.
6. `worker-configuration.d.ts` inflates diffs ~59% — regenerate (`pnpm run types`), never hand-edit.
7. The multi-agent subsystem (`base-agent.ts`/`migrations.sql`) references nonexistent bindings — importing it fails at runtime, not compile time.
8. README and `src/tools.ts` describe the upstream starter, not this product.

**Key file map:**

| Topic                        | File(s)                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Live agent (start here)      | `src/agents/mc2fi-agent.ts`                                                                                                           |
| Model + gateway config       | `src/agents/mc2fi-agent.ts:19-24`                                                                                                     |
| Tools                        | `mc2fi-agent.ts:30-74` (registration), `src/agents/apis/mc2Api.ts`, `src/agents/apis/tokensSearch.ts`, `src/agents/apis/typesense.ts` |
| System prompt (product spec) | `src/agents/system-prompt.ts`                                                                                                         |
| DO/tool context              | `src/agents/context.ts`                                                                                                               |
| Removed MCP server           | git only: `git show 5a14a40^:src/mcp/` (tools, resources, prompts, HistoryManager, PreferenceManager)                                 |
| Dead multi-agent subsystem   | `src/agents/base-agent.ts`, `src/agents/types.ts`, `src/agents/migrations.sql`, `src/agents/spec*.md`                                 |
| CI/CD                        | `.github/workflows/deploy.yml`                                                                                                        |
| Infra config                 | `wrangler.jsonc`                                                                                                                      |
| Successor architecture       | sibling repo `mc2.agentic2` (see companion writeup)                                                                                   |

---

_End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially._
