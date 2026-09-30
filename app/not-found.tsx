import Link from 'next/link';

/** Static-exported to out/404.html — GitHub Pages serves it for unknown routes. */
export default function NotFound() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center gap-6 px-8 text-center">
			<h1 className="text-6xl font-bold tracking-tight">
				<span className="text-gradient bg-gradient-to-r from-fg via-accent to-fg">404</span>
			</h1>
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
	);
}
