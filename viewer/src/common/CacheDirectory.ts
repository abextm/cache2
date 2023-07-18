import { CacheProvider, DiskCacheProvider, FileProvider, FlatCacheProvider } from "cache2";
import { isEqual } from "lodash";
import { cacheShare } from "./CacheShare";
import { altCache as altCacheID, defaultCache as defaultCacheID } from "./db";
import { LazyPromise } from "./LazyPromise";
import { wrapWithStatus } from "./status";

export interface IndexedDBCacheID {
	type: "idb";
	key: number;
	name: string;
	style: "disk" | "flat";
	path: string[];
}

export interface IndexedDBCacheDirectory {
	type: "idbdir";
	key: number;
	name: string;
	entries: IndexedDBCacheEntry[];
}

export interface IndexedDBNoPerms {
	type: "idbnoperms";
	key: number;
}

export type IndexedDBCacheEntry = IndexedDBCacheDirectory | IndexedDBCacheID;

export interface GithubCacheID {
	type: "github";
	username: string;
	repo: string;
	commitish: string;
}

export type CacheID = IndexedDBCacheID | GithubCacheID;

export function cacheIDEquals(a: CacheID | undefined, b: CacheID | undefined): boolean {
	if (!a || !b) {
		return false;
	}
	if (a.type === "idb" && b.type === "idb") {
		return a.key == b.key && isEqual(a.path, b.path);
	} else if (a.type === "github" && b.type === "github") {
		return a.username === b.username && a.repo === b.repo && a.commitish === b.commitish;
	}
	return false;
}

export async function loadCache(key: CacheID | "default" | "alt" = "default"): Promise<CacheProvider> {
	if (key === "default" || key === "alt") {
		let v: CacheID | undefined = await (key === "alt" ? altCacheID : defaultCacheID).get();
		if (!v) {
			throw new Error(`${key} cache is not set. (Config tab)`);
		}
		key = v;
	}
	let fs: FileProvider;
	let style: "disk" | "flat";
	if (key.type === "idb") {
		let dir = await cacheShare.loadCacheDirectory(key);
		fs = {
			async getFile(name) {
				let ab = await dir.entries[name].arrayBuffer();
				return new Uint8Array(ab);
			},
		};
		style = key.style;
	} else if (key.type === "github") {
		let key0 = key;
		fs = {
			async getFile(name) {
				let req = await fetch(
					`https://raw.githubusercontent.com/${key0.username}/${key0.repo}/${key0.commitish}/${name}`,
				);
				if (!req.ok) {
					return;
				}
				let ab = await req.arrayBuffer();
				return new Uint8Array(ab);
			},
		};
		style = "flat";
	} else {
		throw new Error(`unknown type "${(key as any).type}"`);
	}

	let statusFs = {
		getFile(name) {
			return wrapWithStatus(`Loading ${name}`, fs.getFile(name));
		},
	} satisfies FileProvider;

	if (style === "disk") {
		return new DiskCacheProvider(statusFs);
	} else if (style === "flat") {
		return new FlatCacheProvider(statusFs);
	} else {
		throw new Error(`unknown style "${style}"`);
	}
}

export const cache = new LazyPromise(() => loadCache("default")).asPromise();
export const altCache = new LazyPromise(() => loadCache("alt")).asPromise();
