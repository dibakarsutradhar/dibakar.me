import type { Metadata } from 'next';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import FloatingNav from '@/components/FloatingNav';
import { PROJECTS } from '@/lib/projects';

export const metadata: Metadata = {
	title: 'Projects',
	description:
		'Deep-dives into the projects Dibakar Sutra Dhar has built — the architecture decisions, tradeoffs, and the nitty gritty.',
	alternates: { canonical: '/projects' },
	openGraph: {
		url: '/projects',
		title: 'Projects | Dibakar Sutra Dhar',
		description:
			'Deep-dives into the projects Dibakar Sutra Dhar has built — the architecture decisions, tradeoffs, and the nitty gritty.',
		images: ['/images/og-card.png']
	},
	twitter: { card: 'summary_large_image' }
};

/** Small-caps section label shared with the about page. */
function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="m-0 text-xs font-semibold tracking-[0.2em] text-muted uppercase">{children}</h2>
	);
}

export default function ProjectsPage() {
	return (
		<div className="min-h-screen bg-bg text-fg transition-colors duration-500">
			<FloatingNav />

			<main className="mx-auto max-w-2xl px-6 py-16">
				<header className="animate-[fadeIn_0.6s_ease-out_both]">
					<h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">Projects</h1>
					<p className="mt-3 text-base font-medium tracking-wide text-muted md:text-lg">
						what I built, and the nitty gritty behind it
					</p>
				</header>

				<section className="mt-16 animate-[fadeIn_0.6s_ease-out_0.15s_both]">
					<SectionLabel>Deep-dives</SectionLabel>
					<div className="mt-8 space-y-14">
						{PROJECTS.map((project, index) => (
							<article key={project.name}>
								<div className="flex items-start justify-between gap-4">
									<div className="flex items-baseline gap-4">
										<span
											className="text-sm font-medium text-accent tabular-nums"
											aria-hidden="true"
										>
											{String(index + 1).padStart(2, '0')}
										</span>
										<div>
											<h3 className="m-0 text-lg font-semibold tracking-tight">
												{project.href ? (
													<Link href={project.href} className="transition-colors hover:text-accent">
														{project.name}
													</Link>
												) : (
													project.name
												)}
											</h3>
											<p className="mt-1 text-xs tracking-wide text-muted">
												{project.org}
												{project.period ? ` · ${project.period}` : ''}
											</p>
											<p className="mt-1 text-xs tracking-wide text-accent/80">{project.stack}</p>
											{(project.urls?.length || project.href) && (
												<p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
													{project.urls?.map((link) => (
														<a
															key={link.href}
															href={link.href}
															target="_blank"
															rel="noopener noreferrer"
															className="text-xs text-muted transition-colors hover:text-accent"
														>
															{link.label} <span aria-hidden="true">↗</span>
														</a>
													))}
													{project.href && (
														<Link
															href={project.href}
															className="text-xs text-accent transition-opacity hover:opacity-80"
														>
															blog write-up <span aria-hidden="true">↗</span>
														</Link>
													)}
												</p>
											)}
										</div>
									</div>
									{project.logo && (
										<img
											src={project.logo}
											alt=""
											width={48}
											height={48}
											className="h-12 w-12 shrink-0 rounded-xl ring-1 ring-line-soft"
										/>
									)}
								</div>

								<div className="mt-4 space-y-3 text-[15px] leading-relaxed">
									{project.summary.map((paragraph) => (
										<p key={paragraph}>{paragraph}</p>
									))}
								</div>

								<details className="group mt-4">
									<summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
										<span
											className="inline-block text-accent transition-transform duration-200 group-open:rotate-45"
											aria-hidden="true"
										>
											+
										</span>
										<span className="group-open:hidden">the nitty gritty</span>
										<span className="hidden group-open:inline">close</span>
									</summary>
									<div className="mt-3 space-y-3 border-l border-line-soft pl-4 text-sm leading-relaxed text-muted">
										{project.details.map((paragraph) => (
											<p key={paragraph}>{paragraph}</p>
										))}
									</div>
								</details>
							</article>
						))}
					</div>
				</section>
			</main>

			<SiteFooter />
		</div>
	);
}
