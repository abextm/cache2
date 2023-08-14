import { statusChannel, workerIdentifier } from "./internal";

export interface StatusChannelMessage {
	owner: string;
	text: string;
	type: "add" | "remove";
	isWorkerReadyChange?: true;
}

function addStatusNow(text: string) {
	statusChannel.postMessage(
		{
			owner: workerIdentifier,
			text,
			type: "add",
		} satisfies StatusChannelMessage,
	);
}

function removeStatus(text: string) {
	statusChannel.postMessage(
		{
			owner: workerIdentifier,
			text,
			type: "remove",
		} satisfies StatusChannelMessage,
	);
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

declare const __webpack_require__: {
	status: {
		loading: number;
		onChange(loading: number, isDone: boolean): void;
		started: boolean;
		onStarted(): void;
	};
};

export function installWebpackHook() {
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
}
