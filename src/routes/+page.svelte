<script lang="ts">
	import { onMount } from 'svelte';
	import SkillLoader from '../lib/components/SkillLoader.svelte';
	import ThemeToggle from '../lib/components/ThemeToggle.svelte';
	import HeroSection from '../lib/components/HeroSection.svelte';
	import SkillsSection from '../lib/components/SkillsSection.svelte';
	import PartnersSection from '../lib/components/PartnersSection.svelte';
	import ContactSection from '../lib/components/ContactSection.svelte';
	import Footer from '../lib/components/Footer.svelte';

	let loading = true;
	let darkMode = true;

	function toggleTheme() {
		darkMode = !darkMode;
	}

	onMount(() => {
		const handleLoadingComplete = () => {
			loading = false;
		};

		window.addEventListener('loadingComplete', handleLoadingComplete);
		return () => window.removeEventListener('loadingComplete', handleLoadingComplete);
	});
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div
	class="min-h-screen transition-colors duration-300 {darkMode
		? 'bg-[#0f1419] text-[#e4e6eb]'
		: 'bg-[#f0f0f0] text-[#1a1a1a] bg-grainy'}"
>
	{#if loading}
		<SkillLoader />
	{:else}
		<main class="flex min-h-screen animate-[fadeIn_0.6s_ease] flex-col">
			<ThemeToggle {darkMode} onToggle={toggleTheme} />

			<HeroSection {darkMode} />

			<SkillsSection {darkMode} />

			<PartnersSection {darkMode} />

			<ContactSection {darkMode} />

			<Footer {darkMode} />
		</main>
	{/if}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family:
			'Space Grotesk',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		overflow-x: hidden;
	}

	.bg-grainy {
		background-image: 
			radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0);
		background-size: 20px 20px;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

</style>
