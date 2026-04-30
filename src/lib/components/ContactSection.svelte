<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		darkMode: boolean;
	}

	let { darkMode }: Props = $props();
	let isScrolled = $state(false);

	function handleScrollClick() {
		if (isScrolled) {
			// Scroll to top
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			// Scroll down to footer
			window.scrollTo({ top: window.innerHeight * 4, behavior: 'smooth' });
		}
	}

	function updateScrollState() {
		isScrolled = window.scrollY > window.innerHeight * 2.5;
	}

	onMount(() => {
		window.addEventListener('scroll', updateScrollState);
		updateScrollState();
	});

	onDestroy(() => {
		window.removeEventListener('scroll', updateScrollState);
	});
</script>

<section class="mx-auto flex min-h-screen max-w-[800px] flex-1 flex-col items-center justify-center px-8 text-center relative z-10">
	<h2 class="mb-8 text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl animate-[fadeIn_0.8s_ease-out_both]">
		let's work together
	</h2>
	<p class="mb-14 text-lg font-medium tracking-wide opacity-80 md:text-xl lg:text-2xl max-w-2xl animate-[fadeIn_0.8s_ease-out_0.2s_both]">
		i'm always interested in new opportunities and collaborations. whether you have a project in mind or just want to chat about technology, feel free to reach out.
	</p>
	
	<div class="flex flex-col sm:flex-row gap-6 mb-16 animate-[fadeIn_0.8s_ease-out_0.4s_both]">
		<a
			href="mailto:iamdibakardipu@gmail.com"
			class="relative group px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 overflow-hidden shadow-lg {darkMode 
				? 'bg-[#ffcf9f] text-[#0f1419]' 
				: 'bg-[#1a1a1a] text-[#f0f0f0]'}"
		>
			<div class="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer mix-blend-overlay"></div>
			get in touch
		</a>
		<a
			href="/Dibakar_SWE_2026-04-06.pdf"
			download
			class="px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 hover:scale-105 {darkMode 
				? 'glass-dark text-[#ffcf9f] ring-1 ring-[#ffcf9f]/50 hover:bg-[#ffcf9f]/10' 
				: 'glass-light text-[#1a1a1a] ring-1 ring-[#1a1a1a]/50 hover:bg-black/5'}"
		>
			download resume
		</a>
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
		<svg
			class="w-6 h-6 opacity-60 hover:opacity-100 transition-opacity duration-300 cursor-pointer"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			role="button"
			tabindex="0"
			onclick={handleScrollClick}
			onkeydown={(e) => e.key === 'Enter' && handleScrollClick()}
		>
			{#if isScrolled}
				<!-- Scroll up arrow -->
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M5 10l7-7m0 0l7 7m-7-7v18"
				></path>
			{:else}
				<!-- Scroll down arrow -->
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 14l-7 7m0 0l-7-7m7 7V3"
				></path>
			{/if}
		</svg>
	</div>
</section>
