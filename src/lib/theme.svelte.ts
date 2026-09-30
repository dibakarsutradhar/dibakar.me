/**
 * Shared theme state. The actual attribute is set on <html> before first
 * paint (inline script in app.html); this store mirrors it so any component
 * — home sections and the blog shell alike — can read and toggle it without
 * prop drilling.
 */
export const theme = $state({ dark: true });

export function initTheme() {
	theme.dark = document.documentElement.dataset.theme !== 'light';
}

export function toggleTheme() {
	theme.dark = !theme.dark;
	document.documentElement.dataset.theme = theme.dark ? 'dark' : 'light';
	try {
		localStorage.setItem('theme', theme.dark ? 'dark' : 'light');
	} catch {
		// Storage unavailable (private mode etc.): the choice just won't persist.
	}
}
