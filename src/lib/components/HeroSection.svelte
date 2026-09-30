<script lang="ts">
	import SocialLinks from './SocialLinks.svelte';
</script>

<div
	class="mx-auto flex min-h-screen w-full max-w-[1000px] flex-1 flex-col items-center justify-center px-8 text-center"
>
	<div class="relative inline-block animate-[fadeIn_0.6s_ease-out_both]">
		<!-- Soft glow behind the text. Radial gradients instead of a blur filter:
		     a similar halo at a fraction of the first-paint cost. The mask fades
		     the box edges so the halo never shows a hard rectangle. -->
		<div
			class="absolute -inset-6 opacity-40 mix-blend-screen"
			style="background:
				radial-gradient(60% 80% at 25% 50%, rgba(249,115,22,0.35), transparent 70%),
				radial-gradient(60% 80% at 55% 50%, rgba(168,85,247,0.28), transparent 70%),
				radial-gradient(60% 80% at 85% 50%, rgba(59,130,246,0.35), transparent 70%);
				mask-image: radial-gradient(closest-side, black 40%, transparent);
				-webkit-mask-image: radial-gradient(closest-side, black 40%, transparent);"
		></div>

		<!-- Fluid size tuned so the full name always fits on a single line. -->
		<h1
			class="relative m-0 text-[clamp(1.5rem,7.8vw,5.5rem)] leading-tight font-bold tracking-tight whitespace-nowrap"
		>
			<span class="text-gradient bg-gradient-to-r from-fg via-accent to-fg">
				dibakar sutra dhar
			</span>
		</h1>
	</div>

	<p class="mt-8 mb-12 text-lg font-medium tracking-wide text-muted md:text-xl lg:text-2xl animate-[fadeIn_0.6s_ease-out_0.15s_both]">
		software engineer <span class="text-accent">&</span> web3 security ops
	</p>

	<div class="animate-[fadeIn_0.6s_ease-out_0.3s_both] w-full flex justify-center">
		<SocialLinks />
	</div>
</div>
