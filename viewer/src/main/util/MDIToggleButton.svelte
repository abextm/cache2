<script lang="ts">
	import { createEventDispatcher } from "svelte";

	import MDI from "./MDI.svelte";

	export let checked: boolean;
	export let on: string | undefined = undefined;
	export let off: string | undefined = undefined;
	export let altOn: string | undefined = undefined;
	export let altOff: string | undefined = undefined;
	export let onOpacity = 1;
	export let offOpacity = .7;

	const dispatch = createEventDispatcher();

	function click(_ev: MouseEvent) {
		checked = !checked;
		dispatch("changed");
		dispatch(checked ? "on" : "off");
	}
</script>

<span
	class:clickable={on || off}
	style:opacity={checked ? onOpacity : offOpacity}
	on:click|stopPropagation|preventDefault={click}>
	<MDI
		alt={checked ? altOn || altOff : altOff || altOn}
		icon={checked ? on || off: off || on} />
</span>

<style>
	.clickable {
		cursor: pointer;
	}
</style>