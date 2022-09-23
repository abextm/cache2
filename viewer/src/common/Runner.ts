import { Sprites } from "cache2";
import { capitalize } from "lodash";
import { getCacheSharePort } from "./CacheShare";
import { altCache, defaultCache } from "./db";
import { ServiceClient } from "./ServiceClient";
import { UIData } from "./uiobject";

export const lookupTypes = {
	ItemID: "item",
	HitsplatID: "hitsplat",
	SpriteID: "sprite",
} as const;
export type LookupType = "index" | "item" | "hitsplat" | "sprite";

export function uiType(t: LookupType): string {
	return capitalize(t);
}

export interface IRunner {
	lookup(type: LookupType, filter: string): Promise<UIData | undefined>;
	spriteMetadata(filter: string): Promise<Sprites[]>;
	spriteImageData(id: number): Promise<ImageData[]>;
}

export interface IRunnerPrivate extends IRunner {
	executeScript(text: string, port: MessagePort): Promise<void>;
	prepare(cacheShare: MessagePort): Promise<void>;
}

let runner: Runner | undefined;
export let scriptRunner: Runner | undefined;

function proxy<K extends keyof T, T = IRunner>(name: K): T[K] {
	return function(...args: any[]) {
		// @ts-ignore
		return this.client.then(v => v[name](...args));
	} as any;
}

export class Runner implements IRunner {
	private worker: Worker;
	private client: Promise<ServiceClient & IRunnerPrivate>;

	constructor() {
		this.worker = new Worker("Runner.js");
		this.client = new Promise(resolve => {
			let onMsg = (ev: MessageEvent<Ready>) => {
				if (ev.data.type === "ready") {
					this.worker.removeEventListener("message", onMsg);
					let port = getCacheSharePort();
					let client = ServiceClient.create<IRunnerPrivate>(this.worker);
					client.prepare(port);
					resolve(client);
				}
			};
			this.worker.addEventListener("message", onMsg);
		});
	}

	terminate() {
		if (runner === this) {
			runner = undefined;
		}
		this.worker.terminate();
	}

	async executeScript(text: string, listener: (ev: ScriptResponse) => void): Promise<void> {
		if (scriptRunner) {
			scriptRunner.terminate();
		}
		scriptRunner = this;

		let poolRunner = runner === this;
		runner = undefined;

		let c = await this.client;
		let chan = new MessageChannel();
		chan.port1.onmessage = (ev: MessageEvent<ScriptResponse>) => listener(ev.data);

		await c.executeScript(text, chan.port2);

		scriptRunner = undefined;
		if (poolRunner) {
			if (!runner) {
				runner = this;
			} else {
				this.terminate();
			}
		}
	}

	lookup = proxy("lookup");
	spriteMetadata = proxy("spriteMetadata");
	spriteImageData = proxy("spriteImageData");
}

defaultCache.subscribe(() => runner?.terminate());
altCache.subscribe(() => runner?.terminate());

export function getRunner(..._unusedCacheStores: any[]): Runner {
	if (!runner) {
		runner = new Runner();
	}
	return runner;
}

export interface Ready {
	type: "ready";
}

export type LogLevel = "error" | "warning" | "info" | "debug" | "trace" | "done";
export interface Log {
	type: "log";
	level: LogLevel;
	args: UIData;
}

export interface ClearConsole {
	type: "clearconsole";
	silent?: boolean;
}

export type ScriptResponse = Log | ClearConsole;
