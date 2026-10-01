import type { Metadata, Viewport } from 'next';
import { SITE_TITLE, SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: `${SITE_TITLE} — Senior Software Engineer`,
		template: `%s | ${SITE_TITLE}`
	},
	description:
		'Senior software engineer building ai inference and distributed systems. Writing about software engineering, web3, and ai engineering.',
	alternates: { canonical: '/' },
	icons: {
		icon: [
			{ url: '/favicon-dark.svg' },
			{ url: '/favicon-light.svg', media: '(prefers-color-scheme: light)' }
		],
		apple: '/favicon-dark.svg'
	},
	openGraph: {
		type: 'website',
		siteName: SITE_TITLE,
		url: SITE_URL,
		title: `${SITE_TITLE} — Senior Software Engineer`,
		description:
			'Senior software engineer building ai inference and distributed systems. Writing about software engineering, web3, and ai engineering.',
		images: [{ url: '/images/og-card.png', width: 1200, height: 630 }]
	},
	twitter: { card: 'summary_large_image' }
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	themeColor: [
		{ media: '(prefers-color-scheme: dark)', color: '#0f1419' },
		{ media: '(prefers-color-scheme: light)', color: '#f0f0f0' }
	]
}

/**
 * Set the theme before first paint so the correct palette is applied without a
 * flash: stored choice wins, else the OS preference. Runs from an inline script
 * (not a module) so it executes while the document is still parsing; the html
 * element carries suppressHydrationWarning because this mutates data-theme
 * before React hydrates.
 */
const themeScript = `(() => {
	try {
		const stored = localStorage.getItem('theme');
		const dark = stored ? stored === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
		document.documentElement.dataset.theme = dark ? 'dark' : 'light';
	} catch {
		document.documentElement.dataset.theme = 'dark';
	}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				{/* Space Grotesk is self-hosted (@font-face in globals.css). Preload
				    the two weights used above the fold so the swap happens before
				    first paint. */}
				<link rel="preload" href="/fonts/space-grotesk-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
				<link rel="preload" href="/fonts/space-grotesk-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
			</head>
			<body className="bg-bg font-sans text-fg antialiased transition-colors duration-500">
				{children}
			</body>
		</html>
	);
}
