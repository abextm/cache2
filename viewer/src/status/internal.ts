export type WorkerType = "mw_editor" | "mw_ts" | "mw_json" | "runner";

export function generateRandomID(): string {
	let id = new Uint8Array(12);
	self.crypto.getRandomValues(id);
	return [...id].map(v => v.toString(16)).join("");
}

export const isWorker = !("window" in self);

export const [windowIdentifier, workerIdentifier] = (() => {
	if (!isWorker) {
		return [generateRandomID(), generateRandomID()];
	} else {
		let parts = /^#?([a-f0-9]+)-([a-f0-9]+)$/i.exec((self as WorkerGlobalScope).location.hash)!;
		if (!parts) {
			throw new Error("invalid worker url: " + self.location.hash);
		}
		return [parts[1], parts[2]];
	}
})();

export function workerStartText(type: WorkerType): string {
	let name = {
		mw_ts: "Typescript worker",
		mw_json: "JSON worker",
		mw_editor: "Editor",
		runner: "Runner",
	}[type];
	return `Starting ${name}`;
}

export function workerLockName(type: WorkerType, identifier: string): string {
	return `worker-running-${type}-${identifier}`;
}

export const statusChannel = new BroadcastChannel(`status-${windowIdentifier}`);
