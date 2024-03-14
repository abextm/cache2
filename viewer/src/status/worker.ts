import { statusChannel, workerIdentifier, workerLockName, workerStartText, WorkerType } from "./internal";
import { installWebpackHook, StatusChannelMessage } from "./status";

let type = self.name as WorkerType;

installWebpackHook();
navigator.locks.request(workerLockName(type, workerIdentifier), () => new Promise(() => {}));

const entryPoints = {
	// @ts-ignore
	mw_editor: () => import("monaco-editor/esm/vs/editor/editor.worker.js"),
	mw_ts: () => import("../monaco/tsworker"),
	// @ts-ignore
	mw_json: () => import("monaco-editor/esm/vs/language/json/json.worker.js"),
	runner: () => import("../runner/Runner"),
} satisfies Record<WorkerType, () => Promise<any>>;

let start = entryPoints[type];
start().then(v => {
	statusChannel.postMessage(
		{
			owner: workerIdentifier,
			text: workerStartText(type),
			type: "remove",
			isWorkerReadyChange: true,
		} satisfies StatusChannelMessage,
	);
});
