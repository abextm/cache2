// we use this instead of importing monaco-editor since we don't need support for 95% of languages
// so we just pull in the ones we want here

import "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";

// we vendor the typescript worker & related stuff so that we can
// 1) use a modern version of typescript
// 2) not send all of our d.ts files to the worker for no reason
// 3) avoid ugly hacks to install our custom transformers
import "./vendor/typescript/monaco.contribution";

import type * as monaco_t from "monaco-editor";

// @ts-ignore
import * as monaco_v from "monaco-editor/esm/vs/editor/edcore.main";
const monaco: typeof monaco_t = monaco_v;

// @ts-ignore
import { files as viewerContextDTS } from "../context?dts";
// @ts-ignore
import { files as fshDTS } from "@types/wicg-file-system-access/index.d.ts?dts";
// @ts-ignore
import { files as lodashDTS } from "@types/lodash/index.d.ts?dts";
import { Worker2, WorkerType } from "../status";

const env: monaco_t.Environment = {
	getWorker(id, label) {
		let type: WorkerType;
		switch (label) {
			case "typescript":
			case "javascript":
				type = "mw_ts";
				break;
			case "editorWorkerService":
				type = "mw_editor";
				break;
			default:
				throw new Error(`Unsupported worker ${label}`);
		}
		return new Worker2(type).ready;
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
	/* @TypedCall */ debug<T extends any[]>(...data: T): void;
	/* @TypedCall */ error<T extends any[]>(...data: T): void;
	/* @TypedCall */ info<T extends any[]>(...data: T): void;
	/* @TypedCall */ log<T extends any[]>(...data: T): void;
	/* @TypedCall */ trace<T extends any[]>(...data: T): void;
	/* @TypedCall */ warn<T extends any[]>(...data: T): void;
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

for (let [name, content] of Object.entries(extraLibs)) {
	for (let lang of langs) {
		lang.addExtraLib(<string> content, name);
	}
}

export { extraLibs, monaco };