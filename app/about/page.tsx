import type { Metadata } from 'next';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import FloatingNav from '@/components/FloatingNav';
import { PROJECTS } from '@/lib/projects';
import { SITE_ROLE, SITE_TITLE } from '@/lib/site';

export const metadata: Metadata = {
	title: 'About',
	description:
		'Dibakar Sutra Dhar — senior software engineer in Dhaka, Bangladesh, building web platforms and securing web3 systems.',
	alternates: { canonical: '/about' },
	openGraph: {
		url: '/about',
		title: 'About | Dibakar Sutra Dhar',
		description:
			'Dibakar Sutra Dhar — senior software engineer in Dhaka, Bangladesh, building web platforms and securing web3 systems.',
		images: ['/images/og-card.png']
	},
	twitter: { card: 'summary_large_image' }
};

const STACK: Array<[string, string]> = [
	['Core', 'Rust, TypeScript, Node.js, Python'],
	['Backend', 'Tokio, Axum, gRPC/Protobuf, microservices, distributed systems, ETL/ELT'],
	['Infra', 'Cloudflare Workers, AWS, Kafka, Flink, Docker, Kubernetes, Terraform'],
	['Data', 'PostgreSQL, Redis, Snowflake, IPFS, MongoDB, GraphDB, VectorDB'],
	['AI', 'LiteLLM, AI agents & gateway, MCP, n8n, context engineering'],
	['Observability', 'Grafana, OpenTelemetry, Datadog, Sentry, PostHog'],
	['Chain', 'Solidity, EVM chains, Solana']
];

/** Current interests — the "What I'm Exploring" block. */
const EXPLORING: Array<[string, string]> = [
	[
		'ORBIT',
		'A personal Rust-based systems engineering project focused on exploring event-driven architecture, domain modeling, persistence, and distributed systems from first principles.'
	],
	[
		'AI Inference Engineering',
		'Understanding the internals of LLMs, inference runtimes, memory management, parallelism, and model optimization, with an emphasis on running models efficiently rather than relying solely on hosted APIs.'
	],
	[
		'Embedded Systems & ECU Programming',
		'Exploring low-level programming, automotive control systems, motorcycle ECU architecture, diagnostic protocols, and the engineering behind independent diagnostic tools.'
	],
	[
		'UI/UX Design Principles',
		'Studying cognitive load, information hierarchy, accessibility, and visual clarity, particularly in complex enterprise applications where usability and sustained focus matter as much as functionality.'
	]
];

const ELSEWHERE = [
	{ label: 'GitHub', href: 'https://github.com/dibakarsutradhar' },
	{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/dibakarsutradhar' },
	{ label: 'Medium', href: 'https://medium.com/@imdibakar' },
	{ label: 'résumé', href: '/Dibakar_Sutra_Dhar_Senior_SWE.pdf' }
];

/** Small-caps section label shared by every block on the page. */
function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="m-0 text-xs font-semibold tracking-[0.2em] text-muted uppercase">
			{children}
		</h2>
	);
}

export default function AboutPage() {
	return (
		<div className="min-h-screen bg-bg text-fg transition-colors duration-500">
			<FloatingNav />

			<main className="mx-auto max-w-2xl px-6 py-16">
				<header className="animate-[fadeIn_0.6s_ease-out_both]">
					<h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">
						{SITE_TITLE}
					</h1>
					<p className="mt-3 text-base font-medium tracking-wide text-muted md:text-lg">
						{SITE_ROLE}
					</p>
				</header>

				<section className="animate-[fadeIn_0.6s_ease-out_0.15s_both] mt-12">
					<div className="space-y-4 text-base leading-relaxed text-pretty">
						<p>
							I build <strong className="font-semibold">distributed backends</strong>,{' '}
							<strong className="font-semibold">high-performance Rust systems</strong>,{' '}
							<strong className="font-semibold">data infrastructure</strong>, and products from
							the ground up.
						</p>
						<p>
							Over the past six years I&apos;ve worked across the software engineering landscape —
							from blockchain infrastructure and real-time data pipelines to AI agents, fintech,
							and multi-tenant SaaS — for teams across Switzerland, the US, Singapore, and
							Malaysia. I&apos;m currently building{' '}
							<strong className="font-semibold">Jemeti</strong>, a workshop management platform,
							and recently shipped <strong className="font-semibold">InvoisOS</strong>, an
							invoicing platform used by businesses in Malaysia.
						</p>
						<p>
							My work spans Rust, distributed architectures, data engineering, cloud
							infrastructure, and AI systems —{' '}
							<span className="text-muted">
								blockchain data pipelines, non-custodial wallets, AI-powered tooling, and backends
								built for consistency, isolation, and reliability under live workloads.
							</span>{' '}
							I&apos;ve also taken products from architecture and infrastructure design through
							CI/CD and cloud deployments to production operations.
						</p>
						<p>
							I&apos;m most interested in the challenges that aren&apos;t immediately visible:{' '}
							<span className="text-muted">
								data consistency across distributed services, resilience under failure, low-latency
								processing, secure access control, and the infrastructure decisions that shape a
								product&apos;s long-term scalability.
							</span>{' '}
							I enjoy the full lifecycle — designing system architecture, building core services,
							then deploying, observing, and maintaining them in production.
						</p>
					</div>
				</section>

				<section className="animate-[fadeIn_0.6s_ease-out_0.25s_both] mt-16">
					<SectionLabel>What I&apos;m Exploring</SectionLabel>
					<p className="mt-4 text-base leading-relaxed text-pretty">
						My interests have been expanding beyond conventional backend engineering into areas
						that connect software, hardware, and human interaction.
					</p>
					<dl className="mt-5 grid gap-y-4 text-[15px] leading-relaxed">
						{EXPLORING.map(([topic, blurb]) => (
							<div key={topic}>
								<dt className="font-semibold">{topic}</dt>
								<dd className="mt-0.5 m-0 text-muted text-pretty">{blurb}</dd>
							</div>
						))}
					</dl>
					<p className="mt-5 text-sm leading-relaxed text-muted text-pretty">
						These interests give me opportunities to explore engineering problems at different
						levels of abstraction, from machine-level operations to the experience of the person
						using the finished product.
					</p>
				</section>

				{/* <section className="animate-[fadeIn_0.6s_ease-out_0.25s_both] mt-16">
					<SectionLabel>Projects</SectionLabel>
					<p className="mt-4 text-base leading-relaxed">
						Long-form write-ups of the things I&apos;ve built —{' '}
						<span className="text-muted">
							{PROJECTS.map((p) => p.name).join(', ')} — the architecture decisions, tradeoffs,
							and the nitty gritty behind each one.
						</span>{' '}
						<Link
							href="/projects"
							className="whitespace-nowrap text-accent underline decoration-line-soft underline-offset-4 transition-colors hover:decoration-accent"
						>
							Read the deep-dives ↗
						</Link>
					</p>
				</section> */}

				<section className="animate-[fadeIn_0.6s_ease-out_0.35s_both] mt-16">
					<SectionLabel>Stack</SectionLabel>
					<dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-6 gap-y-3 text-sm">
						{STACK.map(([area, tools]) => (
							<div key={area} className="contents">
								<dt className="pt-px font-semibold">{area}</dt>
								<dd className="m-0 text-muted">{tools}</dd>
							</div>
						))}
					</dl>
				</section>

				<section className="animate-[fadeIn_0.6s_ease-out_0.45s_both] mt-14">
					<SectionLabel>Contact</SectionLabel>
					<p className="mt-4 text-base leading-relaxed">
						The fastest way to reach me is{' '}
						<a
							href="mailto:iamdibakardipu@gmail.com"
							className="text-accent underline decoration-line-soft underline-offset-4 transition-colors hover:decoration-accent"
						>
							iamdibakardipu@gmail.com
						</a>{' '}
					</p>
					<p className="mt-3 text-sm text-muted">
						Also on{' '}
						{ELSEWHERE.map((link, index) => (
							<span key={link.label}>
								<a
									href={link.href}
									{...(link.href.startsWith('http')
										? { target: '_blank', rel: 'noopener noreferrer' }
										: {})}
									className="transition-colors hover:text-accent"
								>
									{link.label}
								</a>
								{index < ELSEWHERE.length - 2 ? ', ' : index < ELSEWHERE.length - 1 ? ' or ' : '.'}
							</span>
						))}
					</p>
				</section>
			</main>

			<SiteFooter />
		</div>
	);
}
