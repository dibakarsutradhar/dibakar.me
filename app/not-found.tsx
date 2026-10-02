import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

/** Static-exported to out/404.html — GitHub Pages serves it for unknown routes. */
export default function NotFound() {
	return (
		<>
			<ThemeToggle className="fixed top-5 right-5 z-50" />
			<main className="flex min-h-screen flex-col items-center justify-center gap-6 px-8 text-center">
				<h1 className="text-6xl font-bold tracking-tight">404</h1>
				<p className="text-lg text-muted">This page does not exist.</p>
				<div className="flex gap-6 text-sm">
					<Link href="/" className="text-accent underline transition-opacity hover:opacity-80">
						Home
					</Link>
					<Link href="/blog" className="text-accent underline transition-opacity hover:opacity-80">
						Blog
					</Link>
				</div>
			</main>
		</>
	);
}
