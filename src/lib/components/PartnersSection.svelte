<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import invoicelab from '$lib/assets/invoicelab.png';
	import mc2finance from '$lib/assets/mc2finance.png';
	import dolpin from '$lib/assets/dolpin.svg';
	import dosier from '$lib/assets/dosier.png';
	import qdacademy from '$lib/assets/qdacademy.png';
	import signupcash from '$lib/assets/signupcash.png';
	import devsonket from '$lib/assets/devsonket.png';
	import yieldfinder from '$lib/assets/yieldfinder.png';
	import raisolo from '$lib/assets/raisolo.png';

	interface Props {
		darkMode: boolean;
	}

	let { darkMode }: Props = $props();
	let isScrolled = $state(false);
	let hoveredPartnerIndex = $state(-1);

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
		const partnersSectionMiddle = window.innerHeight * 2 + window.innerHeight / 2;
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
			name: 'raisolo',
			years: '2025 - 2026',
			url: 'https://raisolo.com/',
			logo: raisolo,
			description:
				'An AI-driven product built to\nautomate research, insights, content workflows,\nand orchestrate personal hivemind'
		},
		{
			name: 'yieldfinder.ai',
			years: '2025 - 2025',
			url: 'https://yieldfinder.ai/',
			logo: yieldfinder,
			description: 'Intelligent, AI-Powered DeFi Yield\nusing AI Agents & MCP Server'
		},
		{
			name: 'invoice lab',
			years: '2025 - present',
			url: 'https://staging.invoicelab.live/',
			logo: invoicelab,
			description: 'AI-powered invoice management.\nIntelligent, customizable, and professional.'
		},
		{
			name: 'mc² finance',
			years: '2023 - 2026',
			url: 'https://www.mc2.fi/',
			logo: mc2finance,
			description: 'The First Regulated DeFi ETPs \nDeliver 15% SOL, 10% USD, and 7% CHF Yields.'
		},
		{
			name: 'dolpin',
			years: '2022 - 2023',
			url: 'https://www.dolpin.io/',
			logo: dolpin,
			description: 'A decentralized & encrypted storage layer\nbuilt with IPFS / Filecoin.'
		},
		{
			name: 'dosier',
			years: '2022 - 2023',
			url: 'https://www.dosier.ai/',
			logo: dosier,
			description:
				'Decentralized Content Delivery, Harnessing\nthe Power of Data DAOs and zk-SNARK Transactions,\nBacked by LonghashX & ProtocolLabs'
		},
		{
			name: 'quickdesk academy',
			years: '2021 - 2022',
			url: 'https://theqdacademy.com/',
			logo: qdacademy,
			description: 'Professional training and\nskill development academy'
		},
		{
			name: 'signup.cash',
			years: '2020 - 2021',
			url: 'https://github.com/signupcash',
			logo: signupcash,
			description: 'Non-Custodial Wallet &\nSLP/NFT Storage for Bitcoin Cash'
		},
		{
			name: 'devsonket',
			years: '2018 - present',
			url: 'https://devsonket.com/',
			logo: devsonket,
			description: 'Open Source Developer community and\ntechnical resource platform'
		}
	];

	let scrollContainer: HTMLDivElement | undefined = $state();
	let isPaused = $state(false);
	let animationFrameId: number;

	function startAutoScroll() {
		if (!scrollContainer) return;

		const scroll = () => {
			if (!isPaused && scrollContainer) {
				scrollContainer.scrollLeft += 0.8;

				// Seamless loop: check if we've scrolled past the first set
				const halfWidth = scrollContainer.scrollWidth / 2;
				if (scrollContainer.scrollLeft >= halfWidth) {
					scrollContainer.scrollLeft = 0;
				}
			}
			animationFrameId = requestAnimationFrame(scroll);
		};

		animationFrameId = requestAnimationFrame(scroll);
	}

	onMount(() => {
		window.addEventListener('scroll', updateScrollState);
		updateScrollState();
		startAutoScroll();
		// Ensure it starts at the first item
		if (scrollContainer) scrollContainer.scrollLeft = 0;
	});

	onDestroy(() => {
		window.removeEventListener('scroll', updateScrollState);
		cancelAnimationFrame(animationFrameId);
	});
</script>

<section
	class="mx-auto flex min-h-screen w-full flex-col items-center justify-center px-8 relative z-10"
>
	<h2 class="mb-12 text-center text-sm font-medium tracking-widest lowercase opacity-60">
		partners & projects
	</h2>
	<div
		bind:this={scrollContainer}
		class="w-full overflow-x-auto overflow-y-visible py-4 marquee-mask scrollbar-hide flex items-center"
		role="region"
		aria-label="Partners list marquee"
		onmouseenter={() => (isPaused = true)}
		onmouseleave={() => (isPaused = false)}
		ontouchstart={() => (isPaused = true)}
		ontouchend={() => (isPaused = false)}
	>
		<div class="flex w-max">
			<!-- First set of partners -->
			<div class="flex gap-8 px-8">
				{#each partners as partner, index}
					<a
						href={partner.url}
						target="_blank"
						rel="noopener noreferrer"
						class="group flex w-[320px] flex-shrink-0 flex-col items-center rounded-2xl px-8 py-10 transition-all duration-500 ease-out hover:-translate-y-3 hover:shadow-2xl relative overflow-hidden backdrop-blur-md border {darkMode
							? 'bg-black/20 border-white/10 hover:border-[#ffcf9f]/40 hover:bg-black/40'
							: 'bg-white/40 border-black/10 hover:border-[#d97706]/40 hover:bg-white/60'}"
						onmouseenter={() => (hoveredPartnerIndex = index)}
						onmouseleave={() => (hoveredPartnerIndex = -1)}
					>
						<!-- Soft hover glow -->
						<div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-screen" style="background: radial-gradient(circle at top, {darkMode ? 'rgba(255,207,159,0.15)' : 'rgba(217,119,6,0.1)'} 0%, transparent 70%);"></div>

						<div class="mb-6 flex h-32 w-32 items-center justify-center relative z-10 transition-transform duration-500 group-hover:scale-110">
							<div
								class="h-full w-full rounded-2xl p-4 shadow-sm backdrop-blur-sm border {darkMode
									? 'bg-white/5 border-white/10'
									: 'bg-black/5 border-black/10'}"
							>
								<img
									src={partner.logo}
									alt="{partner.name} logo"
									class="h-full w-full object-contain drop-shadow-sm"
								/>
							</div>
						</div>
						<p class="my-3 text-center text-xl font-bold tracking-tight relative z-10 group-hover:scale-105 transition-transform duration-300">
							{partner.name}
						</p>
						<p class="m-0 text-sm font-medium opacity-60 relative z-10">
							{partner.years}
						</p>

						<!-- Expandable Description -->
						<div
							class="w-full overflow-hidden transition-all duration-500 ease-in-out relative z-10 {hoveredPartnerIndex ===
							index
								? 'max-h-32 opacity-100 mt-4'
								: 'max-h-0 opacity-0'}"
						>
							<p class="text-center text-sm font-medium opacity-80 leading-relaxed px-2 whitespace-pre-line">
								{partner.description}
							</p>
						</div>
					</a>
				{/each}
			</div>
			<!-- Duplicate set for seamless looping -->
			<div class="flex gap-8 pr-8">
				{#each partners as partner, index}
					<a
						href={partner.url}
						target="_blank"
						rel="noopener noreferrer"
						class="flex w-[320px] flex-shrink-0 flex-col items-center rounded-xl px-8 py-12 transition-all duration-500 ease-out hover:-translate-y-2 hover:opacity-90 {darkMode
							? 'hover:bg-[rgba(255,207,160,0.05)]'
							: 'hover:bg-[rgba(0,0,0,0.03)]'}"
						onmouseenter={() => (hoveredPartnerIndex = index)}
						onmouseleave={() => (hoveredPartnerIndex = -1)}
					>
						<div class="mb-6 flex h-32 w-32 items-center justify-center">
							<div
								class="h-full w-full rounded-xl p-4 {darkMode
									? 'bg-[rgba(255,207,160,0.08)]'
									: 'bg-[rgba(0,0,0,0.1)]'}"
							>
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

						<!-- Expandable Description -->
						<div
							class="w-full overflow-hidden transition-all duration-300 ease-out {hoveredPartnerIndex ===
							index
								? 'max-h-24 opacity-100 mt-2'
								: 'max-h-0 opacity-0'}"
						>
							<p class="text-center text-xs opacity-60 leading-relaxed px-2 whitespace-pre-line">
								{partner.description}
							</p>
						</div>
					</a>
				{/each}
			</div>
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
			aria-label={isScrolled ? 'Scroll to top' : 'Scroll to contact section'}
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
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
	.scrollbar-hide {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	.marquee-mask {
		mask-image: linear-gradient(
			to right,
			transparent,
			black 15%,
			black 85%,
			transparent
		);
		-webkit-mask-image: linear-gradient(
			to right,
			transparent,
			black 15%,
			black 85%,
			transparent
		);
	}
</style>
