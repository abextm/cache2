<svelte:options immutable={true}/>

<script lang="ts">
	import { onDestroy } from "svelte";
	import { UIData } from "../../common/uiobject";
	import { renderObject, RenderedObject } from "./ObjectRenderer";

	export let value: UIData;
	export let unwrap = false;
	export let expanded = false;
	export let showDefault = false;

	let parent: HTMLDivElement;
	let ins: RenderedObject;
	$: {
		if (parent && value) {
			ins?.destroy(value);
			ins = renderObject(parent, value, unwrap, showDefault);
		}
	}
	$: ins?.setExpanded(expanded);

	onDestroy(() => ins?.destroy(true));
</script>

<div class="jsobject" bind:this={parent}></div>
