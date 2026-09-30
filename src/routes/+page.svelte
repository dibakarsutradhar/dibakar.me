<script lang="ts">
	import ThemeToggle from '../lib/components/ThemeToggle.svelte';
	import HeroSection from '../lib/components/HeroSection.svelte';
	import SkillsSection from '../lib/components/SkillsSection.svelte';
	import PartnersSection from '../lib/components/PartnersSection.svelte';
	import ContactSection from '../lib/components/ContactSection.svelte';
	import Footer from '../lib/components/Footer.svelte';
	import { theme } from '../lib/theme.svelte';

	const SITE_URL = 'https://dibakar.me';

	const personJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Person',
		name: 'Dibakar Sutra Dhar',
		url: `${SITE_URL}/`,
		jobTitle: 'Software Engineer & Web3 Security Ops',
		description:
			'Software engineer and web3 security ops based in Bangladesh, working with TypeScript, Solidity, Rust and AI agents.',
		email: 'mailto:iamdibakardipu@gmail.com',
		address: { '@type': 'PostalAddress', addressCountry: 'BD' },
		knowsAbout: [
			'TypeScript',
			'JavaScript',
			'Solidity',
			'Rust',
			'Web3 security',
			'Smart contract auditing',
			'SvelteKit',
			'Node.js',
			'AI agents',
			'DeFi'
		],
		sameAs: [
			'https://github.com/dibakarsutradhar',
			'https://www.linkedin.com/in/dibakarsutradhar',
			'https://medium.com/@imdibakar'
		]
	};
	const jsonLdScript = JSON.stringify(personJsonLd).replaceAll('</', '<\\/');
</script>

<svelte:head>
	<title>Dibakar Sutra Dhar — Software Engineer & Web3 Security</title>
	<meta
		name="description"
		content="Portfolio of Dibakar Sutra Dhar, software engineer and web3 security ops based in Bangladesh. Skills, projects, experience and writing."
	/>
	<link rel="canonical" href="{SITE_URL}/" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="Dibakar Sutra Dhar" />
	<meta property="og:title" content="Dibakar Sutra Dhar — Software Engineer & Web3 Security" />
	<meta
		property="og:description"
		content="Software engineer and web3 security ops based in Bangladesh. Skills, projects, experience and writing."
	/>
	<meta property="og:url" content="{SITE_URL}/" />
	<meta name="twitter:card" content="summary" />

	{@html `<script type="application/ld+json">${jsonLdScript}</script>`}
</svelte:head>

<div class="min-h-screen bg-bg text-fg transition-colors duration-500 {theme.dark ? '' : 'bg-grainy'}">
	<!-- Fixed centered pill navigation: a full-width, click-through wrapper
	     centers the pill. (Positioning the pill itself with left-1/2 halves its
	     available width, which forced the links to wrap.) -->
	<nav class="pointer-events-none fixed inset-x-0 top-5 z-[100] flex justify-center px-3" aria-label="Site navigation">
		<div class="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-full border border-line bg-card px-2 py-1.5 shadow-lg backdrop-blur-md">
		<a
			href="#skills"
			class="rounded-full px-2 py-1.5 text-xs font-medium text-fg transition-colors hover:text-accent sm:px-3 sm:py-2 sm:text-sm"
		>
			skills
		</a>
		<a
			href="#work"
			class="rounded-full px-2 py-1.5 text-xs font-medium text-fg transition-colors hover:text-accent sm:px-3 sm:py-2 sm:text-sm"
		>
			work
		</a>
		<a
			href="#projects"
			class="rounded-full px-2 py-1.5 text-xs font-medium text-fg transition-colors hover:text-accent sm:px-3 sm:py-2 sm:text-sm"
		>
			projects
		</a>
		<a
			href="#contact"
			class="rounded-full px-2 py-1.5 text-xs font-medium text-fg transition-colors hover:text-accent sm:px-3 sm:py-2 sm:text-sm"
		>
			contact
		</a>
		<a
			href="/blog"
			class="rounded-full px-2 py-1.5 text-xs font-medium text-fg transition-colors hover:text-accent sm:px-3 sm:py-2 sm:text-sm"
		>
			blog
		</a>
		<ThemeToggle />
		</div>
	</nav>

	<main class="relative z-10 flex flex-col">
		<HeroSection />

		<SkillsSection />

		<PartnersSection />

		<ContactSection />

		<Footer />
	</main>
</div>

<style>
	.bg-grainy {
		background-image:
			radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.15) 1px, transparent 0);
		background-size: 20px 20px;
	}
</style>
