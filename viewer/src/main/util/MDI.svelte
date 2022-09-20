<script lang="ts">
	export let icon: string | undefined;
	export let alt: string | undefined = undefined;
	export let style: string | undefined = undefined;
</script>

<svg xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	class="mdi"
	{style}>
	<title>{alt}</title>
	<path d={icon} />
</svg>

<style>
	:global(.mdi) {
		width: 1em;
		vertical-align: middle;
	}
	:global(.mdi path) {
		fill: var(--color);
	}
</style>