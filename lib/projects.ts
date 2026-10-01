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
		name: 'doc-scraper-rs',
		org: 'Open source',
		period: '2026',
		stack: 'Rust · Tokio · reqwest · llms.txt · AGENTS.md',
		summary: [
			'A CLI that exports GitBook and Mintlify docs as a clean markdown mirror tree — by hitting each site\'s hidden text/markdown endpoint directly instead of parsing HTML — with llms.txt, llms-full.txt, and AGENTS.md sidecars generated for LLM and AI-agent ingestion.'
		],
		details: [
			'The core bet: GitBook\'s Next.js sites serve every page twice — a 380–770 KB React shell and a clean text/markdown payload at the same URL with `.md` appended. Asking for the markdown endpoint first means one request per page and zero HTML parsing.',
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
		name: 'Real-time portfolio analytics',
		org: 'MC² Finance',
		period: '2024 – 2026',
		stack: 'Rust · TypeScript · Cloudflare Workers · EVM + Solana RPC · Snowflake',
		summary: [
			'The engine behind MC² Finance: a pipeline that watches raw blockchain activity across the major EVM chains and Solana, and turns it into live portfolio views for 50k+ users — 30k+ of them active — with queries answering in ~10ms.'
		],
		details: [
			'Ingestion starts at the edge of the chain: raw JSON-RPC feeds from multiple nodes alongside Snowflake warehouse data, normalized into one event model so chain-specific quirks — reorgs, nonce replays, Solana\'s account model — stay behind a single interface.',
			'The core pipeline was Rust end-to-end: parse, deduplicate, aggregate, and write into a timeseries store, tuned until portfolio queries held ~10ms under live load.',
			'I later re-architected the hot path in TypeScript on Cloudflare Workers — per-domain isolation, better edge scalability, and deploys that don\'t take the whole pipeline down with them.',
			'The interesting constraint was freshness per unit of cost: keeping 30k portfolios current means deciding, per chain, what to stream, what to batch, and what to compute only when someone actually looks.'
		],
		urls: [{ label: 'mc2.fi', href: 'https://mc2.fi' }]
	},
	{
		name: 'Raisolo',
		org: 'MC² Finance',
		period: '2026',
		stack: 'LLM APIs · AI agents · Workflow orchestration',
		summary: [
			'An AI research and content-automation platform: agents that research DeFi projects and turn raw findings into publishable material, integrating a whole bench of LLM providers rather than betting on one.'
		],
		details: [
			'The LLM layer is provider-agnostic by design — requests route across multiple model providers with fallbacks, so a degraded or rate-limited provider becomes a routing decision, not an outage.',
			'Agent workflows decompose a research task into discrete steps — gather, verify, draft, review — so each stage can be retried, swapped, or audited independently of the rest.',
			'The hard part was trust: model output that reads well but isn\'t true. Structured outputs and verification at every boundary, so downstream stages never take a draft at its word.'
		],
		urls: [{ label: 'raisolo', href: 'https://www.raisolo.com' }]
	},
	{
		name: 'YieldFinder',
		org: 'MC² Finance',
		period: '2026',
		stack: 'MCP · AI gateway pipelines',
		summary: [
			'An MCP server and AI gateway that let agents analyze live DeFi vaults and portfolio data — the bridge between a model\'s context window and on-chain state.'
		],
		details: [
			'Designed the tool surface: narrow, typed MCP tools that return exactly the slice of vault and portfolio data an agent can reason over, instead of dumping raw chain state into context.',
			'A gateway pipeline sits in front of every agent client — authentication, rate limiting, and response shaping applied once, in one place.',
			'ERC-4337 account abstraction wallet flows run through the same edge, bridging on-chain identity and off-chain sessions.'
		],
		urls: [{ label: 'yieldfinder ai', href: 'https://yieldfinder.ai/' }]
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
			'The core design problem: IPFS is public by nature, so enforcement can\'t live in the storage layer. Smart contracts hold the policy; an off-chain service verifies proofs at the gateway before serving a single byte.',
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
			'The SDKs put that cryptography in third parties\' hands — versioned APIs, documented SLP token metadata, and a token factory that made minting NFT/SLP tokens a few calls instead of a protocol implementation.',
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
