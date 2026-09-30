/**
 * Scroll-reveal action: adds the `reveal` class and flips `is-visible` the
 * first time the element enters the viewport. With `prefers-reduced-motion`
 * the CSS in app.css shows the element immediately.
 */
export function reveal(node: HTMLElement) {
	node.classList.add('reveal');

	if (typeof IntersectionObserver === 'undefined') {
		node.classList.add('is-visible');
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.add('is-visible');
					observer.disconnect();
				}
			}
		},
		{ threshold: 0.15 }
	);
	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
}
