import {
	generateRandomID,
	statusChannel,
	windowIdentifier,
	workerLockName,
	workerStartText,
	WorkerType,
} from "./internal";
import { StatusChannelMessage } from "./status";

export class Worker2 extends Worker {
	public readonly workerIdentifier: string;
	public readonly ready: Promise<Worker2>;
	public readonly exited: Promise<void>;
	public isRunning: boolean = false;

	constructor(type: WorkerType) {
		const workerIdentifier = generateRandomID();
		let ready = new Promise<Worker2>((ok, err) => {
			let timeout = setTimeout(() => {
				err(new Error("Worker failed to start"));
			}, 20_000);
			let onMsg = (ev: MessageEvent<StatusChannelMessage>) => {
				if (ev.data.owner == workerIdentifier && ev.data.isWorkerReadyChange && ev.data.type == "remove") {
					statusChannel.removeEventListener("message", onMsg);
					clearTimeout(timeout);
					this.isRunning = true;
					ok(this);
				}
			};
			statusChannel.addEventListener("message", onMsg);
		});

		statusChannel.postMessage(
			{
				owner: workerIdentifier,
				text: workerStartText(type),
				type: "add",
				isWorkerReadyChange: true,
			} satisfies StatusChannelMessage,
		);

		super(`worker.js#${windowIdentifier}-${workerIdentifier}`, { name: type });
		this.workerIdentifier = workerIdentifier;
		this.ready = ready;
		this.exited = (async () => {
			try {
				await ready;
			} catch (_e) {
				return;
			}
			await navigator.locks.request(workerLockName(type, workerIdentifier), () => {});
		})();
	}
}
