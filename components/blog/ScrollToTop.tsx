'use client';

import { useEffect, useState } from 'react';

/**
 * "Jump to top" button for long blog posts. Hidden until the reader has
 * scrolled a screen or so, then floats bottom-right and smooth-scrolls back.
 */
export default function ScrollToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		function onScroll() {
			setVisible(window.scrollY > 400);
		}
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	return (
		<button
			onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
			aria-label="Jump to top"
			className={`fixed right-5 bottom-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-line-soft bg-bg text-muted shadow-lg transition-all duration-300 hover:bg-hover hover:text-fg ${
				visible ? 'opacity-100' : 'pointer-events-none opacity-0'
			}`}
		>
			<svg
				className="h-5 w-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
			</svg>
		</button>
	);
}
