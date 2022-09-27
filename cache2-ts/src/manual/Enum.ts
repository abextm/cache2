import { CacheProvider } from "../Cache";
import { Coder } from "../def";
import { Loadable } from "../Loadable";
import { Reader } from "../Reader";
import { Typed } from "../reflect";
import { EnumID, ScriptVarChar } from "../types";

export class EnumValueMap<K extends number = number, V extends string | number = string | number> extends Map<K, V> {
	constructor(readonly parent: Enum<K, V>) {
		super();
	}
}

@Typed
export class Enum<K extends number = number, V extends string | number = string | number> extends Loadable {
	constructor(public id: EnumID) {
		super();
	}

	public keyTypeChar!: ScriptVarChar;
	public valueTypeChar!: ScriptVarChar;

	public defaultValue: V = undefined!;
	public map: Map<K, V> = new EnumValueMap<K, V>(this);

	public get(k: K): V {
		return this.map.get(k) ?? this.defaultValue;
	}

	public static decode(reader: Reader, id: EnumID): Enum {
		const v = new Enum(id);
		try {
			for (let opcode: number; (opcode = reader.u8()) != 0;) {
				switch (opcode) {
					case 1:
						v.keyTypeChar = <ScriptVarChar> reader.u8();
						break;
					case 2:
						v.valueTypeChar = <ScriptVarChar> reader.u8();
						break;
					case 3:
						v.defaultValue = reader.string();
						break;
					case 4:
						v.defaultValue = reader.i32();
						break;
					case 5:
					case 6: {
						let coder = opcode === 5 ? Coder.String : Coder.I32;
						let size = reader.u16();
						for (let i = 0; i < size; i++) {
							v.map.set(reader.i32(), reader[coder]());
						}
						break;
					}
					default:
						throw new Error(`unknown config opcode ${opcode}`);
				}
			}
		} catch (e) {
			if (typeof e === "object" && e && "message" in e) {
				let ea = e as any;
				ea.message = id + ": " + ea.message;
			}
			throw e;
		}
		return v;
	}

	public static async loadData(cache: CacheProvider, id: EnumID): Promise<Uint8Array | undefined> {
		let ad = await cache.getArchive(2, 8);
		return ad?.getFile(id)?.data;
	}

	static EnumValueMap = EnumValueMap;

	public static async all(cache: CacheProvider | Promise<CacheProvider>): Promise<Enum[]> {
		let ar = await (await cache).getArchive(2, 8);
		if (!ar) {
			return [];
		}
		return [...ar.getFiles().values()]
			.filter(v => v.data.length > 1 && v.data[0] != 0)
			.map(v => Enum.decode(new Reader(v.data), v.id as EnumID));
	}
}
