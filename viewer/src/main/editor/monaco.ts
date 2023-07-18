// we use this instead of importing monaco-editor since we don't need support for 95% of languages
// so we just pull in the ones we want here

import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";

import type * as monaco_t from "monaco-editor";

// @ts-ignore
import * as monaco_v from "monaco-editor/esm/vs/editor/edcore.main";
const monaco: typeof monaco_t = monaco_v;

// @ts-ignore
import { files as viewerContextDTS } from "../../context?dts";
// @ts-ignore
import { files as fshDTS } from "@types/wicg-file-system-access/index.d.ts?dts";
// @ts-ignore
import { files as lodashDTS } from "@types/lodash/index.d.ts?dts";
import { StatusWorkerMessageHandler } from "../../common/status";

const env: monaco_t.Environment = {
	getWorkerUrl(id, label) {
		return `mw/${label}.js`;
	},
	getWorker(id, label) {
		let path: string;
		let name: string = label;
		switch (label) {
			case "typescript":
			case "javascript":
				path = "ts";
				break;
			case "editorWorkerService":
				path = name = "editor";
				break;
			default:
				throw new Error(`Unsupported worker ${label}`);
		}
		let worker = new class extends Worker {
			override terminate(): void {
				super.terminate();
				handler.stop();
			}
		}(`mw/${path}.js`, {
			name: label,
		});
		let handler = new StatusWorkerMessageHandler(name + " worker");
		worker.addEventListener("message", ev => handler.onMessage(ev));
		return worker;
	},
};
(<any> self).MonacoEnvironment = env;

const langs = [
	monaco.languages.typescript.typescriptDefaults,
	monaco.languages.typescript.javascriptDefaults,
];

// so typescript retains types data to console.log
const genericConsole = `
interface Console {
	debug<T extends any[]>(...data: T): void;
	error<T extends any[]>(...data: T): void;
	info<T extends any[]>(...data: T): void;
	log<T extends any[]>(...data: T): void;
	trace<T extends any[]>(...data: T): void;
	warn<T extends any[]>(...data: T): void;
}

declare var console: Console;
`;

let extraLibs = {
	...fshDTS,
	...viewerContextDTS,
	...lodashDTS,
	"lib.genericconsole.d.ts": genericConsole,
};

for (let lang of langs) {
	lang.setCompilerOptions({
		...lang.getCompilerOptions(),
		// allow top level async
		module: monaco.languages.typescript.ModuleKind.System,
		// isolatedModules: true,
		target: monaco.languages.typescript.ScriptTarget.ES2020,

		// better stack traces
		inlineSourceMap: true,
		inlineSources: true,

		allowUmdGlobalAccess: true,
		moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,

		lib: ["webworker", "esnext", "genericconsole"],
		strict: true,
		baseUrl: ".",
	});
	lang.setDiagnosticsOptions({
		...lang.getDiagnosticsOptions(),

		diagnosticCodesToIgnore: [
			1375, // top level await
		],
	});
}
monaco.languages.typescript.typescriptDefaults.setWorkerOptions({
	// webpack loads tspatch in with the worker, but we still need to set this
	customWorkerPath: "data:application/javascript,void 0",
});

for (let [name, content] of Object.entries(extraLibs)) {
	for (let lang of langs) {
		lang.addExtraLib(<string> content, name);
	}
}

export { extraLibs, monaco };
