import FloatingNav from '@/components/FloatingNav';
import SiteFooter from '@/components/SiteFooter';
import '../globals.css';
import '@/lib/blog/blog-images.css';
import '@/lib/blog/prose.css';
import '@/lib/blog/lightbox.css';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-bg text-fg transition-colors duration-500">
			<FloatingNav />

			<main>{children}</main>

			<SiteFooter />
		</div>
	);
}
