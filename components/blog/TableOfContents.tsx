'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/blog/toc';

/**
 * Sticky "on this page" list shown beside long blog posts. Highlights the
 * section the reader is currently in and smooth-scrolls to headings on click.
 * Positioning (sticky column) is owned by the post page; this only renders
 * the list and tracks the active heading.
 */
export default function TableOfContents({ items }: { items: TocItem[] }) {
	const [activeId, setActiveId] = useState<string | null>(null);

	useEffect(() => {
		function onScroll() {
			let current: string | null = null;
			for (const item of items) {
				const el = document.getElementById(item.id);
				if (el && el.getBoundingClientRect().top <= 120) {
					current = item.id;
				}
			}
			setActiveId(current);
		}
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, [items]);

	function jump(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
		e.preventDefault();
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(null, '', `#${id}`);
	}

	return (
		<nav aria-label="Table of contents">
			<p className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">On this page</p>
			<ul className="space-y-1 border-l border-line-soft text-sm">
				{items.map((item) => {
					const active = item.id === activeId;
					return (
						<li key={item.id}>
							<a
								href={`#${item.id}`}
								onClick={(e) => jump(e, item.id)}
								className={`-ml-px block border-l-2 px-3 py-1 transition-colors ${
									item.level === 3 ? 'pl-6' : ''
								} ${
									active
										? 'border-accent text-accent'
										: 'border-transparent text-muted hover:border-line hover:text-fg'
								}`}
							>
								{item.text}
							</a>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
