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

<section class="mx-auto flex min-h-screen max-w-[1200px] flex-1 flex-col items-center justify-center px-8 text-center relative">
	<h2 class="mb-12 text-center text-sm font-medium tracking-widest lowercase opacity-60">
		skills
	</h2>
	
	<div class="w-full max-w-4xl mb-16">
		{#each Object.entries(groupedSkills) as [category, categorySkills]}
			<div class="mb-6">
				<h3 class="mb-3 text-lg font-semibold" style="color: {categoryColors[category]};">
					{categoryLabels[category]}
				</h3>
				<div class="flex flex-wrap gap-2 justify-center">
					{#each categorySkills as skill}
						<span
							class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105 {darkMode 
								? 'bg-opacity-10' 
								: 'bg-opacity-5'}"
							style="background-color: {categoryColors[skill.category]}20; color: {categoryColors[skill.category]};"
						>
							{skill.name}
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
