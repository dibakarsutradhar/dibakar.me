<script lang="ts">
	import { skills, categoryLabels, categoryColor } from '../data/skills';
	import { theme } from '../theme.svelte';
	import { reveal } from '../actions/reveal';

	const groupedSkills = skills.reduce(
		(acc, skill) => {
			if (!acc[skill.category]) {
				acc[skill.category] = [];
			}
			acc[skill.category].push(skill);
			return acc;
		},
		{} as Record<string, typeof skills>
	);
</script>

<section
	id="skills"
	class="mx-auto flex min-h-screen max-w-[1200px] flex-1 scroll-mt-24 flex-col items-center justify-center px-8 py-24 text-center cv-auto"
>
	<h2 class="mb-12 text-center text-sm font-medium tracking-widest lowercase text-muted">skills</h2>

	<div class="w-full max-w-4xl">
		{#each Object.entries(groupedSkills) as [category, categorySkills], i (category)}
			<div
				class="glass mb-8 rounded-2xl p-6 transition-shadow duration-500 hover:shadow-xl"
				use:reveal
			>
				<h3
					class="mb-5 text-xl font-bold tracking-tight"
					style="color: {categoryColor(category, theme.dark)}"
				>
					{categoryLabels[category]}
				</h3>
				<div class="flex flex-wrap gap-3 justify-center">
					{#each categorySkills as skill (skill.name)}
						<span
							class="relative px-4 py-2 text-sm font-medium transition-transform duration-300 hover:scale-110 hover:-translate-y-1 rounded-xl"
							style="background-color: color-mix(in srgb, {categoryColor(category, theme.dark)} 12%, transparent); color: {theme.dark
								? '#e4e6eb'
								: '#1a1a1a'}; border: 1px solid color-mix(in srgb, {categoryColor(category, theme.dark)} 40%, transparent);"
						>
							{skill.name}
						</span>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>
