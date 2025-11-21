import { DBSchema, IDBPDatabase, openDB, StoreKey, StoreNames, StoreValue } from "idb/with-async-ittr";
import { Readable, Updater, Writable, writable } from "svelte/store";
import { CacheID, GithubCacheID, IndexedDBCacheEntry } from "./CacheDirectory";

export type ConfigTypes = {
	darkMode: boolean;
	defaultCache: CacheID | undefined;
	altCache: CacheID | undefined;
};

interface DBv1 extends DBSchema {
	files: {
		key: number;
		value: FileSystemHandle;
	};
	fileCache: {
		key: number;
		value: IndexedDBCacheEntry;
	};
	config: {
		key: string;
		value: any;
	};
}
export type DB = DBv1;

const channelTx = new BroadcastChannel("tableChanged");
const channelRx = new BroadcastChannel("tableChanged");

let _db = await openDB<DB>("cache2-viewer", 1, {
	upgrade(db, oldVersion) {
		if (oldVersion < 1) {
			db.createObjectStore("files", {
				autoIncrement: true,
			});
			db.createObjectStore("config");
			db.createObjectStore("fileCache");
		}
	},
});
export const db: IDBPDatabase<DB> = new Proxy(_db, {
	get(target, key, recv) {
		let van = Reflect.get(target, key, recv);
		if (key === "transaction") {
			return function(...args: any[]) {
				let tx: IDBTransaction = van.apply(_db, args);
				if (tx.mode !== "readonly") {
					tx.addEventListener("complete", ev => {
						channelTx.postMessage(Array.from(tx.objectStoreNames));
					});
				}
				return tx;
			};
		}
		return van;
	},
});

export async function dbAllEntries<K extends StoreNames<DB>>(
	store: K,
): Promise<[StoreKey<DB, K>, StoreValue<DB, K>][]> {
	let entries: [StoreKey<DB, K>, StoreValue<DB, K>][] = [];
	let tx = db.transaction(store, "readonly");
	for await (let kv of tx.objectStore(store).iterate()) {
		entries.push([kv.primaryKey, kv.value]);
	}
	return entries;
}

export interface LiveQueryRO<T> extends Readable<T> {
	ready: Promise<LiveQueryRO<T>>;
	get(): Promise<T>;
}

export function liveQueryRO<T>(
	stores: StoreNames<DB> | StoreNames<DB>[],
	get: () => Promise<T>,
	default0: T,
): LiveQueryRO<T> {
	if (!Array.isArray(stores)) {
		stores = [stores];
	}
	let store = writable(default0, set => {
		function onChange(ev: MessageEvent) {
			let names = ev.data as string[];
			if (names.some(n => (stores as string).indexOf(n) !== -1)) {
				get().then(set);
			}
		}
		channelRx.addEventListener("message", onChange);
		return () => {
			channelRx.removeEventListener("message", onChange);
		};
	});
	let lq: LiveQueryRO<T> = {
		subscribe: store.subscribe,
		get,
		ready: undefined!,
	};
	lq.ready = (async () => {
		try {
			store.set(await get());
		} catch (e) {
			console.error(e);
		}
		return lq;
	})();
	return lq;
}

export type LiveQueryRW<T> = LiveQueryRO<T> & Writable<T>;

export function liveQueryRW<T>(
	stores: StoreNames<DB> | StoreNames<DB>[],
	get: () => Promise<T>,
	set: (v: T) => void,
	default0: T,
): LiveQueryRW<T> {
	let store = liveQueryRO(stores, get, default0) as LiveQueryRW<T>;
	store.set = set;
	store.update = (updater: Updater<T>) => {
		get()
			.then(updater)
			.then(set);
	};
	return store;
}

export function config<NAME extends keyof ConfigTypes>(
	name: NAME,
	default0: ConfigTypes[NAME],
): LiveQueryRW<ConfigTypes[NAME]> {
	return liveQueryRW<ConfigTypes[NAME]>(["config"], async () => {
		let e = await db.get("config", name);
		if (!e) {
			return default0;
		}
		return e;
	}, value => {
		db.put("config", value, name);
	}, default0);
}

export const darkMode = await config(
	"darkMode",
	"matchMedia" in self && (self as any).matchMedia("(prefers-color-scheme: dark)").matches,
).ready;

export const GITHUB_MASTER: GithubCacheID = {
	type: "github",
	username: "abextm",
	repo: "osrs-cache",
	commitish: "master",
};
export const GITHUB_PREV: GithubCacheID = {
	...GITHUB_MASTER,
	commitish: "master^",
};
export const defaultCache = config("defaultCache", GITHUB_MASTER);
export const altCache = config("altCache", GITHUB_PREV);
