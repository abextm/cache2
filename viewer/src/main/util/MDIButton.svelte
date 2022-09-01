<script lang="ts">
	import { createEventDispatcher } from "svelte";

	import MDI from "./MDI.svelte";

	export let icon: string | undefined = undefined;
	export let alt: string | undefined = undefined;

	const dispatch = createEventDispatcher();
</script>

<span
	class:clickable={icon}
	on:click|stopPropagation|preventDefault={() => dispatch("click")}>
	<MDI {alt} {icon} />
</span>

<style>
	.clickable {
		cursor: pointer;
	}
</style>