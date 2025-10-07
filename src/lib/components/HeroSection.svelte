<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import SocialLinks from './SocialLinks.svelte';

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
			// Scroll down to skills section
			window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
		}
	}

	function updateScrollState() {
		isScrolled = window.scrollY > 100;
	}

	onMount(() => {
		window.addEventListener('scroll', updateScrollState);
		updateScrollState(); // Check initial state
	});

	onDestroy(() => {
		window.removeEventListener('scroll', updateScrollState);
	});
</script>

<div
	class="mx-auto flex min-h-screen max-w-[800px] flex-1 flex-col items-center justify-center px-8 text-center relative"
>
	<h1 class="m-0 text-4xl leading-tight font-bold tracking-tight whitespace-nowrap sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
		dibakar sutra dhar
	</h1>
	<p class="mt-6 mb-12 text-lg font-normal tracking-wide opacity-70 md:text-xl lg:text-2xl">
		software engineer & web3 security ops
	</p>

	<SocialLinks {darkMode} />

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
</div>
