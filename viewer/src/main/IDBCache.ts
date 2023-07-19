import { IndexedDBCacheEntry, IndexedDBNoPerms } from "../common/CacheDirectory";
import { db } from "../common/db";

export const idbCacheSupported = "getAsFileSystemHandle" in DataTransferItem.prototype;

// keep handles from IDB so that chrome doesn't forget that we have permission
const fshRefs: Map<number, FileSystemHandle> = new Map();

export async function getIndexDBCacheTree(): Promise<(IndexedDBCacheEntry | IndexedDBNoPerms)[]> {
	let entries: [number, FileSystemHandle][] = [];
	let tx = db.transaction("files", "readonly");
	for await (let kv of tx.objectStore("files").iterate()) {
		entries.push([kv.key, kv.value]);
		fshRefs.set(kv.key, kv.value);
	}
	let es: Promise<IndexedDBCacheEntry | IndexedDBNoPerms | undefined>[] = entries
		.map(async ([key, file]) => {
			let perm = await file.queryPermission({
				mode: "read",
			});
			if (perm === "granted") {
				return await refreshIDBEntry(key);
			}
			if (perm === "denied") {
				console.log(`removing entry ${file.name} because permission was denied`);
				deleteIDBEntry(key);
				return;
			}
			let ent = await db.get("fileCache", key);
			if (!ent) {
				try {
					return await refreshIDBEntry(key);
				} catch (e) {
					return { key, type: "idbnoperms" as const };
				}
			}
			return ent;
		});
	return (await Promise.all(es))
		.filter(v => v)
		.map(v => v!);
}

async function getIDBEntry(
	fsh: FileSystemHandle,
	key: number,
	path: string[],
): Promise<IndexedDBCacheEntry | undefined> {
	if (fsh.kind === "file") {
		return undefined;
	}
	let dir = fsh as FileSystemDirectoryHandle;
	let files: Map<string, FileSystemFileHandle> = new Map();
	let dirs: FileSystemDirectoryHandle[] = [];
	for await (let [name, file] of dir) {
		if (file.kind === "file") {
			files.set(name, file);
		} else {
			dirs.push(file);
		}
	}
	let style: "disk" | "flat" | undefined;
	if (files.has("main_file_cache.dat2")) {
		style = "disk";
	} else if (files.has("0.flatcache")) {
		style = "flat";
	}
	if (style) {
		return {
			type: "idb",
			key,
			name: fsh.name,
			style,
			path,
		};
	}
	let entries = (await Promise.all(dirs.map(dir => getIDBEntry(dir, key, [...path, dir.name]))))
		.filter(v => v)
		.map(v => v!);

	if (entries.length <= 0) {
		return undefined;
	}

	let cmp = new Intl.Collator(undefined, {
		numeric: true,
		ignorePunctuation: true,
		sensitivity: "variant",
	}).compare;
	entries.sort((a, b) => cmp(a.name, b.name));

	return {
		type: "idbdir" as const,
		name: fsh.name,
		key,
		entries,
	};
}

export async function refreshIDBEntry(key: number, file?: FileSystemHandle): Promise<IndexedDBCacheEntry | undefined> {
	if (!file) {
		file = await getKeyHandle(key);
	}
	if (!file) {
		throw new Error("bad key");
	}
	let perm = await file.queryPermission({
		mode: "read",
	});
	if (perm !== "granted") {
		perm = await file.requestPermission({
			mode: "read",
		});
		if (perm !== "granted") {
			console.log(`removing entry ${file.name} because permission was denied`);
			deleteIDBEntry(key);
		}
	}
	let e = await getIDBEntry(file, key, []);
	if (!e) {
		console.log(`removing entry ${file.name} because it has no cache`);
		deleteIDBEntry(key);
	} else {
		db.put("fileCache", e, key);
	}
	return e;
}

export function deleteIDBEntry(key: number) {
	db.delete("files", key);
	db.delete("fileCache", key);
}

export async function getKeyHandle(key: number): Promise<FileSystemHandle | undefined> {
	let v = await db.get("files", key);
	fshRefs.set(key, v!);
	return v;
}
