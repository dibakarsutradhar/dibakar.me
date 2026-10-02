'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Full-screen viewer for blog pictures.
 *
 * The markdown pipeline (rehype-pictures.js) wraps every figure image in
 * `<a data-zoomable href="full-size-image">`. Those links work on their own —
 * with JavaScript off they simply open the file — and this component upgrades
 * the click into an in-page viewer with keyboard navigation.
 *
 * Rendered once per post page; it listens on the window so it keeps working
 * after client-side navigation swaps the article underneath it.
 */

interface Item {
	src: string;
	alt: string;
	caption: string;
}

const SELECTOR = 'a[data-zoomable]';

export default function BlogLightbox() {
	const [items, setItems] = useState<Item[]>([]);
	const [index, setIndex] = useState(0);
	const [open, setOpen] = useState(false);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const lastTriggerRef = useRef<HTMLAnchorElement | null>(null);

	const current = items[index];

	const close = useCallback(() => {
		setOpen(false);
		lastTriggerRef.current?.focus();
		lastTriggerRef.current = null;
	}, []);

	const step = useCallback(
		(delta: number) => {
			if (items.length === 0) return;
			setIndex((i) => (i + delta + items.length) % items.length);
		},
		[items.length]
	);

	function collect(links: HTMLAnchorElement[]): Item[] {
		return links.map((link) => {
			const img = link.querySelector('img');
			const figure = link.closest('figure');
			return {
				src: link.getAttribute('href') ?? img?.getAttribute('src') ?? '',
				alt: img?.getAttribute('alt') ?? '',
				caption: figure?.querySelector('figcaption')?.textContent?.trim() ?? ''
			};
		});
	}

	useEffect(() => {
		function handleClick(event: MouseEvent) {
			const link = (event.target as Element | null)?.closest?.(
				SELECTOR
			) as HTMLAnchorElement | null;
			if (!link) return;

			const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(SELECTOR));
			const position = links.indexOf(link);
			if (position === -1) return;

			event.preventDefault();
			setItems(collect(links));
			setIndex(position);
			lastTriggerRef.current = link;
			setOpen(true);
		}

		function handleKeydown(event: KeyboardEvent) {
			if (!open) return;
			if (event.key === 'Escape') close();
			else if (event.key === 'ArrowLeft') step(-1);
			else if (event.key === 'ArrowRight') step(1);
			else if (event.key === 'Tab') {
				// Keep focus inside the dialog: the close button is the only stop
				// when there is a single image.
				event.preventDefault();
				closeButtonRef.current?.focus();
			}
		}

		window.addEventListener('click', handleClick);
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('click', handleClick);
			window.removeEventListener('keydown', handleKeydown);
		};
	}, [open, close, step]);

	// Focus the close button on open so Escape and Tab have somewhere to go,
	// and lock background scrolling while the viewer is open.
	useEffect(() => {
		if (!open) return;
		closeButtonRef.current?.focus();
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	}, [open]);

	if (!open || !current) return null;

	return (
		<div
			className="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label="Image viewer"
			tabIndex={-1}
		>
			{/* Clicking outside the image closes. A button rather than a click
			    handler on the overlay, so it is a real accessible control. */}
			<button
				className="lightbox__backdrop"
				onClick={close}
				tabIndex={-1}
				aria-label="Close image viewer"
			/>

			<button
				ref={closeButtonRef}
				className="lightbox__button lightbox__close"
				onClick={close}
				aria-label="Close image viewer"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path strokeLinecap="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>

			{items.length > 1 && (
				<>
					<button
						className="lightbox__button lightbox__nav lightbox__nav--prev"
						onClick={() => step(-1)}
						aria-label="Previous image"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</button>
					<button
						className="lightbox__button lightbox__nav lightbox__nav--next"
						onClick={() => step(1)}
						aria-label="Next image"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</>
			)}

			<figure className="lightbox__stage">
				{/* The image is itself a dismiss control: clicking the picture is
				    the first thing people try, and it used to do nothing. */}
				<button className="lightbox__dismiss" onClick={close} aria-label="Close image viewer">
					<img src={current.src} alt={current.alt} />
				</button>
				<figcaption>
					{current.caption && <span>{current.caption}</span>}
					{items.length > 1 && (
						<span className="lightbox__counter">
							{index + 1} / {items.length}
						</span>
					)}
					<span className="lightbox__hint">Click anywhere or press Esc to close</span>
				</figcaption>
			</figure>
		</div>
	);
}
