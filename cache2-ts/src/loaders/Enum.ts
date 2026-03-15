import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { EnumID, ScriptVarChar } from "../types.js";

export class EnumValueMap<K extends number = number, V extends string | number | bigint = string | number | bigint>
	extends Map<K, V>
{
	constructor(readonly parent: Enum<K, V>) {
		super();
	}
}

export class Enum<K extends number = number, V extends string | number | bigint = string | number | bigint>
	extends PerFileLoadable
{
	constructor(public id: EnumID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 8;

	public keyTypeChar!: ScriptVarChar;
	public valueTypeChar!: ScriptVarChar;

	public defaultValue: V = undefined!;
	public map: Map<K, V> = new EnumValueMap<K, V>(this);

	public get(k: K): V {
		return this.map.get(k) ?? this.defaultValue;
	}

	public static decode(reader: Reader, id: EnumID): Enum {
		const v = new Enum(id);
		function readTable(coder: "i32" | "i64" | "string") {
			let size = reader.u16();
			for (let i = 0; i < size; i++) {
				v.map.set(reader.i32(), reader[coder]());
			}
		}
		for (let opcode: number; (opcode = reader.u8()) != 0;) {
			switch (opcode) {
				case 1:
					v.keyTypeChar = reader.u8() as ScriptVarChar;
					break;
				case 2:
					v.valueTypeChar = reader.u8() as ScriptVarChar;
					break;
				case 3:
					v.defaultValue = reader.string();
					break;
				case 4:
					v.defaultValue = reader.i32();
					break;
				case 5:
					readTable("string");
					break;
				case 6:
					readTable("i32");
					break;
				case 7:
					readTable("i64");
					break;
				case 8:
					v.defaultValue = reader.i64();
					break;
				default:
					throw new Error(`unknown enum opcode ${opcode}`);
			}
		}
		return v;
	}
}
