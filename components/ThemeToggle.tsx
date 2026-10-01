'use client';

/**
 * Theme switch. The pre-paint script in app/layout.tsx sets data-theme on
 * <html>, so this component never owns the state: it just flips the attribute
 * and persists the choice. Both icons render and CSS picks the visible one,
 * which keeps server and client markup identical (no hydration flash).
 * Positioning is the caller's job (fixed float on standalone pages, inline in
 * the blog nav), passed via className.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
	function toggleTheme() {
		const root = document.documentElement;
		const dark = root.dataset.theme !== 'dark';
		root.dataset.theme = dark ? 'dark' : 'light';
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch {
			// Private mode etc. — the toggle still works for this page view.
		}
	}

	return (
		<button
			onClick={toggleTheme}
			aria-label="Toggle color theme"
			className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 hover:bg-hover ${className}`}
		>
			{/* Sun: shown in dark mode (clicking switches to light). */}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				aria-hidden="true"
				className="hidden [html[data-theme=dark]_&]:block"
			>
				<circle cx="12" cy="12" r="5" />
				<line x1="12" y1="1" x2="12" y2="3" />
				<line x1="12" y1="21" x2="12" y2="23" />
				<line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
				<line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
				<line x1="1" y1="12" x2="3" y2="12" />
				<line x1="21" y1="12" x2="23" y2="12" />
				<line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
				<line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
			</svg>
			{/* Moon: shown in light mode (clicking switches to dark). */}
			<svg
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				aria-hidden="true"
				className="block [html[data-theme=dark]_&]:hidden"
			>
				<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
			</svg>
		</button>
	);
}
