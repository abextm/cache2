import { CacheID, IndexedDBCacheID, IndexedDBXTEAID } from "./CacheDirectory";
import { ServiceClient } from "./ServiceClient";
import { ServiceServer } from "./ServiceServer";

export interface CacheDirectory {
	entries: {
		[name: string]: Blob;
	};
	key: CacheID;
}

export interface CacheShare {
	loadCacheDirectory(key: IndexedDBCacheID): Promise<CacheDirectory>;
	loadXTEA(key: IndexedDBXTEAID): Promise<Blob>;
}

export let cacheShare: CacheShare;

export function setCacheShare(cs: CacheShare) {
	cacheShare = cs;
}

export function getCacheSharePort(): MessagePort {
	if (cacheShare instanceof ServiceClient) {
		return cacheShare.newPort();
	} else {
		if (!cacheShare) {
			throw new Error("must setCacheShare");
		}
		let c = new MessageChannel();
		new ServiceServer(c.port1, cacheShare);
		return c.port2;
	}
}
