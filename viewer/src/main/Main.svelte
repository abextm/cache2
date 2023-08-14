<script lang="ts">
	import Tab from "./Tab.svelte";
	import TabContents from "./TabContents.svelte";
	import { historyStore } from "./HistoryStore";
	import { darkMode } from "../common/db";
	import { Writable } from "svelte/store";
	import { mdiGithub } from "@mdi/js";
  import MDI from "./util/MDI.svelte";
	import Status from "../status/Status.svelte";

	let tab: Writable<string> = historyStore("tab", "config");

	darkMode.subscribe(dark => {
		document.body.classList.remove(dark ? "light" : "dark");
		document.body.classList.add(dark ? "dark" : "light");
	});

	let interaction: {text: string, resolve: () => void, reject: (err: Error) => void} | undefined;
	let runningInteraction: Promise<void> | undefined;

	export async function forceInteraction(text: string): Promise<void> {
		try {
			await runningInteraction;
		} catch(e) {
			// ignore
		}
		return runningInteraction = new Promise((resolve, reject) => interaction = {text, resolve, reject});
	}

	function onInteract() {
		let v = interaction;
		interaction = undefined;
		v?.resolve();
	}
</script>

<div class="main toplevel">
	<div class="tabbar">
		<Tab bind:tab={$tab} key="viewer">Viewer</Tab
		><Tab bind:tab={$tab} key="editor">Editor</Tab
		><Tab bind:tab={$tab} key="config">Config</Tab>
		<Status/>
		<span class="links">
			<a href="https://github.com/abextm/cache2/"><MDI icon={mdiGithub} alt="Github"/></a>
		</span>
	</div>
	<TabContents tab={$tab} key="viewer" async={() => import("./viewer/Viewer.svelte")} />
	<TabContents tab={$tab} key="editor" async={() => import("./editor/Editor.svelte")} />
	<TabContents tab={$tab} key="config" async={() => import("./config/Config.svelte")} />
</div>
{#if interaction}
	<div class="toplevel popup-container" on:click|preventDefault={onInteract}>
		<div class="popup">
			{interaction.text}
			<button on:click={onInteract}> Ok </button>
		</div>
	</div>
{/if}

<style lang="scss">
	.toplevel {
		position:absolute;
		top: 0;
		left: 0;
		bottom: 0;
		right: 0;
	}
	.main {
		display: flex;
		flex-direction: column;
		overflow: clip;
	}
	.tabbar {
		flex: 0 0;
		display: flex;
		align-items: stretch;
		gap: 1px;
		background: #8883;
	}

	.popup-container {
		background: #000b;
	}
	.popup {
		background: var(--background);
		margin-left: auto;
		margin-right: auto;
		max-width: 400px;
		padding: .5em;
		box-shadow: #000 0px 0px 4px;
		& > button {
			float: right;
		}
	}

	.links {
		padding: 0 2px;
		:global(svg) {
			width: 1.8em;
			padding: 2px;
			padding-top: 3px;
			box-sizing: border-box;
		}
	}
</style>