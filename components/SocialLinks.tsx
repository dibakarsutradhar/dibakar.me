import Link from 'next/link';
import type { ReactNode } from 'react';

type IconLink = {
	label: string;
	href: string;
	/** External links open in a new tab; internal ones use next/link. */
	external?: boolean;
	/** Single path drawn with fill=currentColor (brand marks). */
	fillPath?: string;
	/** Elements drawn inside a 24x24 stroke svg (interface icons). */
	strokeIcon?: ReactNode;
};

const LINKS: IconLink[] = [
	{
		label: 'Product Hunt',
		href: 'https://www.producthunt.com/@dibakar',
		external: true,
		fillPath:
			'M13.604 8.4h-3.405V12h3.405c.995 0 1.801-.806 1.801-1.801 0-.993-.805-1.799-1.801-1.799zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804c2.319 0 4.2 1.88 4.2 4.199 0 2.321-1.881 4.201-4.201 4.201z'
	},
	{
		label: 'Goodreads',
		href: 'https://www.goodreads.com/user/show/160506739-dibakar',
		external: true,
		fillPath:
			'M11.43 23.995c-3.608-.208-6.274-2.077-6.448-5.078.695.007 1.375-.013 2.07-.006.224 1.342 1.065 2.43 2.683 3.026 1.583.496 3.737.46 5.082-.174 1.351-.636 2.145-1.822 2.503-3.577.212-1.042.236-1.734.231-2.92l-.005-1.631h-.059c-1.245 2.564-3.315 3.53-5.59 3.475-5.74-.054-7.68-4.534-7.528-8.606.01-5.241 3.22-8.537 7.557-8.495 2.354-.14 4.605 1.362 5.554 3.37l.059.002.002-2.918 2.099.004-.002 15.717c-.193 7.04-4.376 7.89-8.209 7.811zm6.1-15.633c-.096-3.26-1.601-6.62-5.503-6.645-3.954-.017-5.625 3.592-5.604 6.85-.013 3.439 1.643 6.305 4.703 6.762 4.532.591 6.551-3.411 6.404-6.967z'
	},
	{
		label: 'GitHub',
		href: 'https://github.com/dibakarsutradhar',
		external: true,
		fillPath:
			'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z'
	},
	{
		label: 'LinkedIn',
		href: 'https://www.linkedin.com/in/dibakarsutradhar',
		external: true,
		fillPath:
			'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z'
	},
	{
		label: 'X',
		href: 'https://x.com/d1bakar',
		external: true,
		fillPath:
			'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z'
	},
	{
		label: 'crates.io',
		href: 'https://crates.io/users/dibakarsutradhar',
		external: true,
		strokeIcon: (
			<>
				<line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
				<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
				<polyline points="3.27 6.96 12 12.01 20.73 6.96" />
				<line x1="12" y1="22.08" x2="12" y2="12" />
			</>
		)
	},
	{
		label: 'Medium',
		href: 'https://medium.com/@imdibakar',
		external: true,
		fillPath:
			'M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z'
	},
	{
		label: 'Email',
		href: 'mailto:iamdibakardipu@gmail.com',
		strokeIcon: (
			<>
				<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
				<polyline points="22,6 12,13 2,6" />
			</>
		)
	}
];

/** Icon links shown under the role on the home page. On mobile the row
    swipes horizontally (edge fades hint at more); from `sm` up all nine fit
    and the row is centered, never scrollable. */
export default function SocialLinks() {
	return (
		<div className="relative w-full min-w-0 sm:w-fit">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-bg to-transparent sm:hidden"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-bg to-transparent sm:hidden"
			/>
			<ul className="no-scrollbar flex items-center gap-4 overflow-x-auto sm:justify-center sm:gap-5 sm:overflow-visible">
				{LINKS.map((link) => {
					const inner = link.fillPath ? (
						<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d={link.fillPath} />
						</svg>
					) : (
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-hidden="true"
						>
							{link.strokeIcon}
						</svg>
					);
					const className =
						'flex h-12 w-12 items-center justify-center rounded-full bg-card text-fg transition-all duration-300 hover:-translate-y-1 hover:bg-hover';

					return (
						<li key={link.label} className="shrink-0">
							{link.external ? (
								<a
									href={link.href}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={link.label}
									className={className}
								>
									{inner}
								</a>
							) : (
								<Link href={link.href} aria-label={link.label} className={className}>
									{inner}
								</Link>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
