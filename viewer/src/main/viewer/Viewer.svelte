<script lang="ts">
	import { Writable } from "svelte/store";
	import { getRunner, LookupType } from "../../common/Runner";
	import { historyStore } from "../HistoryStore";
	import JSObject from "../uiobject/JSObject.svelte";
	import Split from "../util/Split.svelte";
	import Section from "./Section.svelte";
	import ViewType from "./ViewType.svelte";

	let key: Writable<LookupType | undefined> = historyStore("viewerKey", undefined) as any;
	let filter: Writable<string> = historyStore("viewerFilter", "", "replace");
</script>

<Split size={20}>
	<div slot=1>
		<Section name="Config" index={2}>
			<ViewType name="item" bind:key={$key}/>
			<ViewType name="hitsplat" bind:key={$key}/>
		</Section>
	</div>
	<div slot=2 class="rhs">
		{#if $key}
			<input class="filter" type="text" bind:value={$filter} placeholder="id or name regexp"/>
			<div class="contents">
				{#await getRunner().lookup($key, $filter)}
					Loading...
				{:then value}
					{#if value}
						<JSObject {value} expanded/>
					{:else}
						Invalid ID
					{/if}
				{:catch err}
					{err.name || "Error"}: {(console.error(err), err.message || JSON.stringify(err))}
				{/await}
			</div>
		{/if}
	</div>
</Split>

<style>
	:global(.viewer-id) {
		color: var(--color-inactive);
		font-size: 80%;
		padding-left: .5em;
	}
	.filter {
		display: block;
		width: 100%;
		flex: 0 0;
	}
	.rhs.rhs {
		overflow: clip;
		display: flex;
		flex-direction: column;
	}
	.contents {
		overflow: auto;
		min-height: 0;
		flex: 1 1;
	}
</style>