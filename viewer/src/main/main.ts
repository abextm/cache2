import { IndexedDBCacheID, IndexedDBXTEAID } from "../common/CacheDirectory";
import { CacheDirectory, setCacheShare } from "../common/CacheShare";
import { getKeyHandle } from "./IDBCache";
import Main from "./Main.svelte";

async function loadKey<const IsFile extends "file" | "dir">(
	key: IndexedDBXTEAID | IndexedDBCacheID,
	isFile: IsFile,
): Promise<{ file: FileSystemFileHandle; dir: FileSystemDirectoryHandle; }[IsFile]> {
	let entry = (await getKeyHandle(key.key))!;
	if (await entry.queryPermission({ mode: "read" }) !== "granted") {
		try {
			let m = await entry.requestPermission({ mode: "read" });
			if (m !== "granted") {
				throw new Error(`${key.name}: read permission denied (${m})`);
			}
		} catch (err: any) {
			if (err.name === "SecurityError") {
				await app.forceInteraction("We require permissions again...");
				let m = await entry.requestPermission({ mode: "read" });
				if (m !== "granted") {
					throw new Error(`${key.name}: read permission denied (${m})`);
				}
			}
		}
	}
	for (let i = 0; i < key.path.length; i++) {
		let dir = entry as FileSystemDirectoryHandle;
		if (i === key.path.length - 1 && isFile === "file") {
			entry = await dir.getFileHandle(key.path[i]);
		} else {
			entry = await dir.getDirectoryHandle(key.path[i]);
		}
	}
	return entry as any;
}

setCacheShare({
	async loadCacheDirectory(key) {
		// we run this is the main thread since chrome doesn't let us request permissions
		let out: CacheDirectory = {
			entries: {},
			key,
		};
		if (key.type === "idb") {
			let dir = await loadKey(key, "dir");
			for await (let file of dir.values()) {
				if (file.kind === "file") {
					out.entries[file.name] = await file.getFile();
				}
			}
		} else {
			throw new Error(`unknown type "${key.type}"`);
		}
		return out;
	},
	async loadXTEA(key) {
		if (key.type === "idbxtea") {
			let file = await loadKey(key, "file");
			return await file.getFile();
		} else {
			throw new Error(`unknown type "${key.type}"`);
		}
	},
});

const app = new Main({
	target: document.body,
});

export default app;
