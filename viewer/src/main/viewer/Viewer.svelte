<script lang="ts">
  import { mdiCodeBraces, mdiImage } from "@mdi/js";
	import { Writable } from "svelte/store";
	import { altCache, defaultCache } from "../../common/db";
	import { getRunner, LookupType } from "../../common/Runner";
	import { historyStore } from "../HistoryStore";
  import { lookupUI } from "../uiobject/ObjectRenderer";
  import MDIToggleButton from "../util/MDIToggleButton.svelte";
	import Split from "../util/Split.svelte";
	import Section from "./Section.svelte";
	import ViewType from "./ViewType.svelte";

	let key: Writable<LookupType | undefined> = historyStore("viewerKey", undefined) as any;
	let filter: Writable<string> = historyStore("viewerFilter", "", "replace");
	const styleTable: Partial<Record<LookupType, Record<string, string>>> = {
		sprite: {
			default: mdiImage,
			json: mdiCodeBraces,
		},
	};
	let styles: Record<string, string>;
	$: styles = styleTable[$key!] || { default : mdiCodeBraces };
	let style = "default";
	$: if (!(style in styles)) {
		style = "default";
	}

</script>

<Split size={20}>
	<div slot=1>
		<ViewType name="index" bind:key={$key}>All Indexes</ViewType>
		<Section name="Config" index={2}>
			<ViewType name="item" bind:key={$key}/>
			<ViewType name="hitsplat" bind:key={$key}/>
			<ViewType name="npc" bind:key={$key}/>
		</Section>
		<ViewType name="sprite" bind:key={$key}>Sprites</ViewType>
	</div>
	<div slot=2 class="rhs">
		{#if $key}
			<div class="filterbar">
				{#each Object.entries(styles) as [istyle, icon]}
					<MDIToggleButton 
						on={icon}
						checked={style === istyle}
						on:on={() => style = istyle}
						on:off={() => style = "default"}
						altOn={istyle}/>
				{/each}
				<input class="filter" type="text" bind:value={$filter} placeholder="id or name regexp"/>
			</div>
			<div class="contents tab-padded">
				{#await lookupUI(getRunner($defaultCache, $altCache), $key, $filter ?? "", style)}
					Loading...
				{:then ctor}
					{#if ctor}
						<svelte:component this={ctor} context="viewer" />
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
	.filterbar {
		width: 100%;
		flex: 0 0;
		display: flex;
		align-items: center;
	}
	.filter {
		flex-grow: 2;
	}
	.filterbar :global(.mdi) {
		width: 1.4em;
		padding: 0 3px;
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