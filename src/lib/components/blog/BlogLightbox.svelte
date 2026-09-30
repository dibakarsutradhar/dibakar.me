<script lang="ts">
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

	let items = $state<Item[]>([]);
	let index = $state(0);
	let open = $state(false);
	let closeButton = $state<HTMLButtonElement | null>(null);
	let lastTrigger: HTMLAnchorElement | null = null;

	const current = $derived(items[index]);

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

	function handleClick(event: MouseEvent) {
		const link = (event.target as Element | null)?.closest?.(SELECTOR) as HTMLAnchorElement | null;
		if (!link) return;

		const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(SELECTOR));
		const position = links.indexOf(link);
		if (position === -1) return;

		event.preventDefault();
		items = collect(links);
		index = position;
		lastTrigger = link;
		open = true;
	}

	function close() {
		open = false;
		lastTrigger?.focus();
		lastTrigger = null;
	}

	function step(delta: number) {
		if (items.length === 0) return;
		index = (index + delta + items.length) % items.length;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!open) return;
		if (event.key === 'Escape') close();
		else if (event.key === 'ArrowLeft') step(-1);
		else if (event.key === 'ArrowRight') step(1);
		else if (event.key === 'Tab') {
			// Keep focus inside the dialog: the close button is the only stop when
			// there is a single image.
			event.preventDefault();
			closeButton?.focus();
		}
	}

	// Focus the close button on open so Escape and Tab have somewhere to go.
	$effect(() => {
		if (open) closeButton?.focus();
	});

	// Lock background scrolling while the viewer is open.
	$effect(() => {
		if (!open) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = previous;
		};
	});
</script>

<svelte:window onclick={handleClick} onkeydown={handleKeydown} />

{#if open && current}
	<div class="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" tabindex="-1">
		<!-- Clicking outside the image closes. A button rather than a click handler
		     on the overlay, so it is a real accessible control. -->
		<button
			class="lightbox__backdrop"
			onclick={close}
			tabindex="-1"
			aria-label="Close image viewer"
		></button>

		<button
			bind:this={closeButton}
			class="lightbox__button lightbox__close"
			onclick={close}
			aria-label="Close image viewer"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
				<path stroke-linecap="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		{#if items.length > 1}
			<button
				class="lightbox__button lightbox__nav lightbox__nav--prev"
				onclick={() => step(-1)}
				aria-label="Previous image"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>
			<button
				class="lightbox__button lightbox__nav lightbox__nav--next"
				onclick={() => step(1)}
				aria-label="Next image"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>
		{/if}

		<figure class="lightbox__stage">
			<!-- The image is itself a dismiss control: clicking the picture is the
			     first thing people try, and it used to do nothing. -->
			<button class="lightbox__dismiss" onclick={close} aria-label="Close image viewer">
				<img src={current.src} alt={current.alt} />
			</button>
			<figcaption>
				{#if current.caption}
					<span>{current.caption}</span>
				{/if}
				{#if items.length > 1}
					<span class="lightbox__counter">{index + 1} / {items.length}</span>
				{/if}
				<span class="lightbox__hint">Click anywhere or press Esc to close</span>
			</figcaption>
		</figure>
	</div>
{/if}

<style>
	.lightbox {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem 1.5rem;
		background: rgba(8, 11, 15, 0.94);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
	}

	.lightbox__backdrop {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		background: transparent;
		cursor: zoom-out;
	}

	.lightbox__stage {
		position: relative;
		z-index: 1;
		margin: 0;
		max-width: min(100%, 72rem);
		text-align: center;
		/* Let clicks that miss the picture fall through to the backdrop, so
		   "click anywhere to close" holds true for the caption strip too. */
		pointer-events: none;
	}

	.lightbox__dismiss {
		display: block;
		margin: 0 auto;
		border: 0;
		padding: 0;
		background: none;
		cursor: zoom-out;
		pointer-events: auto;
	}

	.lightbox__dismiss:focus-visible {
		outline: 2px solid #ffcfa0;
		outline-offset: 3px;
		border-radius: 0.75rem;
	}

	.lightbox__stage img {
		display: block;
		max-width: 100%;
		max-height: 72vh;
		margin: 0 auto;
		border-radius: 0.75rem;
		object-fit: contain;
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
	}

	.lightbox__hint {
		/* Its own line under the caption and counter. */
		flex-basis: 100%;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: rgba(228, 230, 235, 0.45);
	}

	.lightbox__stage figcaption {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: baseline;
		justify-content: center;
		margin-top: 1rem;
		font-size: 0.9375rem;
		line-height: 1.6;
		color: rgba(228, 230, 235, 0.75);
	}

	.lightbox__counter {
		font-size: 0.8125rem;
		color: rgba(228, 230, 235, 0.5);
	}

	.lightbox__button {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		/* Deliberately dark rather than glassy: these sit on top of the photo, and
		   a translucent white chip disappears over a bright image. */
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 999px;
		background: rgba(8, 11, 15, 0.68);
		box-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
		color: #ffffff;
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	.lightbox__button:hover {
		border-color: #ffcfa0;
		background: #ffcfa0;
		color: #0f1419;
	}

	.lightbox__button:focus-visible {
		outline: 2px solid #ffcfa0;
		outline-offset: 3px;
	}

	.lightbox__button svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.lightbox__close {
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
		width: 2.75rem;
		height: 2.75rem;
	}

	.lightbox__nav {
		position: absolute;
		top: 50%;
		width: 3rem;
		height: 3rem;
		transform: translateY(-50%);
	}

	.lightbox__nav--prev {
		left: 1.25rem;
	}

	.lightbox__nav--next {
		right: 1.25rem;
	}

	@media (max-width: 640px) {
		.lightbox {
			padding: 4rem 1rem;
		}

		.lightbox__nav {
			top: auto;
			bottom: 1.25rem;
			transform: none;
		}

		.lightbox__nav--prev {
			left: calc(50% - 3.5rem);
		}

		.lightbox__nav--next {
			right: calc(50% - 3.5rem);
		}
	}
</style>
