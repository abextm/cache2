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
(self as any).MonacoEnvironment = env;

const langs = [
	monaco.languages.typescript.typescriptDefaults,
	monaco.languages.typescript.javascriptDefaults,
];

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

		lib: ["lib.webworker.d.ts", "lib.esnext.d.ts", "lib.genericconsole.d.ts"],
		types: ["lodash"],
		strict: true,
		baseUrl: "/",
	});
	lang.setDiagnosticsOptions({
		...lang.getDiagnosticsOptions(),

		diagnosticCodesToIgnore: [
			1375, // top level await
		],
	});
}

export { monaco };
