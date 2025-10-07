<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import mc2finance from '$lib/assets/mc2finance.png';
	import dolpin from '$lib/assets/dolpin.svg';
	import dosier from '$lib/assets/dosier.png';
	import qdacademy from '$lib/assets/qdacademy.png';
	import signupcash from '$lib/assets/signupcash.png';
	import devsonket from '$lib/assets/devsonket.png';

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
			// Scroll down to contact section
			window.scrollTo({ top: window.innerHeight * 3, behavior: 'smooth' });
		}
	}

	function updateScrollState() {
		const partnersSectionStart = window.innerHeight * 2;
		const partnersSectionMiddle = window.innerHeight * 2 + (window.innerHeight / 2);
		isScrolled = window.scrollY > partnersSectionMiddle;
	}

	onMount(() => {
		window.addEventListener('scroll', updateScrollState);
		updateScrollState();
	});

	onDestroy(() => {
		window.removeEventListener('scroll', updateScrollState);
	});

	const partners = [
		{ 
			name: 'mc² finance', 
			years: '2023 - present', 
			url: 'https://www.mc2.fi/',
			logo: mc2finance
		},
		{ 
			name: 'dolpin', 
			years: '2022 - 2023', 
			url: 'https://www.dolpin.io/',
			logo: dolpin
		},
		{ 
			name: 'dosier', 
			years: '2022 - 2023', 
			url: 'https://www.dosier.ai/',
			logo: dosier
		},
		{ 
			name: 'quickdesk academy', 
			years: '2021 - 2022', 
			url: 'https://theqdacademy.com/',
			logo: qdacademy
		},
		{ 
			name: 'signup.cash', 
			years: '2020 - 2021', 
			url: 'https://github.com/signupcash',
			logo: signupcash
		},
		{ 
			name: 'devsonket', 
			years: '2018 - present', 
			url: 'https://devsonket.com/',
			logo: devsonket
		},
	];
</script>

<section class="mx-auto flex min-h-screen w-full flex-col items-center justify-center px-8 relative">
	<h2 class="mb-12 text-center text-sm font-medium tracking-widest lowercase opacity-60">
		partners
	</h2>
	<div
		class="w-full scrollbar-thin overflow-x-auto overflow-y-hidden py-4 {darkMode
			? 'scrollbar-track-[rgba(255,255,255,0.05)] scrollbar-thumb-[rgba(255,255,255,0.2)]'
			: 'scrollbar-track-[rgba(0,0,0,0.05)] scrollbar-thumb-[rgba(0,0,0,0.2)]'}"
	>
		<div class="flex w-max gap-8 px-8">
			{#each partners as partner}
				<a
					href={partner.url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex min-w-[280px] flex-col items-center rounded-xl px-8 py-12 transition-all duration-300 hover:-translate-y-1 hover:opacity-80"
				>
					<div class="mb-6 flex h-32 w-32 items-center justify-center">
						<div class="h-full w-full rounded-xl p-4 {darkMode ? 'bg-[rgba(255,207,160,0.08)]' : 'bg-[rgba(0,0,0,0.1)]'}">
							<img
								src={partner.logo}
								alt="{partner.name} logo"
								class="h-full w-full object-contain"
							/>
						</div>
					</div>
					<p class="my-3 text-center text-lg font-medium">
						{partner.name}
					</p>
					<p class="m-0 text-sm opacity-50">
						{partner.years}
					</p>
				</a>
			{/each}
		</div>
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

<style>
	/* Custom scrollbar for webkit browsers */
	.scrollbar-thin::-webkit-scrollbar {
		height: 6px;
	}
</style>
