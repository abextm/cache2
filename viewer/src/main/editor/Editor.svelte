<script lang="ts">
	import type * as monaco_t from "monaco-editor";
	import JSObject from "../uiobject/JSObject.svelte";
	import Split from "../util/Split.svelte";
	import { onMount, onDestroy } from "svelte";
	import { ScriptResponse, getRunner, scriptRunner } from "../../common/Runner";
	import { altCache, darkMode, defaultCache } from "../../common/db";
	
	let container: HTMLDivElement;
	let monaco: typeof monaco_t;
	let editor: monaco_t.editor.IStandaloneCodeEditor;
	interface LogData {
		id: number,
	}
	let logs: (ScriptResponse&LogData)[] = [];
	let fontFamily = "'Source Code Pro', 'Droid Sans Mono', 'monospace', monospace, 'Droid Sans Fallback'";

	const editorDefault = `import * as c2 from "cache2";
import * as context from "viewer/context";
`;

	const EDITOR_CONTENTS = "editorContents";

	onMount(async () => {
		({monaco} = await import("./monaco"));
		darkMode.subscribe(dark => 
			monaco.editor.setTheme(dark ? "vs-dark" : "vs"));

		editor = monaco.editor.create(container, {
			autoClosingQuotes: "never",
			autoClosingBrackets: "never",
			automaticLayout: true,
			autoDetectHighContrast: false,
			accessibilitySupport: "off",
			fontFamily,
			renderWhitespace: "boundary",
			insertSpaces: false,
			tabSize: 2,
			minimap: {
				enabled: false,
			},
			language: "typescript",
			value: window.sessionStorage[EDITOR_CONTENTS] || editorDefault,
		});

		editor.onDidChangeModelContent(_e => saveContents());
	});

	let savingContent = -1;
	let saveContents = (force?: boolean) => {
		if (force) {
			if (editor) {
				sessionStorage[EDITOR_CONTENTS] = editor.getValue();
			}

			if (savingContent != -1) {
				clearTimeout(savingContent)
			}
			savingContent = -1;
		} else if (savingContent == -1) {
			savingContent = setTimeout(() => saveContents(true), 1000);
		}
	};

	onDestroy(() => {
		editor.dispose();
	});

	let lastID = 1;
	let log = <T extends ScriptResponse>(r: T) => {
		if (r.type === "clearconsole") {
			logs = [];
			if (r.silent) {
				return;
			}
		}
		logs.push({
			...r,
			id: lastID++,
		});
		if (logs.length > 1000) {
			logs = logs.splice(0, logs.length - 800);
		} else {
			logs = logs;
		}
	};

	let run = async () => {
		try {
			getRunner();

			let model = editor.getModel();
			if (!model) {
				throw new Error("no model");
			}

			let tsworker = await (await monaco.languages.typescript.getTypeScriptWorker())(model.uri)
			let output = await tsworker.getEmitOutput(model.uri.toString());
			if (output.emitSkipped) {
				throw new Error("no output emitted");
			}

			let jsOutput = output.outputFiles.find(o => o.name.endsWith(".js"));
			if (!jsOutput) {
				throw new Error("no files emitted")
			}
			console.debug(jsOutput.text);
			
			getRunner().executeScript(jsOutput.text, log);
		} catch (e) {
			console.error(e);//show user?
		}
		return false;
	};

	let stop = () => {
		scriptRunner?.terminate();
	}

	function cacheChange() {
		stop();
		logs = [];
	}

	defaultCache.subscribe(cacheChange);
	altCache.subscribe(cacheChange);
</script>

<style lang="scss">
	@use "sass:color";

	.editorContainer {
		display: flex;
		flex-direction: column;
	}
	.toolbar {
		flex: 0 0;
	}
	.editor {
		flex: 1 1;
		height: 0; // I'm sure there is some valid reason this works
	}
	.logs {
		overflow: clip auto;
		.content:not(:last-child) {
			border-bottom: 1px solid rgba(128, 128, 128, 128);
		}

		@mixin level($content, $color, $backgroundAlpha: -75%) {
			background-color: color.scale($color, $alpha: $backgroundAlpha);

			>span::before {
				content: $content;
				color: $color;
			}
		}

		.error {
			@include level("x", #F22);
		}
		.warning {
			@include level("!", #CC0);
		}
		.info {
			@include level("i", #8888, -100%);
		}
		.debug {
			@include level("d", #222);
		}
		.trace {
			@include level("t", #222);
		}

		.content>span::before {
			width: 1em;
			display: inline-block;
			vertical-align: top;
			text-align: center;
		}
		.content>span>:global(div) {
			display: inline-block;
		}
	}
</style>

<svelte:window on:pagehide={() => saveContents(true)} />
<Split size={50}>
	<div slot=1 class="editorContainer">
		<div class="toolbar">
			<button on:click={run}>Run</button>
			<button on:click={stop}>Stop</button>
			<button on:click={() => log({type: "clearconsole"})}>Clear</button>
		</div>
		<div class="editor" bind:this={container}></div>
	</div>
	<div slot=2 class="logs" style="font-family: {fontFamily}; font-size: 14px;">
		{#each logs as log (log.id)}
		<div class="content {log.type} {log.type == 'log' ? log.level : ''}">
			<span>
				{#if log.type == "clearconsole"}
					The console has been cleared
				{:else if log.type == "log"}
					<JSObject value={log.args} unwrap expanded={log.id === lastID - 1}/>
				{:else}
					{(console.log(log), "")}
					Unknown message
				{/if}
			</span>
		</div>
		{/each}
	</div>
</Split>