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
