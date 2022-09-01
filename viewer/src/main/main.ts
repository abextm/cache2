import { CacheDirectory, setCacheShare } from "../common/CacheShare";
import { getKeyHandle } from "./IDBCache";
import Main from "./Main.svelte";

setCacheShare({
	async loadCacheDirectory(key) {
		// we run this is the main thread since chrome doesn't let us request permissions
		let out: CacheDirectory = {
			entries: {},
			key,
		};
		if (key.type === "idb") {
			let dir = (await getKeyHandle(key.key)) as FileSystemDirectoryHandle;
			if (await dir.queryPermission({ mode: "read" }) !== "granted") {
				try {
					let m = await dir.requestPermission({ mode: "read" });
					if (m !== "granted") {
						throw new Error(`${key.name}: read permission denied (${m})`);
					}
				} catch (err: any) {
					if (err.name === "SecurityError") {
						await app.forceInteraction("We require permissions again...");
						let m = await dir.requestPermission({ mode: "read" });
						if (m !== "granted") {
							throw new Error(`${key.name}: read permission denied (${m})`);
						}
					}
				}
			}
			for (let part of key.path) {
				dir = await dir.getDirectoryHandle(part);
			}
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
});

const app = new Main({
	target: document.body,
});

export default app;
