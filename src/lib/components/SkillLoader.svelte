<script lang="ts">
	import { onMount } from 'svelte';
	import { skills, categoryColors } from '../data/skills';

	let currentSkillIndex = 0;
	let displayedSkills: Array<{ text: string; category: string; color: string; index: number; x: number; y: number }> = [];

	function calculateSpiralPosition(index: number, total: number) {
		// Create a deterministic spiral with guaranteed minimum spacing
		const spiralTurns = 3.5; // More turns for better distribution
		const maxRadius = 320; // Larger radius for more space
		const minRadius = 80; // Start further from center
		
		// Calculate progress along the spiral (0 to 1)
		const progress = index / (total - 1);
		
		// Calculate radius with smooth growth
		const radius = minRadius + (maxRadius - minRadius) * progress;
		
		// Calculate angle with guaranteed minimum spacing
		const baseAngle = progress * spiralTurns * 2 * Math.PI - Math.PI / 2;
		
		// Add minimum spacing between consecutive skills
		const minSpacing = 0.10; // Even more spacing to prevent overlaps
		const angle = baseAngle + (index * minSpacing);
		
		// Use deterministic variation based on index for consistency
		const angleVariation = (Math.sin(index * 0.9) * 0.2);
		const radiusVariation = (Math.cos(index * 0.5) * 5);
		
		const x = Math.cos(angle + angleVariation) * (radius + radiusVariation);
		const y = Math.sin(angle + angleVariation) * (radius + radiusVariation);
		
		return { x, y };
	}

	onMount(() => {
		// Fast loading with batch processing
		const skillInterval = setInterval(() => {
			if (currentSkillIndex < skills.length) {
				const batchSize = Math.min(2, skills.length - currentSkillIndex);
				const newSkills = [];
				
				for (let i = 0; i < batchSize; i++) {
					const skill = skills[currentSkillIndex + i];
					const position = calculateSpiralPosition(currentSkillIndex + i, skills.length);
					newSkills.push({
						text: skill.name,
						category: skill.category,
						color: categoryColors[skill.category],
						index: currentSkillIndex + i,
						x: position.x,
						y: position.y
					});
				}
				
				displayedSkills = [...displayedSkills, ...newSkills];
				currentSkillIndex += batchSize;
			} else {
				clearInterval(skillInterval);
				setTimeout(() => {
					// Dispatch event when loading is complete
					const event = new CustomEvent('loadingComplete');
					window.dispatchEvent(event);
				}, 500);
			}
		}, 120); // Slightly slower for better visual effect

		return () => clearInterval(skillInterval);
	});
</script>

<div class="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden">
	<div class="relative flex h-full w-full items-center justify-center">
		{#each displayedSkills as skill (skill.index)}
			<div
				class="absolute px-8 py-6 text-base font-medium whitespace-nowrap transition-all duration-[600ms]
                   {skill.index === currentSkillIndex - 1
						? 'z-10 scale-110 font-semibold opacity-100'
						: 'opacity-30'}"
				style="color: {skill.color}; transform: translate({skill.x}px, {skill.y}px) {skill.index ===
				currentSkillIndex - 1
					? 'scale(1.15)'
					: 'scale(1)'}; transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);"
			>
				{skill.text}
			</div>
		{/each}
	</div>
</div>
