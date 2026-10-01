'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/blog', label: 'Blog' },
	{ href: '/projects', label: 'Projects' },
	{ href: '/about', label: 'About' }
];

/**
 * Site navigation floating in the top-right corner of every page. Desktop
 * shows inline text links with the current section in accent; mobile
 * collapses into a hamburger with a small animated dropdown. The current
 * section is rendered as static accent text (not a link) in both.
 */
export default function NavMenu() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);

	const isActive = (href: string) =>
		href === '/' ? pathname === '/' : pathname.startsWith(href);

	// Close on Escape so keyboard users aren't trapped in the open state.
	useEffect(() => {
		if (!open) return;
		function onKey(event: KeyboardEvent) {
			if (event.key === 'Escape') setOpen(false);
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	return (
		<nav aria-label="Site navigation" className="relative">
			{/* Desktop: inline text links. */}
			<div className="hidden items-center gap-5 sm:flex">
				{NAV_LINKS.map((link) =>
					isActive(link.href) ? (
						<span key={link.href} className="text-sm text-accent" aria-current="page">
							{link.label}
						</span>
					) : (
						<Link
							key={link.href}
							href={link.href}
							className="text-sm text-muted transition-colors hover:text-fg"
						>
							{link.label}
						</Link>
					)
				)}
			</div>

			{/* Mobile: hamburger toggle. */}
			<button
				type="button"
				onClick={() => setOpen((current) => !current)}
				aria-expanded={open}
				aria-label={open ? 'Close navigation' : 'Open navigation'}
				className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-fg transition-colors hover:bg-hover sm:hidden"
			>
				<svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					aria-hidden="true"
				>
					{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
				</svg>
			</button>

			{/* Mobile dropdown + invisible click-away backdrop. */}
			{open && (
				<>
					<button
						type="button"
						aria-label="Close navigation"
						className="fixed inset-0 z-40 cursor-default"
						onClick={() => setOpen(false)}
					/>
					<div className="absolute top-12 right-0 z-50 w-40 origin-top-right rounded-xl border border-line-soft bg-bg/95 p-2 shadow-lg animate-[menuIn_0.18s_ease-out_both] sm:hidden">
						{NAV_LINKS.map((link) =>
							isActive(link.href) ? (
								<span
									key={link.href}
									aria-current="page"
									className="block rounded-lg px-4 py-2 text-sm text-accent"
								>
									{link.label}
								</span>
							) : (
								<Link
									key={link.href}
									href={link.href}
									onClick={() => setOpen(false)}
									className="block rounded-lg px-4 py-2 text-sm text-fg transition-colors hover:bg-hover"
								>
									{link.label}
								</Link>
							)
						)}
					</div>
				</>
			)}
		</nav>
	);
}
