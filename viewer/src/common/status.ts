import { Readable, Writable, writable } from "svelte/store";
let status0: Writable<string | undefined> | undefined;
if ("window" in self) {
	status0 = writable();
}

export const status: Readable<string | undefined> | undefined = status0;

let statuses: string[] = [];

function addStatusNow(text: string) {
	if (status0) {
		statuses.push(text);
		status0.set(statuses[statuses.length - 1]);
	} else {
		self.postMessage({ addStatus: text });
	}
}

function removeStatus(text: string) {
	if (status0) {
		let index = statuses.indexOf(text);
		if (index !== -1) {
			statuses.splice(index, 1);
		}
		status0.set(statuses[statuses.length - 1]);
	} else {
		self.postMessage({ removeStatus: text });
	}
}

export function addStatus(text: string): () => void {
	let status: "added" | "done" | undefined;
	setTimeout(() => {
		if (status === undefined) {
			addStatusNow(text);
			status = "added";
		}
	}, 10);
	return () => {
		if (status === "added") {
			removeStatus(text);
		}
		status = "done";
	};
}

export function wrapWithStatus<T extends Promise<any>>(text: string, v: T): T {
	v.finally(addStatus(text));
	return v;
}

export class StatusWorkerMessageHandler {
	private activeStatuses: string[] = [];
	private onLoaded: () => void;

	constructor(name: string) {
		this.onLoaded = addStatus(`Loading ${name}`);
	}

	public onMessage(ev: MessageEvent): boolean {
		this.onLoaded();
		if ("loaded" in ev.data) {
			return true;
		}
		if ("addStatus" in ev.data) {
			this.activeStatuses.push(ev.data.addStatus);
			addStatusNow(ev.data.addStatus);
			return true;
		}
		if ("removeStatus" in ev.data) {
			let index = this.activeStatuses.indexOf(ev.data.removeStatus);
			if (index != -1) {
				this.activeStatuses.splice(index, 1);
				removeStatus(ev.data.removeStatus);
			}
			return true;
		}
		return false;
	}

	public stop(): void {
		this.activeStatuses.forEach(removeStatus);
		this.activeStatuses = [];
	}
}

declare const __webpack_require__: {
	status: {
		loading: number;
		onChange(loading: number, isDone: boolean): void;
	};
};

{
	let status = __webpack_require__.status;
	let setDone = () => {};
	let change = status.onChange = (count, done) => {
		const text = "Loading code";
		if (count == 1 && !done) {
			setDone = addStatus(text);
		} else if (count == 0 && done) {
			setDone();
		}
	};
	if (status.loading) {
		change(status.loading, false);
	}

	if (!status0) {
		self.postMessage({ loaded: true });
	}
}
