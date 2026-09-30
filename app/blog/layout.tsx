import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import '../globals.css';
import '@/lib/blog/blog-images.css';
import '@/lib/blog/prose.css';
import '@/lib/blog/lightbox.css';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-bg text-fg transition-colors duration-500">
			{/* Blog navigation */}
			<nav
				className="sticky top-0 z-50 border-b border-line-soft bg-bg/95 backdrop-blur-sm"
				aria-label="Blog navigation"
			>
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
					<Link
						href="/"
						className="text-xl font-bold tracking-tight transition-colors hover:text-accent"
					>
						dibakar
					</Link>
					<div className="flex items-center gap-6">
						<Link href="/" className="text-sm text-muted transition-colors hover:text-fg">
							Home
						</Link>
						<span className="text-sm text-accent" aria-current="page">
							Blog
						</span>
						<ThemeToggle />
					</div>
				</div>
			</nav>

			<main>{children}</main>

			{/* Footer */}
			<footer className="border-t border-line-soft px-8 py-12 text-center">
				<p className="m-0 text-sm text-muted">
					© {new Date().getFullYear()} Dibakar. Crafted with precision and passion.
				</p>
			</footer>
		</div>
	);
}
