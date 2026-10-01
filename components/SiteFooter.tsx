/** Shared footer for the subpages (blog, about). */
export default function SiteFooter() {
	return (
		<footer className="border-t border-line-soft px-8 py-12 text-center">
			<p className="m-0 text-sm text-muted">
				© {new Date().getFullYear()} Dibakar. Crafted with precision and passion.
			</p>
		</footer>
	);
}
