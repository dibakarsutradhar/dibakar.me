<script lang="ts">
	interface Props {
		darkMode: boolean;
	}

	let { darkMode }: Props = $props();
</script>

<footer
	class="border-t px-8 py-12 text-center {darkMode
		? 'border-[rgba(255,255,255,0.08)]'
		: 'border-[rgba(0,0,0,0.08)]'}"
>
	<p class="m-0 text-sm opacity-60">© 2025 Dibakar. Crafted with precision and passion.</p>
</footer>
