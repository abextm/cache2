<script lang="ts">
	import { getIndexDBCacheTree, refreshIDBEntry, deleteIDBEntry, idbCacheSupported } from "../IDBCache";
	import { db, GITHUB_MASTER, GITHUB_PREV, liveQueryRO } from "../../common/db";
	import MDIButton from "../util/MDIButton.svelte";
	import CacheSelectorEntry from "./CacheSelectorEntry.svelte";
	import { mdiRefresh, mdiDelete } from "@mdi/js";

	let entries = liveQueryRO(["files", "fileCache"], getIndexDBCacheTree, []);
	let dragover = false;

	async function addCaches(ev: DragEvent) {
		dragover = false;
		let items = ev.dataTransfer?.items;
		if (!items) {
			return;
		}
		for (let i = 0; i < items.length; i++) {
			/* eslint no-undef: "off" */
			let fsh: FileSystemHandle = await (items[i] as any).getAsFileSystemHandle?.()
			if (!fsh) {
				console.warn("no getAsFileSystemHandle");
				continue;
			}

			db.add("files", fsh);
		}
	}
</script>

{#if idbCacheSupported}
	Local caches:<br>
	<div class="list"
		class:dragover
		on:drop|preventDefault|stopPropagation={addCaches}
		on:dragover|preventDefault={() => dragover = true}
		on:dragleave={() => dragover = false}>
		{#each $entries as entry}
			<CacheSelectorEntry {entry}>
				<MDIButton
					icon={mdiRefresh}
					alt="Refresh"
					on:click={() => refreshIDBEntry(entry.key)}/>
				<MDIButton
					icon={mdiDelete}
					alt="delete"
					on:click={() => deleteIDBEntry(entry.key)}/>
			</CacheSelectorEntry>
		{/each}
		<div class="add-more">
			Drop caches / directories containing caches here
		</div>
	</div>
{:else}
	Your browser does not support persisting files<br>
{/if}
Github caches
<CacheSelectorEntry entry={GITHUB_MASTER} name="master"/>
<CacheSelectorEntry entry={GITHUB_PREV} name="master^"/>

<style lang="scss">
	.list {
		border: 1px solid #8888;
	}
	.list.dragover {
		background-color: #8884;
		& > :not(.add-more) {
			opacity: .5;
		}
	}
</style>