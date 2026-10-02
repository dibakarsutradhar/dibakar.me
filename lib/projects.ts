export type Project = {
	name: string;
	org: string;
	period?: string;
	stack: string;
	/** What it is and why it exists — the readable layer. */
	summary: string[];
	/** The architecture decisions, tradeoffs, and numbers — behind the summary. */
	details: string[];
	/** The project's long-form blog write-up, once one exists ('/blog/<slug>'). */
	href?: string;
	/**
	 * Any number of external URLs — repo, package registry, live site, docs.
	 * Rendered as a small link row under the entry, in the order given.
	 */
	urls?: Array<{ label: string; href: string }>;
};

export const PROJECTS: Project[] = [
	{
		name: 'Jemeti OS',
		org: 'Founder',
		period: '2026',
		stack: 'Rust · Axum · PostgreSQL · SvelteKit · AWS · Terraform',
		summary: [
			'An operating system for vehicle workshops — a multi-tenant SaaS covering the whole business: job cards, customers, inventory, point of sale, accounting, payroll, customer messaging, subscriptions. I designed and built it solo, from an empty repo to AWS production, in under five months.'
		],
		details: [
			'The design bet: a service advisor works a ten-hour shift, and the dominant event of their day is a customer walking in with a car. Everything in the product orbits that moment — walk-in intake, a job moving through a twelve-state lifecycle from intake to customer sign-off, inspections, quotations, parts pulled from inventory, invoices and receipts — with each workshop getting its own subdomain, its own staff roles, and its own data.',
			'Multi-tenancy is enforced in depth: every request carries the tenant through authentication down into the database session, and Postgres row-level security is the last line of defense — no query can cross tenants even when application code has a bug. Before production, I audited my own system with per-feature security reviews and live penetration tests; the audits surfaced real cross-tenant holes, and every fix was pinned with a database constraint or a regression test so it could not quietly return.',
			'The platform services were built as seams so they would grow without rework: a payment-gateway layer with per-country routing — four gateways across two regions, each added in days rather than weeks — a credit-ledger messaging engine reaching customers over five channels, double-entry accounting where the journal refuses unbalanced entries, moving-average inventory costing, payroll.',
			'I ran the entire stack on AWS as code: two Rust binaries compiled to static fifteen-megabyte images on one small instance, three server-rendered frontends on Lambda behind one CDN, workshop DNS provisioned automatically at signup. Every production incident became a permanent control — including an edge-routing matrix that fails the infrastructure build if any route is misconfigured, so a class of outage that happened once can never happen again.',
			'It reached production with real workshops onboarded, closing its build-out in a hardened, self-documented state — every feature designed before it was built, audited before it was exposed, and documented after it shipped.'
		],
		urls: [{ label: 'jemeti.com', href: 'https://jemeti.com/' }]
	},
	{
		name: 'Invoice OS',
		org: 'Co-founder',
		period: '2025 – 2026',
		stack: 'TypeScript · SvelteKit · Cloudflare Workers · tRPC · Supabase · PostgreSQL',
		summary: [
			'An AI-powered invoicing SaaS for freelancers and small businesses: branded invoices in minutes — from a form or by pasting free text — with share links, view analytics, and a clear draft-to-paid lifecycle. I co-founded it and built the product end to end.'
		],
		details: [
			'The problem it solved: invoicing tools are either heavyweight accounting suites or pretty templates that know nothing about your business. invoice os sits in between — invoices carry your branding and bank details, clients and products live in a real catalog, every invoice moves through a tracked lifecycle from draft to paid, and share links tell you when a client actually opened one. Malaysia-first by design: ringgit as the default currency, local payment habits kept in mind.',
			"I built it as a lean monorepo on one runtime: a typed API on Cloudflare Workers serving a SvelteKit frontend on the edge, over Postgres. Types run end to end — the invoice preview a client sees is computed by the same shared money-math that persists the invoice — so the numbers on screen and the numbers in the database can't disagree.",
			'The architecture was refactored twice as the product found its shape. The first cut had a separate REST API and a second frontend app; as the product matured, both were consolidated into a single typed API and one frontend — fewer moving parts, one deployment story, and a codebase small enough to hold in your head.',
			'The most satisfying work came after launch, when dashboards got slow. Invoices stored as one JSON blob meant every analytics question hauled the whole dataset into application code. I ran a performance campaign: invoice line items normalized into relational tables, analytics aggregation pushed down into the database, the read patterns that multiplied queries eliminated, and targeted indexes added — all behind a careful migration playbook with idempotent backfills, dual-writes with trigger safety nets, and parity checks before each cutover. Invoice-list load times dropped from a few hundred milliseconds to tens.',
			'A hardening pass covered the rest: a stored-XSS vector caught in product search, ownership checks enforced on every resource, cross-origin access locked to a whitelist, and the SaaS mechanics made real — plan-based limits with usage metering enforced in one gating middleware, the payment provider behind an interface so billing rails could change without touching product code.',
			'It shipped to production and launched on Product Hunt, and its build-out closed in a fully hardened state — every migration documented, every rollback planned.'
		],
		urls: [
			{ label: 'invoisos.com', href: 'https://invoisos.com/' },
			{ label: 'product hunt', href: 'https://www.producthunt.com/products/invoice-os' }
		]
	},
	{
		name: 'doc-scraper-rs',
		org: 'Open source',
		period: '2026',
		stack: 'Rust · Tokio · reqwest · llms.txt · AGENTS.md',
		summary: [
			"A CLI that exports GitBook and Mintlify docs as a clean markdown mirror tree — by hitting each site's hidden text/markdown endpoint directly instead of parsing HTML — with llms.txt, llms-full.txt, and AGENTS.md sidecars generated for LLM and AI-agent ingestion."
		],
		details: [
			"The core bet: GitBook's Next.js sites serve every page twice — a 380–770 KB React shell and a clean text/markdown payload at the same URL with `.md` appended. Asking for the markdown endpoint first means one request per page and zero HTML parsing.",
			'GitBook\'s soft 404s look healthy on the wire — HTTP 200 with a "Page Not Found" markdown stub — so the fallback is content-based: a regex anchored to the first heading, strict enough that prose mentioning "page not found" never triggers it, then a fallback fetch of the bare HTML URL that reuses the retry budget without re-paying the politeness delay.',
			'Mintlify runs the same markdown endpoint with different lies (a flat urlset sitemap and a doc-index banner prepended to every response), so the sitemap shape is auto-detected and the banner stripped line-by-line — partial matches return the body untouched, never half-cleaned.',
			'Fetches fan out through a Tokio semaphore (20 concurrent) with a per-request politeness delay and bounded exponential-backoff retries on 5xx/429. A 34-page site lands as ~172 KB of markdown in ~1.3s — about 26 pages/sec.',
			'Distribution goes three ways: `cargo install`, SHA-256-verified prebuilt binaries per platform, and an npm wrapper that resolves the platform binary via optionalDependencies at install time.'
		],
		href: '/blog/01-10-2026-Exporting-GitBook-Docs-as-Markdown-in-Rust',
		urls: [
			{ label: 'GitHub', href: 'https://github.com/dibakarsutradhar/doc-scraper-rs' },
			{ label: 'crates.io', href: 'https://crates.io/crates/doc-scraper-rs' },
			{ label: 'docs.rs', href: 'https://docs.rs/doc-scraper-rs' }
		]
	},

	{
		name: 'Raisolo',
		org: 'MC² Finance',
		period: '2025 – 2026',
		stack: 'TypeScript · Cloudflare Workers · D1 · R2 · Vectorize · AI Gateway',
		summary: [
			'An AI news and content-intelligence platform: it reads everything — RSS, newsletters, podcasts, YouTube, the press — recognizes when sources are covering the same storyline, and turns the signal into personalized briefings and founder-ready LinkedIn posts. I was the second engineer on a two-person team and owned the backend: the ingestion pipeline, the clustering engine, and the AI infrastructure.'
		],
		details: [
			'The problem it solved: nobody can read everything written about their industry, and the same story shows up in a dozen places with a dozen slants. Raisolo ingests it all and folds overlapping coverage into a single knowledge-graph entry — one synthesized view where every fact, quote, and prediction traces back to its source. Each reader then sees the news through the lens of a "persona" that describes who they are and what they care about.',
			"The flagship of my work was the platform's second-generation backend. I wrote the system design first, then built it: content lands in raw storage, flows through a queue, and comes out the other side summarized, mined for facts and predictions by a multi-model pipeline, embedded into a vector index, and clustered into the shared knowledge graph. Designing before building is what made a backend of this size tractable while the product kept shipping.",
			'The intellectually hard part was clustering: when does a second article belong to an existing story? Thresholds that over-merge collapse distinct stories into blobs; ones that under-merge fragment them. I tuned the match empirically, with controlled experiments over real articles, landing on a two-signal similarity plus guardrails against the failure mode where one mega-cluster swallows everything — centroids that freeze, size caps, and splitting overgrown clusters.',
			'All model traffic ran through a gateway layer I built: provider failover, per-task model routing, and per-user usage and cost tracking. Model choices came from an eval harness rather than intuition — production extraction scored against a reference model and a judge — which is what decided which model handled which content type. Later I built the autonomous agent that operates on the knowledge base (browsing, drafting, refining, publishing) and the daily personalized newsletter.',
			"It shipped in production at raisolo.com, and the backend remained the platform's foundation after my tenure — the features that followed were built on top of the pipeline and clustering engine."
		],
		urls: [{ label: 'raisolo', href: 'https://www.raisolo.com' }]
	},
	{
		name: 'YieldFinder — MCP server & DeFi data pipeline',
		org: 'MC² Finance',
		period: '2025',
		stack: 'TypeScript · Cloudflare Workers · MCP · PostgreSQL · Drizzle · Typesense',
		summary: [
			'The data layer behind YieldFinder.ai: a pipeline that pulls DeFi vault and yield data from across the ecosystem into one coherent dataset, and an MCP server that lets AI agents query it — so an assistant can answer "where should I park stablecoins" from live data instead of stale training data. I built the pipeline and the agent-facing tools end to end.'
		],
		details: [
			'The problem it solved: DeFi yield data is scattered — every protocol publishes its own numbers through its own API, in its own shape, on its own schedule. The pipeline pulls from all of them continuously, normalizes the mess into a single dataset, and layers security and risk scoring on top. Without that, a question like "where can I park stablecoins" returns six half-compatible answers; with it, there is one trustworthy source of truth.',
			'The tool layer was designed for how models reason, not how humans browse. Agents ask through a handful of narrow, self-describing tools that return exactly the slice of vault or portfolio data they can reason over — never a raw dump of chain state — and risk framing travels with the data, so the agent explains yields honestly instead of improvising.',
			'The constraint that shaped the design: one risk-scoring provider allowed only fifty API calls a day — nowhere near enough to refresh the whole dataset. Freshness became a scheduling problem: contracts scored in rotating batches, the daily budget spread across days, failures retried on cooldown without ever breaching the limit. The ceiling exists; nobody using the product ever feels it.',
			"It shipped to production as the data backbone behind YieldFinder.ai and the company's AI assistant. Two subsystems went through deliberate refactors along the way: when an integration proved unreliable under real traffic, it was moved onto a sturdier data source rather than patched around — each refactor left the pipeline simpler than what it replaced."
		],
		urls: [
			{ label: 'yieldfinder ai', href: 'https://yieldfinder.ai/' },
			{ label: 'mcp.mc2.fi', href: 'https://mcp.mc2.fi' }
		]
	},
	{
		name: 'Albert — AI assistant for a DeFi terminal',
		org: 'MC² Finance',
		period: '2025',
		stack: 'TypeScript · Cloudflare Workers · Durable Objects · MCP · GPT-4o · AI Gateway',
		summary: [
			"The AI assistant embedded in MC²'s DeFi terminal: traders ask about tokens, wallets, and vaults in plain language, and Albert pulls the right data, analyzes it, and answers with the risks stated up front. I built it from an early scaffold into a production assistant, as part of the team behind the terminal."
		],
		details: [
			'What it did for the product: a trader could highlight a token or paste a wallet address and get a real answer in seconds — analysis, market context, portfolio breakdown — without leaving the terminal. The assistant connected to internal analytics APIs and a structured market search, streamed its reasoning over a persistent session, and remembered the conversation as it went.',
			'The hardest layer was trust. A financial assistant that sounds confident but gets risk wrong is worse than no assistant, so most of the product lived in how the agent was directed: which tool to reach for per question, when it was allowed to talk about vaults, and how yields were communicated — risks always stated, numbers framed by strength, no investment advice dressed up as fact. The system prompt was effectively the product spec.',
			'The architecture was refactored as the product found its shape. The tool server started inside the app itself; as the design matured, it moved out to its own service, with the agent connecting to it as a client. That separation made the assistant more resilient — if remote tools were unavailable, the connection degraded quietly in the background and the assistant kept working.',
			"It shipped in the terminal as the company's production assistant, and when the platform was later rearchitected, the decisions made here carried straight over — one agent per session, tools connected rather than hosted. For that successor I built the analytics layer, tracking the same user journey from both sides of the streaming connection."
		],
		urls: [{ label: 'mc2.fi', href: 'https://mc2.fi' }]
	},
	{
		name: 'MC² ETL - Real-time portfolio analytics pipeline',
		org: 'MC² Finance',
		period: '2024 – 2025',
		stack: 'Rust · TypeScript · AWS · Cloudflare Workers · Apache Pulsar · Flink · PostgreSQL',
		summary: [
			'The real-time data engine at the heart of MC² — the pipeline that watches wallets across the major EVM chains and Solana, and turns raw on-chain activity into the signals, portfolio histories, and profit-and-loss the product runs on. I led the data team behind it.'
		],
		details: [
			"The shape of the system: chain-data providers push new wallet activity into an ingestion edge; per-chain ingestion clients normalize raw transactions into one internal action model, so chain quirks — reorgs, differing token standards, Solana's account model — stay behind a single interface; queues carry the work through stateless indexing pipelines; and the outputs — buy/sell/swap signals, token lots, realized PnL — land in Postgres, where the product reads them. Everything a user sees in their portfolio is a query off the end of this pipeline.",
			"One bet shaped the architecture: don't operate blockchain nodes. Chain data comes from a bench of commercial providers behind a round-robin execution layer with retries, timeouts, and cooldowns, so a degraded provider is a routing decision rather than an outage. The tradeoff — trusting third-party APIs at the pipeline's edge — is exactly why the normalization layer matters: provider quirks never get past it.",
			'The pipeline went through generations while I was with the team: a Rust indexing service on AWS with an event-streaming backbone, then a re-architecture onto fully serverless Cloudflare Workers with managed queues. What made the rewrites affordable was the data contract — a normalized actions-and-signals schema that stayed stable across both, so downstream consumers never noticed the runtime change underneath.',
			'The engineering depth sat at the ends of the pipeline. On the way in: checkpoint-based resume so a wallet catches up cleanly after downtime, and self-pacing runs so a wallet with more history than one pass allows resumes where it left off. On the way out: FIFO token lots and weighted-average-cost profit derived from raw transfers. Underneath it all: capacity design that treated the database as the bottleneck, sized for a sustained stream of on-chain actions with a documented path to scale it tenfold.',
			'This pipeline fed everything the product knew about a wallet — portfolio pages, trading signals, the analytics behind the assistant — and it kept running while the platform around it was rebuilt, which is the quiet job of a data plane.'
		],
		urls: [{ label: 'mc2.fi', href: 'https://mc2.fi' }]
	},
	{
		name: 'MC² Studio',
		org: 'MC² Finance',
		period: '2024 – 2025',
		stack:
			'TypeScript · Cloudflare Workers · Durable Objects · Workflows · PostgreSQL · TimescaleDB',
		summary: [
			"The platform behind MC²'s DeFi terminal: the app, its public and wallet-authenticated APIs, and the backend services computing everything a user saw — portfolio returns, token security scores, whale discovery, yield opportunities. I was the core backend engineer: the ROI engines, the portfolio services, and the API layer were mine to build."
		],
		details: [
			'The backend was a family of services on Cloudflare Workers, and I built and owned most of them: the portfolio data platform with its batch workflows for fetching, processing, and indexing portfolios; the queue fabric connecting every service, with retries and dead-letter paths; and the shared library of database queries and provider wrappers everything else leaned on.',
			'The heart of the product was trust in the numbers, and the heart of the numbers was the ROI engine. I designed it to compute portfolio returns across multiple time windows from raw transaction streams — pure calculation behind provider interfaces, so it stayed testable independent of the services feeding it. The hard lessons were about data, not math: unrealistic returns almost always traced back to bad inputs — spam transactions, tiny starting values, missing price history. The engine grew tiered transaction filters and attribution metadata that explained why a number looked strange instead of quietly hiding it.',
			'The biggest improvement I drove was moving portfolio recomputation from batch processing to a per-portfolio state engine: one Durable Object per portfolio, holding exactly the state needed to recalculate, updating as each new transaction arrived, with periodic alarms for the slower-moving numbers and throttled writes to the search index. Portfolios updated in near real time instead of on a batch schedule, and the platform stopped paying to recompute portfolios nobody had touched.',
			"Around the portfolio engine sat the platform's other critical services. Mine included token security scoring, vault and yield-opportunity discovery with risk scores, and the calculators the interface rendered, from returns to trade-return volatility; with the team, I shared the wallet-signature authentication (Solana or EVM signatures) behind every user session, the price pipelines with marketcap-tiered refresh rates, and the typed API layer — open endpoints for anonymous browsing, wallet-authenticated ones for everything personal.",
			"It was the platform's production backbone for its entire life: the product ran on these services until the wind-down, and I closed that chapter the way it was built — a staged, rollback-first deprecation that kept every service recoverable to the end."
		],
		urls: [{ label: 'mc2.fi', href: 'https://mc2.fi' }]
	},
	{
		name: 'Dolpin IPFS',
		org: 'Dosier',
		period: '2022 – 2023',
		stack: 'Solidity · IPFS · ERC-4337',
		summary: [
			'A storage platform where access control lives on-chain: content pinned to IPFS, permissions held by Solidity smart contracts, and wallets authenticated through ERC-4337. Contributed to a ~20% increase in active users.'
		],
		details: [
			"The core design problem: IPFS is public by nature, so enforcement can't live in the storage layer. Smart contracts hold the policy; an off-chain service verifies proofs at the gateway before serving a single byte.",
			'On-chain and off-chain access control had to agree — the contract is the source of truth, the service is just the enforcer, and revoking access takes effect without touching the content.',
			'ERC-4337 removed the seed-phrase onboarding cliff: users get the wallet flows they already expect, and the contract layer does the rest.'
		],
		urls: [{ label: 'dolpin ipfs', href: 'https://www.producthunt.com/products/dolpin' }]
	},
	{
		name: 'Non-custodial Bitcoin Cash wallet',
		org: 'Signup.cash',
		period: '2020 – 2021',
		stack: 'Bitcoin Cash · SLP tokens · Cryptographic SDKs',
		summary: [
			'A non-custodial BCH wallet plus an NFT/SLP token factory and the cryptographic SDKs behind them. Users hold the keys; we hold nothing. Performance work on the wallet and transaction backend drove ~40% adoption growth.'
		],
		details: [
			'Non-custodial means the failure modes are all yours: key derivation, signing, and transaction construction had to be correct without any server-side safety net.',
			"The SDKs put that cryptography in third parties' hands — versioned APIs, documented SLP token metadata, and a token factory that made minting NFT/SLP tokens a few calls instead of a protocol implementation.",
			'The adoption win came from latency: profiling and tuning the wallet and transaction backend until everyday operations felt instant.'
		],
		urls: [{ label: 'signupcash', href: 'https://github.com/signupcash' }]
	},
	{
		name: 'DevSonket',
		org: 'Open source',
		stack: 'Community · Documentation',
		summary: [
			'The largest Bengali open-source cheatsheet project — reference material that lets developers learn in their own language, used across Bangladesh and beyond.'
		],
		details: [
			'The challenge was editorial more than technical: turning contributions from dozens of writers into consistent, versioned cheatsheets with a structure strangers can slot into.'
		],
		urls: [{ label: 'GitHub', href: 'https://github.com/devsonket/devsonket.github.io' }]
	}
];
