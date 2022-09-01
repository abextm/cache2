<script lang="ts">
	export let key: string;
	export let tab: string;

	let mounted = false;
	$: mounted = mounted || key === tab;
</script>

{#if mounted}
	<div style:display={key === tab ? "block" : "none"} class="tab-contents">
		<slot/>
	</div>
{/if}

<style>
	.tab-contents {
		flex: 1 1;
		min-height: 0;
	}
</style>