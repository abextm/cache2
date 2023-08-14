import { Sprites } from "cache2";
import { capitalize } from "lodash";
import { Worker2, wrapWithStatus } from "../status/";
import { getCacheSharePort } from "./CacheShare";
import { altCache, defaultCache } from "./db";
import { ServiceClient } from "./ServiceClient";
import { UIData } from "./uiobject";

export const lookupTypes = {
	DBRowID: "dbrow",
	DBTableID: "dbtable",
	EnumID: "enum",
	ItemID: "item",
	HitsplatID: "hitsplat",
	NPCID: "npc",
	ObjID: "obj",
	ParamID: "param",
	SpriteID: "sprite",
	StructID: "struct",
	UnderlayID: "underlay",
} as const;
export type LookupType =
	| "dbrow"
	| "dbtable"
	| "enum"
	| "index"
	| "item"
	| "hitsplat"
	| "npc"
	| "obj"
	| "param"
	| "sprite"
	| "struct"
	| "underlay";

const uiNameOverride = {
	dbrow: "DBRow",
	dbtable: "DBTable",
	npc: "NPC",
} satisfies Partial<Record<LookupType, string>>;
export function uiType(t: LookupType): string {
	return uiNameOverride[t as keyof typeof uiNameOverride] ?? capitalize(t);
}

export interface IRunner {
	lookup(type: LookupType, filter: string | number): Promise<UIData | undefined>;

	spriteMetadata(filter: string): Promise<Sprites[]>;
	spriteImageData(id: number): Promise<ImageData[]>;
	namedSprite(name: string, index: number): Promise<ImageData | undefined>;

	dbTables(filter: string | number): Promise<UIData | undefined>;
}

export interface IRunnerPrivate extends IRunner {
	executeScript(text: string, port: MessagePort): Promise<void>;
	prepare(cacheShare: MessagePort): Promise<void>;
}

let runner: Runner | undefined;
export let scriptRunner: Runner | undefined;

function proxy<K extends keyof T, T = IRunner>(name: K, status?: string): T[K] {
	return function(...args: any[]) {
		// @ts-ignore
		let p = this.client[name](...args);
		if (status) {
			wrapWithStatus(status, p);
		}
		return p;
	} as any;
}

export class Runner implements IRunner {
	private worker: Worker2;
	private client: ServiceClient & IRunnerPrivate;

	constructor() {
		this.worker = new Worker2("runner");
		this.client = ServiceClient.create<IRunnerPrivate>(this.worker);
		this.client.prepare(getCacheSharePort());
	}

	terminate() {
		if (runner === this) {
			runner = undefined;
		}
		this.client.close();
	}

	async executeScript(text: string, listener: (ev: ScriptResponse) => void): Promise<void> {
		if (scriptRunner) {
			scriptRunner.terminate();
		}
		scriptRunner = this;

		let poolRunner = runner === this;
		runner = undefined;

		let c = this.client;
		let chan = new MessageChannel();
		chan.port1.onmessage = (ev: MessageEvent<ScriptResponse>) => listener(ev.data);

		await wrapWithStatus("Running script", c.executeScript(text, chan.port2));

		scriptRunner = undefined;
		if (poolRunner) {
			if (!runner) {
				runner = this;
			} else {
				this.terminate();
			}
		}
	}

	lookup = proxy("lookup", "Loading");
	spriteMetadata = proxy("spriteMetadata", "Loading sprites");
	spriteImageData = proxy("spriteImageData");
	namedSprite = proxy("namedSprite");
	dbTables = proxy("dbTables", "Loading DBTables");
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
