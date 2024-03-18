import * as fs from "node:fs/promises";
import * as path from "node:path";
import { CacheProvider, FileProvider } from "../Cache.js";
import { DiskCacheProvider } from "../DiskCache.js";
import { FlatCacheProvider } from "../FlatCache.js";

export class NodeFSFileProvider implements FileProvider {
	public constructor(private path: string) {
	}

	public getFile(name: string): Promise<Uint8Array | undefined> {
		return fs.readFile(path.join(this.path, name));
	}

	public exists(name: string): Promise<boolean> {
		return fs.access(path.join(this.path, name)).then(_ => true, _ => false);
	}
}

export async function loadCache(filePath: string): Promise<CacheProvider> {
	let fileProvider = new NodeFSFileProvider(filePath);
	if (await fileProvider.exists("main_file_cache.dat2")) {
		return new DiskCacheProvider(fileProvider);
	}
	if (await fileProvider.exists("0.flatcache")) {
		return new FlatCacheProvider(fileProvider);
	}
	throw new Error(`Path "${filePath}" does not contain a cache`);
}
