<script lang="ts">
  import { ComponentType, SvelteComponent } from "svelte";

	export let key: string;
	export let tab: string;
	export let async: undefined | (() => Promise<{default: ComponentType<SvelteComponent>}>) = undefined;

	let mounted = false;
	$: mounted = mounted || key === tab;
</script>

{#if mounted}
	<div style:display={key === tab ? "block" : "none"} class="tab-contents">
		{#if async}
			{#await async()}
				Loading...
			{:then module}
				<svelte:component this={module.default} />
			{/await}
		{:else}
			<slot/>
		{/if}
	</div>
{/if}

<style>
	.tab-contents {
		flex: 1 1;
		min-height: 0;
	}
</style>