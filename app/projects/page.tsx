import type { Metadata } from 'next';
import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';
import FloatingNav from '@/components/FloatingNav';
import { CLIENTS, PROJECTS } from '@/lib/projects';

export const metadata: Metadata = {
	title: 'Projects',
	description:
		'The work Dibakar Sutra Dhar has done for each company and client — the projects, the architecture decisions, tradeoffs, and the nitty gritty.',
	alternates: { canonical: '/projects' },
	openGraph: {
		url: '/projects',
		title: 'Projects | Dibakar Sutra Dhar',
		description:
			'The work Dibakar Sutra Dhar has done for each company and client — the projects, the architecture decisions, tradeoffs, and the nitty gritty.',
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

function projectsFor(clientId: string) {
	return PROJECTS.filter((project) => project.clientId === clientId);
}

export default function ProjectsPage() {
	return (
		<div className="min-h-screen bg-bg text-fg transition-colors duration-500">
			<FloatingNav />

			<main className="mx-auto max-w-5xl px-6 py-16">
				<header className="animate-[fadeIn_0.6s_ease-out_both]">
					<h1 className="m-0 text-4xl font-bold tracking-tight md:text-5xl">Projects</h1>
					<p className="mt-3 text-base font-medium tracking-wide text-muted md:text-lg">
						who I built for, and the nitty gritty behind it
					</p>
				</header>

				<div className="mt-16 grid animate-[fadeIn_0.6s_ease-out_0.15s_both] gap-12 lg:grid-cols-[15rem_1fr] lg:gap-16">
					{/* Left rail — companies/clients, one bracket per employer */}
					<aside className="self-start lg:sticky lg:top-16">
						<SectionLabel>Clients</SectionLabel>
						<nav
							aria-label="Clients"
							className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
						>
							{CLIENTS.map((client) => {
								const count = projectsFor(client.id).length;
								if (count === 0) return null;
								return (
									<a
										key={client.id}
										href={`#${client.id}`}
										className="group flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-line-soft/40"
									>
										{client.logo ? (
											<img
												src={client.logo}
												alt=""
												width={36}
												height={36}
												className="h-9 w-9 shrink-0 rounded-lg object-contain ring-1 ring-line-soft"
											/>
										) : (
											<span
												aria-hidden="true"
												className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-line-soft/60 text-sm font-semibold text-muted"
											>
												{client.name.charAt(0)}
											</span>
										)}
										<span>
											<span className="block text-sm font-semibold tracking-tight transition-colors group-hover:text-accent">
												{client.name}
											</span>
											<span className="block text-xs tracking-wide text-muted tabular-nums">
												{client.period ? `${client.period} · ` : ''}
												{count} {count === 1 ? 'project' : 'projects'}
											</span>
										</span>
									</a>
								);
							})}
						</nav>
					</aside>

					{/* Right column — that client's projects, one bracket per client */}
					<div className="min-w-0 space-y-16">
						{CLIENTS.map((client) => {
							const projects = projectsFor(client.id);
							if (projects.length === 0) return null;
							return (
								<section key={client.id} id={client.id} className="scroll-mt-16">
									<header className="flex items-center justify-between gap-4 border-b border-line-soft pb-4">
										<div>
											<h3 className="m-0 text-xl font-bold tracking-tight">{client.name}</h3>
											<p className="mt-1 text-xs tracking-wide text-muted">
												{client.role}
												{client.location ? ` · ${client.location}` : ''}
												{client.period ? ` · ${client.period}` : ''}
											</p>
										</div>
										{client.logo && (
											<img
												src={client.logo}
												alt=""
												width={48}
												height={48}
												className="h-12 w-12 shrink-0 rounded-xl object-contain ring-1 ring-line-soft"
											/>
										)}
									</header>

									<div className="mt-8 space-y-12">
										{projects.map((project, index) => (
											<article key={project.name}>
												<div className="flex items-baseline gap-4">
													<span
														className="text-sm font-medium text-accent tabular-nums"
														aria-hidden="true"
													>
														{String(index + 1).padStart(2, '0')}
													</span>
													<div className="min-w-0">
														<h4 className="m-0 text-lg font-semibold tracking-tight">
															{project.href ? (
																<Link
																	href={project.href}
																	className="transition-colors hover:text-accent"
																>
																	{project.name}
																</Link>
															) : (
																project.name
															)}
														</h4>
														<p className="mt-1 text-xs tracking-wide text-muted">
															{project.period ? `${project.period} · ` : ''}
															{project.stack}
														</p>
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
							);
						})}
					</div>
				</div>
			</main>

			<SiteFooter />
		</div>
	);
}
