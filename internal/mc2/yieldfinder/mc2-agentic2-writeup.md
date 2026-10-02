# MC2 Agentic2 — Codebase Writeup

> **Internal document — not for publication.**
> Repo: `mc2ventures/mc2.agentic2` (local: `~/Downloads/Projects/mc2/mc2.agentic2`)
> Analysis date: 2026-10-02 · 43 commits · 2025-09-24 → 2025-10-25 (one month of active development)
> Purpose: source of truth for deriving CV bullets, LinkedIn material, and blog posts. Written for whole-project scope with attribution (Dibakar Sutra Dhar = contributor/employee at mc2ventures; naming the company is approved).

---

# Part I — Narrative & Achievement View

## 1. TL;DR

MC2 Agentic2 is a production-oriented multi-tenant AI chat platform built on Cloudflare Workers and the Cloudflare Agents SDK — one Durable Object per client for hard isolation, SQLite-backed thread/message history, WebSocket-streamed GPT-4o responses, per-client MCP (Model Context Protocol) tool-server connections, a local DSPy-style prompt-optimization layer ("AxLLM"), and white-label theming for mc2ventures' product surfaces (YieldFinder.ai, mc2.fi). The codebase was built almost entirely by Christoph Richter (mc2ventures) over ~1 month (37 of 43 commits, ~19K LOC of TypeScript). **Dibakar Sutra Dhar contributed the complete product-analytics layer in a single evening (Oct 14, 2025): a typed event catalog, a server-side Amplitude service wired into the Durable Object chat pipeline, a React client-side instrumentation hook, and all env/config plumbing — ~575 lines of new self-authored code plus integration edits (~922 insertions total, of which a large share is formatting).**

Ready-to-adapt CV summary sentence: _Engineered the end-to-end product analytics layer for a multi-tenant AI chat platform on Cloudflare Workers/Durable Objects — typed event catalog, server-side Amplitude integration inside the streaming chat pipeline, and React client instrumentation — shipped across a 5-commit conventional-commit series._

## 2. The product

**What it is:** a white-label, embeddable AI chat assistant (default persona: crypto yield / DeFi companion for YieldFinder.ai and MC2) that any frontend domain can brand, which connects users to LLM reasoning plus their own external MCP tool servers.

**Target users:** mc2ventures' own product surfaces first (white-label SaaS deployments), developers second (the repo doubles as an enhanced fork of Cloudflare's `agents-starter` template — the README keeps the upstream deploy button).

**Feature table** (from `README.md:29-52` + code):

| Feature                       | What it does                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multi-tenant client isolation | One Durable Object per `clientId` via deterministic `idFromName()` — threads, messages, MCP connections and WebSocket state never cross clients              |
| Multi-chat / threads          | Multiple concurrent conversations per client; CRUD over HTTP `?operation=` calls into the DO                                                                 |
| Persistent history            | SQLite-backed Durable Objects; message + thread metadata survive restarts                                                                                    |
| Real-time streaming           | One WebSocket per client; token streaming via AI SDK `toUIMessageStream()` over the Agents framework                                                         |
| MCP integration               | Per-client SSE connections to external MCP servers; tools schema-preserved, responses unwrapped and truncated at 50K chars; up to 5 reasoning steps per turn |
| MCP auto-reconnection         | Proactive health checks + reactive error detection, persisted default servers, exponential backoff (1s→16s, max 5 retries)                                   |
| Built-in tools + HITL         | Weather/time/scheduling tools; human-in-the-loop confirmation machinery (wired, currently disabled in UI)                                                    |
| AxLLM prompt optimization     | Local DSPy-style service: classifies connected MCP server types, appends server- and intent-specific guidance to system prompts                              |
| White-label domain config     | Wildcard-matched per-domain branding, welcome copy, auto-connected MCP servers, UI lockdown flags — all in one TypeScript file                               |
| Product analytics             | Amplitude event tracking on both server (inside DO) and client (React hook) — **Dibakar's contribution**                                                     |
| Task scheduling               | One-time, delayed, and cron-recurring tasks via the Agents SDK scheduling primitive                                                                          |

## 3. Architecture (summary level)

- **Runtime:** single Cloudflare Worker (`src/server.ts` is the wrangler entry) + one SQLite-backed Durable Object class (`ChatDO`, exported as `Chat`), built on the `agents` npm package (Cloudflare's fork of PartyKit). React 19 + Vite 7 + Tailwind v4 + Radix UI frontend.
- **Size:** ~130 TS/TSX files, **18,931 LOC** under `src/` (verified via `wc -l`): 916-line `ChatDO.ts`, ~6,500 LOC of React components, 4,748 LOC of services, 930 LOC of AI tools.
- **Storage:** Durable Object storage only (KV-style API over SQLite). No KV/D1/R2/Queues bindings. Keys: `client:{id}:meta`, `thread:{id}:meta`, `thread:{id}:messages`, `message:{id}`, `mcp:default_servers`.
- **External services:** OpenAI (`gpt-4o-2024-11-20`, hardcoded in `src/durable-objects/services/AIService.ts:25`), MCP servers over SSE (default `https://mcp.mc2.fi/sse`), Amplitude HTTP API.
- **Flow in one line:** React `useAgent` WebSocket → `routeAgentRequest()` → per-client `ChatDO` → `AIService.streamText()` with core + MCP tools → streamed back over the same WebSocket; everything persisted per-thread in DO storage.

Deep detail in Part II.

## 4. The story: how the project evolved

Six epochs reconstructed from git (all hashes on `master`):

| Epoch                              | Dates           | Theme                                                                                                                                                                                                                          | Author          |
| ---------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| A. Bootstrap + MCP upgrade         | Sep 24–25, 2025 | Cloudflare scaffold (`80e3102`), MCP upgrade (`75beed7`), extensions (`95791a4`), first AxLLM commit (`c6e3b9c`)                                                                                                               | Christoph       |
| B. Chat UI + multi-conversation    | Oct 6           | Improved chat UI; "finally fixed the history & multiconversations" (`de98692`)                                                                                                                                                 | Christoph       |
| **C. Amplitude analytics**         | **Oct 14**      | **The entire analytics feature lands in 11 minutes, 4 feature commits + favicon (`75561a1` → `fa4b8d2`)**                                                                                                                      | **Dibakar**     |
| D. Analytics hardening + rename    | Oct 15–16       | Christoph fixes/toughens Dibakar's tracking (`7bd0c3d`, `6c6d21a`); PR #1 renames worker to `yieldfinder-frontend` (`d154c4f`)                                                                                                 | Christoph + bot |
| E. Client isolation + big refactor | Oct 17–19       | 2,690+/7,603− refactor (`92c5888`) extracting `src/worker/{index,middleware,router}.ts` and the DO service layer (AIService/MessageService/ThreadService); history/racing fixes; domain-config feature (`2069eeb`, +907 lines) | Christoph       |
| F. MCP reconnection saga           | Oct 20–25       | Auto-reconnection service (`0fd9da0`, `079074d` +706 lines); 8 debugging commits in the final 2.5 hours — the MCP reconnect problem was still being fought at repo tip                                                         | Christoph       |

**Dibakar's tenure window:** first commit 2025-10-14 22:52 (+0600), last 2025-10-14 23:03 — one focused evening. **What happened after:** Christoph spent the next two days amending and standardizing the analytics integration (`7bd0c3d` "tracking fixes", `6c6d21a` "fix amplitude - added standard fields"), then kept shipping for 11 more days. The analytics feature was accepted, hardened, and remained the production tracking path — that is the post-tenure validation.

## 5. The user's contributions in detail

### Ownership map

Dibakar touched 10 files, each once; everything else is Christoph's:

| File                                              | Dibakar                                                               | Christoph (post-tenure)    |
| ------------------------------------------------- | --------------------------------------------------------------------- | -------------------------- |
| `src/types/analytics-types.ts`                    | **created (97 lines)**                                                | —                          |
| `src/services/amplitude-service.ts`               | **created (213 lines)**                                               | later modified (4 commits) |
| `src/hooks/useAmplitude.ts`                       | **created (214 lines)**                                               | later modified (3 commits) |
| `src/app.tsx`                                     | integration edits (+117, mixed with reformat)                         | 19 commits total           |
| `src/server.ts`                                   | tracking call sites + singleton (+445/−181, mostly prettier reformat) | 12 commits total           |
| `wrangler.jsonc`, `env.d.ts`, `.dev.vars.example` | config plumbing                                                       | 8 commits (wrangler)       |
| `src/services/mcp-server-profiler.ts`             | style cleanup only (+11)                                              | —                          |
| `public/favicon.ico`                              | replaced (binary)                                                     | —                          |

Reading: the user owned a complete, self-contained **observability feature vertical** — types → service → hook → integration — inside an existing codebase, matching its architecture rather than reworking it.

### Thematic breakdown (all 5 commits)

**Theme 1 — Typed analytics event catalog + config plumbing** (`75561a1`, +103/−1)
`src/types/analytics-types.ts` (97 lines): shared event-name constants and typed payloads for both server and client events; `AMPLITUDE_API_KEY` added to `.dev.vars.example`, `env.d.ts`, and `wrangler.jsonc`.

**Theme 2 — Server-side Amplitude service** (`0ec1237`, +213)
`src/services/amplitude-service.ts`: `AmplitudeService` class sending events to the Amplitude HTTP API from inside the Durable Object — single and batched sends, with domain-specific trackers: `trackMessageSent`, `trackAIResponseGenerated`, `trackToolInvoked`, `trackThreadCreated`, `trackThreadLoaded`.

**Theme 3 — Client-side instrumentation hook** (`0762348`, +214)
`src/hooks/useAmplitude.ts`: React hook + singleton `ClientAmplitudeService` covering session start/duration, message submissions, thread switches/creations, theme toggles, and conversation-list visibility — the client half of a dual-sided event model (server = chat/AI truth, client = UI engagement).

**Theme 4 — Integration into the live chat pipeline** (`7ed48d1`, +392/−181)
Wired `useAmplitude()` into `src/app.tsx` (real client wiring: theme, message submit, thread create/switch, conversation list) and added the 5 server-side tracking call sites plus a lazy `getAmplitudeService()` singleton on the `Chat` DO in `src/server.ts`. **Honesty note:** the commit body itself says "Refactored logging statements for consistency and clarity" — roughly 60–70% of this diff's volume is prettier-style reformatting (quote conversion, line wrapping), not logic. Only ~13 added server lines reference Amplitude. The functional content is real but small; never quote +392 for this commit.

**Theme 5 — Branding** (`fa4b8d2`): replaced favicon (15 KB binary, zero code).

**Totals:** 5 commits, +922/−182 (`git log --author="iamdibakardipu" --numstat`). Code-only footprint ≈ 575 lines across the three self-authored files at their current state (~523 at creation, before Christoph's post-tenure hardening).

### Signature engineering moments

1. **Dual-sided analytics design.** The integration tracks the same user journey from two vantage points: server-side events emitted from inside the DO chat pipeline (message sent, AI response generated, tool invoked — ground truth for what the AI did) and client-side events from a React hook (session duration, theme toggles, thread switching, UI engagement — what the user experienced). Two services, one shared typed catalog (`src/types/analytics-types.ts`), so event names never drift between halves.
2. **Instrumenting a streaming WebSocket pipeline without disturbing it.** The server call sites hook into the DO's `onChatMessage` and finish/tool flow via a lazy singleton (`getAmplitudeService()`), so analytics adds no new connections and no per-request setup — it degrades to a no-op when the key is absent.
3. **Feature-complete in one sitting, conventional-commit discipline.** Four feature commits in 11 minutes, each with a conventional prefix (`feat(analytics)`, `feat(amplitude-service)`, `feat(hooks)`, `feat(amplitude)`) and multi-line bodies enumerating changes — the repo's only consistently disciplined commit messages (the primary author's are terse narratives like "some more tests"). Types → service → hook → integration, each commit shippable.

### Commit hygiene

Strict conventional commits with scopes and bodies for all 5 commits; no PRs used (direct pushes to `master`), consistent with the repo's small-team workflow.

## 6. Engineering practices observed

- **Testing:** minimal — one vitest smoke test (`tests/index.test.ts`, asserts the Worker's 404) via `@cloudflare/vitest-pool-workers`. No tests for ChatDO, services, AxLLM, or MCP logic.
- **CI:** `.github/workflows/sanity-check.yml` — prettier + biome lint + `tsc` on push/PR to main. No test or deploy gates.
- **Docs culture: unusually strong.** A 35KB self-declared "Current & Verified" `ARCHITECTURE.md` with five design decisions each paired with its rejected alternative; a 5-hour MCP debugging postmortem (`docs/LESSONS_LEARNED_MCP_INTEGRATION.md`); troubleshooting and deployment checklists. Some docs are stale snapshots (`docs/MULTI_CHAT_ARCHITECTURE.md` describes a superseded design; `NEXT_DEVELOPER_README.md` references four nonexistent files).
- **Recorded tech debt:** deprecated `ChatOld` monolith coexists with active `ChatDO` in `src/server.ts`; two parallel AxLLM implementations; auth is anonymous localStorage client IDs (no real authentication); hardcoded model string; unused `AI` binding and `workers-ai-provider` dependency.

## 7. Numbers worth quoting

| Metric                        | Value                                                                                                                          | Source / how to reproduce                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Total commits / span          | 43 · 2025-09-24 → 2025-10-25                                                                                                   | `git log --oneline \| wc -l`                                     |
| Dibakar's commits             | 5 (Oct 14, 2025, one evening)                                                                                                  | `git shortlog -sne HEAD`                                         |
| Dibakar's diff                | +922 / −182 across 10 files                                                                                                    | `git log --author="iamdibakardipu" --numstat`                    |
| Self-authored new code        | 3 files, ~575 LOC (analytics-types 97 · amplitude-service 240 · useAmplitude 238, current state)                               | `wc -l` on the three files                                       |
| Primary author                | Christoph Richter: 37 commits, +84,105/−47,065                                                                                 | `git shortlog`, numstat                                          |
| Codebase size                 | ~130 TS/TSX files, 18,931 LOC in `src/`                                                                                        | `find src -name "*.ts*" \| xargs wc -l`                          |
| Analytics events instrumented | 5 server-side trackers + 6+ client-side trackers (messages, AI responses, tool calls, threads, sessions, theme, UI visibility) | `src/services/amplitude-service.ts`, `src/hooks/useAmplitude.ts` |
| MCP tool-result truncation    | 50,000 chars (~12K tokens) — fixed a 155K-char context overflow                                                                | `ARCHITECTURE.md`, `MCP_SERVER_ISSUE_SUMMARY.md`                 |
| Multi-step tool cap           | `stopWhen: stepCountIs(5)` (SDK default is 1)                                                                                  | `src/durable-objects/services/AIService.ts`                      |
| MCP reconnection              | max 5 retries, exponential backoff 1s→16s, 11 error patterns recognized                                                        | `src/durable-objects/services/McpReconnectionService.ts`         |
| LLM                           | OpenAI `gpt-4o-2024-11-20`                                                                                                     | `AIService.ts:25`                                                |

**Inflation caveats:** the +922 includes a 15 KB binary favicon (0/0 numstat) and ~250–300 lines of prettier reformatting inside `7ed48d1`; Christoph's +84K includes spec/vendor markdown and a `pnpm-lock.yaml` bump. The claimed "~70% DO cost reduction" (`DEPLOYMENT_CHECKLIST.md`) and AxLLM "25%/40% quality improvement" (`AXLLM_ARCHITECTURE_CORRECTED.md`) are **unverified assertions with no methodology committed** — do not quote as results.

## 8. Raw material for derived artifacts

### CV bullet candidates

- Built the end-to-end product analytics layer for a multi-tenant AI chat platform on Cloudflare Workers/Durable Objects: typed event catalog, server-side Amplitude service embedded in the streaming chat pipeline, and React client instrumentation (~575 lines across 3 new modules, shipped in 4 reviewed conventional-commit steps).
- Designed a dual-sided event model for LLM chat products — server-of-record events (message sent, AI response generated, tool invoked) plus client engagement events (session duration, thread switches, UI interactions) — sharing one typed catalog so event names stay consistent across client and server.
- Integrated analytics into a WebSocket-streamed AI chat pipeline using a lazy service singleton on the Durable Object, adding zero per-request overhead and degrading to a no-op without credentials.
- Delivered a production analytics feature against an unfamiliar codebase (Cloudflare Agents SDK, Durable Objects, AI SDK v5) in a single day, later hardened and standardized by the platform's primary author.

### Blog-post angles

1. **"Instrumenting an AI chat app: what to track on both sides of a streaming WebSocket"** — the dual-sided event design is genuinely interesting: server events measure the AI, client events measure the human; the writeup material for both halves is in the diff.
2. **"Your analytics hook is a product spec"** — the client-side tracker list (session duration, theme toggles, conversation-list visibility) doubles as a definition of what the product considered engagement.
3. **"One Durable Object per user: multi-tenancy on Cloudflare Workers"** — project-level angle (attributed to the team): the isolation model, the `idFromName` trick, and the `name`-vs-`id` gotcha documented in `ARCHITECTURE.md`.
4. **"The 50,000-character fix: integrating MCP tools with the Vercel AI SDK"** — the repo's best research artifact (schema Symbols, `stepCountIs(5)`, truncation) — but it is the primary author's work; write only with credit or from the "what I learned watching this codebase" framing.

### LinkedIn headline candidates

- "Built the product analytics layer for a multi-tenant AI chat platform on Cloudflare Workers (Durable Objects, MCP, streaming GPT-4o) at mc2ventures."
- "Software engineer — AI infrastructure & observability: Amplitude analytics end-to-end for a Cloudflare Agents-based chat product."

## 9. Caveats for accuracy

- **Attribution:** the platform itself (architecture, isolation, MCP, AxLLM, UI) is Christoph Richter's work. Dibakar's claim is the analytics vertical only. Do not write "built a multi-tenant AI chat platform" — write "built the analytics layer for…" or "contributed to…".
- **Post-tenure changes:** Christoph amended `amplitude-service.ts` (4 commits) and `useAmplitude.ts` (3 commits) after Oct 14 — "tracking fixes" and "standard fields". Current file line counts (240/238) include his edits; Dibakar's originals were 213/214. The feature's production form is a collaboration.
- **Inflated diffs:** never cite +392 or +922 as "lines of analytics code" — see §7.
- **"Multi-tenant" ≠ authenticated:** isolation is by anonymous localStorage client IDs; there is no login. Avoid implying auth/security work.
- **Naming drift:** repo `mc2.agentic2`, deployed worker `yieldfinder-frontend` (PR #1), product surfaces YieldFinder.ai / mc2.fi; one unmerged bot branch renames the worker back. The product is best described as mc2ventures' white-label AI assistant.
- **Unverified metrics:** 70% cost saving, AxLLM 25%/40% claims have no committed methodology — project-internal assertions only.
- **Upstream template:** README and scaffolding derive from Cloudflare's public `agents-starter`; the platform value is in what was built on top.
- **Secrets:** clean — `.dev.vars.example` contains placeholders only; no real keys in tracked files or history (checked `git log --all -p` for key patterns). The frontend `VITE_AMPLITUDE_API_KEY` is public-by-design (browser bundle).

---

# Part II — Technical Reference

Purpose: standalone reference extracted from source at analysis date (2026-10-02), so future work never requires re-reading the codebase. File paths relative to repo root.

## 10. System topology

```
Browser (React 19 SPA, src/app.tsx)
  │  useAgent({ agent: "chat", name: clientId })  — one WebSocket per client
  ▼
Cloudflare Worker  (entry: src/server.ts → src/worker/index.ts)
  │  routeAgentRequest()  [agents SDK]  +  /check-open-ai-key health route
  ▼
Chat Durable Object  ("Chat" binding, SQLite class; src/durable-objects/ChatDO.ts, 916 LOC)
  ├─ ThreadService / MessageService      → DO storage (KV API over SQLite)
  ├─ AIService                           → OpenAI gpt-4o-2024-11-20 (streamText)
  ├─ MCPClientManager [agents SDK]       → external MCP servers over SSE (default https://mcp.mc2.fi/sse)
  ├─ McpReconnectionService              → DO storage keys mcp:default_servers / mcp:retry_state
  ├─ SystemPromptService (AxLLM)         → local prompt optimization, cached
  └─ AmplitudeService                    → Amplitude HTTP API
```

Who talks to what: only the DO touches storage and OpenAI; only the Worker routes; the browser talks exclusively to `/agents/chat/{clientId}` (WebSocket for chat, HTTP with `?operation=` for thread CRUD against the same DO). Dev mode runs the whole stack locally via `@cloudflare/vite-plugin` (port 8787, `.dev.vars` for secrets).

## 11. End-to-end data flows

**Flow 1 — Chat message → streamed AI response (the main path)**

1. `src/app.tsx:251-267` sends the user message with `parts[0].data = { threadId, clientId }` — _threadId travels in messages, not in the connection_ (one WebSocket per client; no reconnect on thread switch; `ARCHITECTURE.md:415`).
2. `src/worker/index.ts:44-47` → `routeAgentRequest(request, env)` maps `/agents/chat/{clientId}` to a DO via deterministic `env.Chat.idFromName(clientId)`.
3. `ChatDO.onRequest` (`ChatDO.ts:493`) validates context, pre-loads thread history into `this.messages` for POSTs (L544-549), delegates to `AIChatAgent.onRequest`.
4. `ChatDO.onChatMessage` (L723): ensures default MCP servers connected, wraps `onFinish` with the persistence wrapper, delegates to `AIService`.
5. `AIService.streamResponse` (`src/durable-objects/services/AIService.ts:202-207`): `streamText({ model: openai("gpt-4o-2024-11-20"), tools: coreTools + wrappedMcpTools, stopWhen: stepCountIs(5) })`, system prompt generated by AxLLM `SystemPromptService.generateEnhancedSystemPrompt` (cached).
6. Stream merges `result.toUIMessageStream()` → `createUIMessageStreamResponse` back over the WebSocket.
7. On finish: `ChatDO.createPersistenceWrapper` (L831-891) → `MessageService.saveMessages` + thread-metadata update; `AmplitudeService.trackAIResponseGenerated` / `trackToolInvoked` fire here.
   Failure: MCP tool errors trigger reactive reconnection (Flow 3); >50K-char tool results are truncated pre-model (Flow 2).

**Flow 2 — MCP tool invocation**

1. Tools come from `this.mcp.getAITools()` [agents SDK `MCPClientManager`] — schemas carry special Symbols the AI SDK's `isSchema()` requires.
2. `ChatDO.getWrappedMcpTools` (L244-372) wraps each: proactive health check, spread-preserve the original tool object (`{ ...originalTool }` — reconstruction breaks Symbols → `TypeError: ... typeName`), unwrap MCP `{content:[{type:"text",text}]}` to plain text, truncate at 50,000 chars with `[TRUNCATED: ...]` notice, retry once on connection errors.
3. Multi-step execution continues up to 5 steps (`stepCountIs(5)`; SDK default 1 stops after the first tool call — one of the three fixes in `MCP_SERVER_ISSUE_SUMMARY.md`).

**Flow 3 — MCP auto-reconnection** (`src/durable-objects/services/McpReconnectionService.ts`, 333 LOC)
Two-phase detection: proactive health check (`state === 'ready'`) before any tool execution + reactive catch of 11 connection-error patterns (`connection`, `timeout`, `econnrefused`, `sse`, `aborted`, …). Recovery: load server config from DO storage `mcp:default_servers` → remove old connection → `addMcpServer()` → update serverId; max 5 retries, exponential backoff 1s→16s (`mcp:retry_state`); user sees 🔄/✅/❌ status messages in-chat. No polling — reconnection only on tool use.

**Flow 4 — Thread CRUD (HTTP, not WebSocket)**
`src/services/thread-service.ts` (client) → `GET/POST /agents/chat/{clientId}?operation=listThreads|createThread|getMessages|deleteThread|updateThread&clientId=...` → `ChatDO.onRequest` operation switch (`ChatDO.ts:599-629`). Historically broken when the client hardcoded `/agents/chat/default` — must always carry the real clientId.

**Flow 5 — Default MCP servers on page load**
`src/config/domain-config.ts` maps hostname → `defaultMcpServers[]`; `src/app.tsx:182-227` sends `/add-mcp` chat messages with 2-second stagger; `src/tools/mcp/mcp-command-parser.ts` parses them; every added server auto-registers as a reconnectable default.

**Flow 6 — Analytics (Dibakar's vertical)**
Server: `AmplitudeService` singleton via `getAmplitudeService()` on the DO; call sites in `onChatMessage` (`trackMessageSent`), createThread (`trackThreadCreated`), thread load (`trackThreadLoaded`), finish/tool flow (`trackAIResponseGenerated`, `trackToolInvoked`) → Amplitude HTTP API, batch-capable, no-op without key. Client: `useAmplitude()` (`src/hooks/useAmplitude.ts`) — session start/duration, message submissions, thread switches/creations, theme toggles, conversation-list visibility → `VITE_AMPLITUDE_API_KEY` browser events.

## 12. Data model reference

**Store inventory:** single engine — Durable Object storage (KV API over per-DO SQLite; the app does not use raw SQL for its own data — the `threads`/`messages` SQL tables in `ARCHITECTURE.md:309-336` are the agents framework's internal tables).

| Key pattern                  | Contents                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `client:{clientId}:meta`     | `ClientMetadata { clientId, threadIds[], createdAt, lastActiveAt }`                            |
| `thread:{threadId}:meta`     | `ThreadMetadata { id, title, createdAt, updatedAt, messageCount, lastMessagePreview?, tags? }` |
| `thread:{threadId}:messages` | `string[]` — message-ID index for the thread                                                   |
| `message:{messageId}`        | `StoredMessage { id, threadId, clientId, timestamp, sender, role, content, parts, metadata }`  |
| `mcp:default_servers`        | reconnectable default MCP servers `{ name, url, callbackHost, serverId }`                      |
| `mcp:retry_state`            | reconnection retry counters/backoff state                                                      |

Types in `src/types/storage-types.ts`. No cache layers, no external stores, no TTLs. Isolation is total: each client's DO holds only its own keys.

## 13. Pipeline / processing reference

| Stage               | External call              | Writes                                   | Constants                                                                                                                                                                            |
| ------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| System-prompt build | none (local AxLLM)         | cached prompt                            | `SystemPromptService` cache; 6 feature flags (`AXLLM_ENABLED`, `SERVER_SPECIFIC_PROMPTS`, `CODE_QUALITY_ANALYSIS`, `ADAPTIVE_OPTIMIZATION`, `PERFORMANCE_MONITORING`, `AXLLM_DEBUG`) |
| LLM stream          | OpenAI `gpt-4o-2024-11-20` | persisted on finish                      | `stopWhen: stepCountIs(5)`                                                                                                                                                           |
| MCP tool exec       | MCP server (SSE)           | nothing persisted                        | 50,000-char truncation (~12K tokens)                                                                                                                                                 |
| MCP reconnection    | MCP server                 | `mcp:default_servers`, `mcp:retry_state` | 5 retries, backoff 1s→16s, 11 error patterns                                                                                                                                         |
| Persistence         | none                       | message + thread-meta keys               | per-finish wrapper                                                                                                                                                                   |
| Analytics           | Amplitude HTTP API         | nothing local                            | no-op without key; client key baked at build time                                                                                                                                    |

Retry/recovery: MCP reconnect as above; no queue/DLQ anywhere; persistence failures surface as user-visible errors (see `TROUBLESHOOTING.md` §7 — parameterized queries, JSON-serialized `toolInvocations`).

## 14. Algorithms

No scoring/ranking algorithms. The non-trivial encoded knowledge:

- **MCP tool-wrapper rule (the project's hard-won algorithm):** minimal wrapper = spread the original tool object + wrap `execute()`. Schema reconstruction (7 failed attempts documented in `docs/LESSONS_LEARNED_MCP_INTEGRATION.md`) destroys the AI SDK's detection Symbols; "we removed 80% of our wrapper code and it finally worked." Requires `ai` ≥ 5.0.76 for `stepCountIs`.
- **Server-type classification** (`src/services/mcp-server-profiler.ts`, 472 LOC): URL/capability-based classification → `ServerProfile` → AxLLM strategy selection (filesystem / database / api / code / debugging / code_generation / crypto_yield strategies in `src/services/axllm/strategies/`).
- **AxLLM prompt synthesis:** intent analysis + server profile + strategy template → enhanced system prompt, cached. Doc-claimed 25%/40% quality improvements are unverified.

## 15. External services / model catalog

| Operation         | Service                                         | Notes                                                                                                                                                 |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chat completion   | OpenAI `gpt-4o-2024-11-20` via `@ai-sdk/openai` | hardcoded at `AIService.ts:25` and legacy `src/server.ts:41`; AI Gateway code commented out (`src/server.ts:43-46`)                                   |
| Tool execution    | MCP servers over SSE                            | default `https://mcp.mc2.fi/sse`; per-client connections; docs disagree on the YieldFinder default URL (`mcp.yieldfinder.ai/sse` vs `mcp.mc2.fi/sse`) |
| Product analytics | Amplitude HTTP API                              | server key `AMPLITUDE_API_KEY` (secret), client key `VITE_AMPLITUDE_API_KEY` (build-time)                                                             |
| Workers AI        | `AI` binding declared in `wrangler.jsonc`       | **unused**; `workers-ai-provider` dependency also unused                                                                                              |

Observability: Cloudflare Workers `observability.enabled` + Amplitude events + console-log debugging.

## 16. API & auth reference

- **Routes:** `routeAgentRequest()` owns `/agents/chat/{clientId}` (WebSocket upgrade / GET history / POST messages); thread CRUD via `?operation=` on the same path; `GET /check-open-ai-key` health probe (`src/worker/index.ts:23-27`); a custom DO router (`src/worker/router.ts`) exists but is bypassed by the framework router.
- **Auth: none.** Identity = `anon_<ts>_<hex>` client ID in localStorage (`src/utils/client-id.ts`, key `agentic_client_id`), available synchronously before React render. Isolation = deterministic `idFromName(clientId)` DO placement + per-DO storage; `validateClientOwnership` (`ChatDO.ts:589-593`) is an explicit stub ("trust Worker routing"). No rate limits, no OpenAPI spec.
- **Client access:** `useAgent`/`useAgentChat` from `agents/react` + `agents/ai-react`; `useThreadManager` wraps the thread-service HTTP calls.

## 17. Scheduling & queues

No queues. Task scheduling comes from the agents SDK (`agents/schedule` tools in `src/tools/core/`): one-time, delayed, and cron-recurring tasks executed within the DO. No message contracts, no DLQ.

## 18. Bindings, secrets & deployment

| Binding | Type                                                             | Used for         |
| ------- | ---------------------------------------------------------------- | ---------------- |
| `Chat`  | Durable Object (SQLite class, migration v1 `new_sqlite_classes`) | per-client agent |
| `AI`    | Workers AI                                                       | declared, unused |

Secrets: `OPENAI_API_KEY`, `AMPLITUDE_API_KEY` (`wrangler secret put`). Vars: `HOST=https://app.yieldfinder.ai`, AxLLM flags (all `true` in prod), `MULTI_CHAT_ENABLED`, task-UI flags. Frontend: `VITE_AMPLITUDE_API_KEY` via `import.meta.env` at build time (`vite.config.ts` loads `.dev.vars`).

Deploy: `pnpm run deploy` (Vite build → `wrangler deploy`); CI runs lint + typecheck only (no tests, no deploy gate). Rollout/rollback: `wrangler rollback`, `wrangler deployments list`, feature-flag rollback for multi-chat routing without redeploy (`DEPLOYMENT_CHECKLIST.md`). Migration policy: DO migration tags must increment (v1 → v2 pattern); destructive reset = `wrangler delete-durable-objects-namespace Chat`.

## 19. Operational gotchas & key file map

**Gotchas (each bit someone, documented):**

1. `useAgent({ name: clientId })` — the parameter is **`name`, not `id`**; using `id` silently routes every client to room `"default"`, destroying isolation (`ARCHITECTURE.md`).
2. MCP tool schemas carry invisible Symbols; reconstructing them breaks `isSchema()` detection → cryptic `TypeError ... typeName` (`docs/LESSONS_LEARNED_MCP_INTEGRATION.md`).
3. AI SDK v5 defaults to 1 tool step — without `stepCountIs(5)`, tools "work" but results never reach the answer.
4. `finishReason: 'unknown'` with empty content = silent context overflow (a 155K-char tool result); truncate at 50K.
5. Thread-service HTTP calls must carry the real clientId — hardcoding `/agents/chat/default` routes CRUD to the wrong DO.
6. Duplicate-thread race on mount — guard with `threadsLoading` + `isCreatingInitialThread` flags.
7. Reconstructing AxLLM: two parallel implementations exist (`src/services/axllm/` is live; `src/services/axllm-service.ts` is legacy); likewise `ChatOld` in `src/server.ts` is deprecated behind the active `ChatDO`.
8. Worker name is `yieldfinder-frontend` while the repo is `mc2.agentic2` (an unmerged bot branch renames it back) — don't "fix" either direction without checking the Cloudflare dashboard.
9. `MULTI_CHAT_ENABLED` in `.dev.vars.example` is referenced by no code — per-client routing is always on via the agents framework.

**Key file map:**

| Topic                   | File(s)                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| DO agent (active)       | `src/durable-objects/ChatDO.ts`                                                                                     |
| AI streaming + model    | `src/durable-objects/services/AIService.ts`                                                                         |
| MCP wrapper/reconnect   | `ChatDO.ts` L244-372; `src/durable-objects/services/McpReconnectionService.ts`                                      |
| AxLLM (live)            | `src/services/axllm/SystemPromptService.ts`, `src/services/axllm/`                                                  |
| Analytics               | `src/services/amplitude-service.ts`, `src/hooks/useAmplitude.ts`, `src/types/analytics-types.ts`                    |
| Storage schema          | `src/types/storage-types.ts`                                                                                        |
| Worker routing          | `src/worker/index.ts`, `src/worker/middleware.ts`                                                                   |
| White-label config      | `src/config/domain-config.ts`, `DOMAIN_CONFIG_GUIDE.md`                                                             |
| Design doc (read first) | `ARCHITECTURE.md` ("supersedes all previous architecture documentation")                                            |
| Postmortems             | `MCP_SERVER_ISSUE_SUMMARY.md`, `docs/LESSONS_LEARNED_MCP_INTEGRATION.md`, `MCP_AUTO_RECONNECTION_IMPLEMENTATION.md` |
| Stale-by-design docs    | `docs/MULTI_CHAT_ARCHITECTURE.md`, `NEXT_DEVELOPER_README.md`                                                       |

---

_End of Part II. Part I is the narrative/achievement view; Part II is the technical reference. Regenerate both together if the codebase changes materially._
