import { CacheProvider } from "../Cache.js";
import { Loadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { GameValID } from "../types.js";

const decoder = new TextDecoder("utf-8");

export class GameVal extends Loadable {
	constructor(public gameValID: GameValID, public otherID: number) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 24;

	public name!: string;
	public files?: Map<number, string> = undefined;

	public static async loadData(
		cache: CacheProvider,
		gameValID: GameValID,
		otherID: number,
	): Promise<Reader | undefined> {
		let archive = await cache.getArchive(this.index, gameValID);
		let version = await cache.getVersion(this.index);
		let data = archive?.getFile(otherID)?.data;
		return data ? new Reader(data, version) : undefined;
	}

	public static async nameFor(
		cache: CacheProvider | Promise<CacheProvider>,
		obj: { id: number; },
	): Promise<string | undefined> {
		let clazz = obj?.constructor;
		if (clazz && "gameval" in clazz) {
			let gv = await this.load(cache, clazz.gameval, obj.id);
			return gv?.name;
		}
		return undefined;
	}

	public static decode(r: Reader, gameValID: GameValID, otherID: number): GameVal;
	public static decode(r: Reader, gameValID: GameValID, otherID: number): GameVal {
		const v = new GameVal(gameValID, otherID);

		switch (gameValID) {
			case 10: {
				// DBTable
				r.u8(); // always 1, very useful

				v.name = r.string();
				let files = v.files = new Map();

				for (let id = 0;; id++) {
					let counter = r.u8();
					if (counter == 0 && isEnd(r)) {
						break;
					}

					files.set(id, r.string());
				}
				break;
			}
			case 13: {
				// legacy widget
				v.name = r.string();
				let files = v.files = new Map();
				let msb = 0;
				let lastId = 0;

				for (;;) {
					let id = r.u8();
					if (id == 255 && isEnd(r)) {
						break;
					}
					if (id < lastId) {
						msb += 0x100;
					}
					lastId = id;

					files.set(msb + id, r.string());
				}
				break;
			}
			case 14: {
				// widget
				v.name = r.string();
				let files = v.files = new Map();

				for (;;) {
					let id = r.u16();
					if (id === 0xFFFF) {
						break;
					}

					files.set(id, r.string());
				}
				break;
			}
			default:
				v.name = decoder.decode(r.view);
		}

		return v;
	}

	public static all(cache: CacheProvider | Promise<CacheProvider>): Promise<Map<GameValID, Map<number, GameVal>>>;
	public static all(cache: CacheProvider | Promise<CacheProvider>, id: GameValID): Promise<Map<number, GameVal>>;
	public static async all(cache: CacheProvider | Promise<CacheProvider>, id?: GameValID): Promise<unknown> {
		let c = await cache;

		if (id === undefined) {
			let ids = await c.getArchives(this.index);
			if (!ids) {
				return undefined;
			}

			return new Map(
				await Promise.all(ids.map(id =>
					this.all(c, id as GameValID)
						.then(v => [id, v] as const)
				)),
			);
		}

		let version = await c.getVersion(this.index);

		let ar = await c.getArchive(this.index, id);
		if (!ar) {
			return undefined;
		}

		return new Map(
			Array.from(ar.getFiles().entries())
				.map(([fid, file]) => {
					try {
						return [fid, this.decode(new Reader(file.data, version), id, fid)];
					} catch (e) {
						if (typeof e === "object" && e && "message" in e) {
							let ea = e as any;
							ea.message = `${id}:${fid}: ${ea.message}`;
						}
						throw e;
					}
				}),
		);
	}
}

function isEnd(r: Reader) {
	let off = r.offset;
	for (; r.offset < r.length;) {
		if (r.u8() != 0) {
			r.offset = off;
			return false;
		}
	}

	return true;
}
