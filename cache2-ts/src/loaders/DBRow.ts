import { PerFileLoadable } from "../Loadable";
import { Reader } from "../Reader";
import { Typed } from "../reflect";
import { ScriptVarType } from "../ScriptVarType";
import { DBRowID, DBTableID, ScriptVarID } from "../types";

function readTypes(r: Reader): ScriptVarID[] {
	let size = r.u8();
	let types = new Array(size);
	for (let i = 0; i < size; i++) {
		types[i] = r.u8o16();
	}
	return types;
}

function readValues(r: Reader, types: ScriptVarID[]): (string | number | bigint)[] {
	let strides = r.u8o16();
	let values = new Array(types.length * strides);
	for (let stride = 0; stride < strides; stride++) {
		for (let i = 0; i < types.length; i++) {
			let type = ScriptVarType.forID(types[i]);
			if (type === undefined) {
				throw new Error(`unknown type ${types[i]}`);
			}
			let v: string | number | bigint;
			switch (type.baseType) {
				case "int":
					v = r.i32();
					break;
				case "string":
					v = r.string();
					break;
				case "long":
					v = r.i64();
					break;
			}
			values[stride * types.length + i] = v;
		}
	}
	return values;
}

@Typed
export class DBRow extends PerFileLoadable {
	constructor(public id: DBRowID) {
		super();
	}

	public static readonly index = 2;
	public static readonly archive = 38;

	public table = <DBTableID> -1;
	public values: (string | number | bigint | undefined)[][] = [];
	public types: (ScriptVarID | undefined)[][] = [];

	public static decode(r: Reader, id: DBRowID): DBRow {
		const v = new DBRow(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 3: {
					let len = r.u8();
					v.values = new Array(len);
					v.types = new Array(len);

					for (;;) {
						let column = r.u8();
						if (column == 255) {
							break;
						}

						let types = v.types[column] = readTypes(r);
						v.values[column] = readValues(r, types);
					}
					break;
				}
				case 4:
					v.table = <DBTableID> r.leVarInt();
					break;
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}
		return v;
	}
}

@Typed
export class DBTable extends PerFileLoadable {
	constructor(public id: DBTableID) {
		super();
	}

	public static readonly index = 2;
	public static readonly archive = 39;

	public types: (ScriptVarID | undefined)[][] = [];
	public defaultValues: (string | number | bigint | undefined)[][] = [];

	public static decode(r: Reader, id: DBTableID): DBTable {
		const v = new DBTable(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1: {
					let len = r.u8();
					v.defaultValues = new Array(len);
					v.types = new Array(len);

					for (;;) {
						let bits = r.u8();
						if (bits == 255) {
							break;
						}
						let column = bits & 0x7F;
						let types = v.types[column] = readTypes(r);
						if (bits & 0x80) {
							v.defaultValues[column] = readValues(r, types);
						}
					}
					break;
				}
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}
		return v;
	}
}
