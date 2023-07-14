import { CacheProvider } from "./Cache";
import { Reader } from "./Reader";

type LoadableType<I extends Loadable, ARGS extends unknown[]> = {
	decode(reader: Reader, ...args: ARGS): I;
	loadData(cache: CacheProvider, ...args: ARGS): Promise<Uint8Array | undefined>;
};

type OrNumber<T extends unknown[]> = T;

export abstract class Loadable {
	public static load<I extends Loadable, ARGS extends unknown[]>(
		this: LoadableType<I, ARGS>,
		cache: CacheProvider | Promise<CacheProvider>,
		...args: OrNumber<ARGS>
	): Promise<I | undefined>;
	public static load<I extends Loadable, ARGS extends unknown[]>(
		this: LoadableType<I, ARGS>,
		reader: Reader | ArrayBufferView | ArrayBuffer,
		...args: OrNumber<ARGS>
	): I;
	public static load<I extends Loadable, ARGS extends unknown[]>(
		this: LoadableType<I, ARGS>,
		reader: Reader | ArrayBufferView | ArrayBuffer | CacheProvider | Promise<CacheProvider>,
		...args: OrNumber<ARGS>
	): Promise<I | undefined> | I {
		if (reader instanceof ArrayBuffer || ArrayBuffer.isView(reader)) {
			reader = new Reader(reader);
		}
		if (reader instanceof Reader) {
			return this.decode(reader, ...args);
		} else {
			return (async () => {
				let data = await this.loadData(await reader, ...args);
				if (data) {
					return this.decode(new Reader(data), ...args);
				}
			})();
		}
	}
}

export abstract class PerArchiveLoadable extends Loadable {
	public static loadData(this: { index: number; }, cache: CacheProvider, id: number): Promise<Uint8Array | undefined> {
		return cache.getArchive(this.index, id as number).then(v => v?.getFile(0)?.data);
	}

	public static async all<
		I extends PerArchiveLoadable,
		ID extends number,
	>(this: {
		index: number;
		decode(reader: Reader, id: ID): I;
	}, cache0: CacheProvider | Promise<CacheProvider>): Promise<I[]> {
		let cache = await cache0;
		let ids = await cache.getArchives(this.index);
		if (!ids) {
			return [];
		}

		let archives = await Promise.all(ids.map(id => cache.getArchive(this.index, id)));

		return archives
			.filter(v => v)
			.map(v => {
				try {
					return this.decode(new Reader(v!.getFile(0)!.data), v!.archive as ID);
				} catch (e) {
					if (typeof e === "object" && e && "message" in e) {
						let ea = e as any;
						ea.message = v!.archive + ": " + ea.message;
					}
					throw e;
				}
			});
	}
}

export abstract class NamedPerArchiveLoadable extends PerArchiveLoadable {
	public static async loadByName<
		I extends PerArchiveLoadable,
		ID extends number,
	>(
		this: {
			index: number;
			decode(reader: Reader, id: ID): I;
		},
		cache0: CacheProvider | Promise<CacheProvider>,
		name: string | number,
	): Promise<I | undefined> {
		let cache = await cache0;
		let ar = await cache.getArchiveByName(this.index, name);
		let data = ar?.getFile(0)?.data;
		if (data) {
			return this.decode(new Reader(data), ar!.archive as ID);
		}
	}
}

export class PerFileLoadable extends Loadable {
	public static loadData(
		this: { index: number; archive: number; },
		cache: CacheProvider,
		id: number,
	): Promise<Uint8Array | undefined> {
		return cache.getArchive(this.index, this.archive).then(v => v?.getFile(id)?.data);
	}

	public static async all<
		I extends PerFileLoadable,
		ID extends number,
	>(this: {
		index: number;
		archive: number;
		decode(reader: Reader, id: ID): I;
	}, cache0: CacheProvider | Promise<CacheProvider>): Promise<I[]> {
		let cache = await cache0;
		let ad = await cache.getArchive(this.index, this.archive);
		if (!ad) {
			return [];
		}

		return [...ad.getFiles().values()]
			.filter(v => v.data.length > 1 && v.data[0] != 0)
			.map(v => {
				try {
					return this.decode(new Reader(v.data), v.id as ID);
				} catch (e) {
					if (typeof e === "object" && e && "message" in e) {
						let ea = e as any;
						ea.message = v.id + ": " + ea.message;
					}
					throw e;
				}
			});
	}
}
