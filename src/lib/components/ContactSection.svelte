<script lang="ts">
	import { reveal } from '../actions/reveal';

	const EMAIL = 'iamdibakardipu@gmail.com';

	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout>;

	async function copyEmail() {
		try {
			await navigator.clipboard.writeText(EMAIL);
			copied = true;
			clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard blocked (e.g. insecure context): fall back to opening mail.
			window.location.href = `mailto:${EMAIL}`;
		}
	}
</script>

<section
	id="contact"
	class="mx-auto flex min-h-screen max-w-[800px] flex-1 scroll-mt-24 flex-col items-center justify-center px-8 py-24 text-center cv-auto"
>
	<div use:reveal>
		<h2 class="mb-8 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
			let's work together
		</h2>
		<p class="mb-14 max-w-2xl text-lg font-medium tracking-wide text-muted md:text-xl">
			i'm always interested in new opportunities and collaborations. whether you have a project in
			mind or just want to chat about technology, feel free to reach out.
		</p>
	</div>

	<div class="mb-10 flex flex-col gap-6 sm:flex-row" use:reveal>
		<a
			href="mailto:{EMAIL}"
			class="group relative overflow-hidden rounded-xl bg-accent px-10 py-4 text-lg font-bold text-accent-ink shadow-lg transition-transform duration-300 hover:scale-105"
		>
			<div
				class="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent mix-blend-overlay group-hover:animate-shimmer"
			></div>
			get in touch
		</a>
		<a
			href="/Dibakar_SWE_2026-04-06.pdf"
			download
			class="rounded-xl border border-line px-10 py-4 text-lg font-bold text-fg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-accent hover:text-accent"
		>
			download resume
		</a>
	</div>

	<button
		class="inline-flex items-center gap-2 rounded-full border border-line-soft px-4 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-accent"
		onclick={copyEmail}
		aria-live="polite"
	>
		{#if copied}
			<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
			</svg>
			copied to clipboard
		{:else}
			<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
				<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
			</svg>
			copy email address
		{/if}
	</button>
</section>
