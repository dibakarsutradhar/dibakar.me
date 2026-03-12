<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { skills, categoryLabels } from '../data/skills';

	interface Props {
		darkMode: boolean;
	}

	let { darkMode }: Props = $props();
	let isScrolled = $state(false);

	const categoryColors: Record<string, string> = {
		core: darkMode ? '#ffcfa0' : '#d97706',      // Primary color (warm orange) - darker in light mode
		systems: '#60a5fa',   // Blue
		infra: '#34d399',     // Green
		database: '#a78bfa',  // Purple
		ai: '#fb923c',        // Orange
		blockchain: '#f87171', // Red
		ui: '#22d3ee'         // Teal
	};

	// Group skills by category
	const groupedSkills = skills.reduce((acc, skill) => {
		if (!acc[skill.category]) {
			acc[skill.category] = [];
		}
		acc[skill.category].push(skill);
		return acc;
	}, {} as Record<string, typeof skills>);

	function handleScrollClick() {
		if (isScrolled) {
			// Scroll to top
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			// Scroll down to partners section
			window.scrollTo({ top: window.innerHeight * 2, behavior: 'smooth' });
		}
	}

	function updateScrollState() {
		const skillsSectionStart = window.innerHeight;
		const skillsSectionMiddle = window.innerHeight + (window.innerHeight / 2);
		isScrolled = window.scrollY > skillsSectionMiddle;
	}

	onMount(() => {
		window.addEventListener('scroll', updateScrollState);
		updateScrollState();
	});

	onDestroy(() => {
		window.removeEventListener('scroll', updateScrollState);
	});
</script>

<section class="mx-auto flex min-h-screen max-w-[1200px] flex-1 flex-col items-center justify-center px-8 text-center relative z-10">
	<h2 class="mb-12 text-center text-sm font-medium tracking-widest lowercase opacity-60">
		skills
	</h2>
	
	<div class="w-full max-w-4xl mb-16">
		{#each Object.entries(groupedSkills) as [category, categorySkills]}
			<div class="mb-10 animate-[fadeIn_0.8s_ease-out_both] p-6 rounded-2xl {darkMode ? 'glass-dark' : 'glass-light'} transition-all duration-500 hover:shadow-xl">
				<h3 class="mb-5 text-xl font-bold tracking-tight" style="color: {categoryColors[category]}; text-shadow: 0 0 20px {categoryColors[category]}40;">
					{categoryLabels[category]}
				</h3>
				<div class="flex flex-wrap gap-3 justify-center">
					{#each categorySkills as skill}
						<span
							class="relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-110 hover:-translate-y-1 overflow-hidden group cursor-default {darkMode ? 'backdrop-blur-md' : 'backdrop-blur-sm'}"
							style="background-color: {categoryColors[skill.category]}{darkMode ? '15' : '10'}; color: {darkMode ? '#e4e6eb' : categoryColors[skill.category]}; border: 1px solid {categoryColors[skill.category]}40; box-shadow: 0 4px 15px -3px {categoryColors[skill.category]}20;"
						>
							<div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-screen" style="background: radial-gradient(circle at center, {categoryColors[skill.category]}40 0%, transparent 70%);"></div>
							<span class="relative z-10 text-shadow-sm">{skill.name}</span>
						</span>
					{/each}
				</div>
			</div>
		{/each}
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
