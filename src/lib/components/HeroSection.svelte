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
	class="mx-auto flex min-h-screen max-w-[800px] flex-1 flex-col items-center justify-center px-8 text-center relative z-10"
>
	<div class="relative inline-block animate-[fadeIn_1s_ease-out_0.2s_both]">
		<!-- Soft glow behind the text -->
		<div class="absolute -inset-2 blur-3xl opacity-30 mix-blend-screen transition-all duration-1000 {darkMode ? 'bg-gradient-to-r from-orange-500/50 via-purple-500/40 to-blue-500/50' : 'bg-gradient-to-r from-orange-400/40 via-purple-400/30 to-blue-400/40'}"></div>
		
		<h1 class="relative m-0 text-5xl leading-tight font-bold tracking-tight whitespace-nowrap sm:text-6xl md:text-7xl lg:text-8xl">
			<span class="text-gradient {darkMode ? 'bg-gradient-to-r from-gray-100 via-[#ffcfa0] to-white' : 'bg-gradient-to-r from-gray-900 via-[#d97706] to-gray-800'} animate-gradient bg-[length:200%_auto]">
				dibakar sutra dhar
			</span>
		</h1>
	</div>

	<p class="mt-8 mb-12 text-lg font-medium tracking-wide opacity-80 md:text-xl lg:text-2xl animate-[fadeIn_1s_ease-out_0.5s_both]">
		software engineer <span class="{darkMode ? 'text-[#ffcfa0]' : 'text-[#d97706]'}">&</span> web3 security ops
	</p>

	<div class="animate-[fadeIn_1s_ease-out_0.8s_both] w-full flex justify-center">
		<SocialLinks {darkMode} />
	</div>

	<!-- Scroll indicator -->
	<div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce animate-[fadeIn_1s_ease-out_1.5s_both]">
		<svg
			class="w-8 h-8 opacity-50 hover:opacity-100 transition-all duration-300 cursor-pointer {darkMode ? 'text-[#ffcfa0]' : 'text-[#d97706]'}"
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
