<script type="ts">
	import { defaultCache, altCache } from "../../common/db";
	import { IndexedDBNoPerms, IndexedDBCacheEntry, cacheIDEquals, GithubCacheID } from "../../common/CacheDirectory";
	import MDIToggleButton from "../util/MDIToggleButton.svelte";
	import { mdiChevronDown, mdiChevronRight, mdiNumeric1Box, mdiNumeric1BoxOutline, mdiNumeric2Box, mdiNumeric2BoxOutline } from "@mdi/js";

	export let entry: GithubCacheID | IndexedDBCacheEntry | IndexedDBNoPerms;
	export let name: string | undefined = undefined;
	let expanded = true;
	function any(v: any) {
		return v;
	}
</script>

<div class="entry">
	{#if entry.type === "idbnoperms"}
		No permissions <slot/>
	{:else if entry.type === "idbdir"}
		{@const entry0 = entry}
		<div class="header" on:click={() => expanded=!expanded}>
			<MDIToggleButton
				on={mdiChevronDown}
				off={mdiChevronRight}
				altOn="Collapse"
				altOff="Expand"
				bind:checked={expanded} />
				{entry.name}
				<slot/>
		</div>
		<div class="list" style:display={expanded?"block":"none"}>
			{#each entry0.entries as entry}
				<svelte:self {entry}/>
			{/each}
		</div>
	{:else if entry.type === "idb" || entry.type === "github"}
		{@const entry0 = entry}
		<MDIToggleButton
			on={mdiNumeric1Box} off={mdiNumeric1BoxOutline}
			altOn="Active default cache" altOff = "Set as default cache"
			checked={cacheIDEquals($defaultCache, entry)}
			on:on={() => $defaultCache = entry0}
			on:off={() => $defaultCache = undefined}/>
		<MDIToggleButton
			on={mdiNumeric2Box} off={mdiNumeric2BoxOutline}
			altOn="Active alt cache" altOff = "Set as alt cache"
			checked={cacheIDEquals($altCache, entry)}
			on:on={() => $altCache = entry0}
			on:off={() => $altCache = undefined}/>
			{name || any(entry).name}
			<slot/>
	{/if}
</div>

<style lang="scss">
	.entry {
		border: 1px solid #8888;
	}
	.header {
		cursor: pointer;
	}
	.list {
		padding-left: 1em;
	}
</style>