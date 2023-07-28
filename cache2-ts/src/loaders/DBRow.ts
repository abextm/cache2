import { CacheProvider } from "../Cache";
import { Loadable, PerFileLoadable } from "../Loadable";
import { Reader } from "../Reader";
import { Typed } from "../reflect";
import { BaseVarType, ScriptVarType } from "../ScriptVarType";
import { DBColumnID, DBRowID, DBTableID, ScriptVarID } from "../types";

function readTypes(r: Reader): ScriptVarID[] {
	let size = r.u8();
	let types = new Array(size).fill(undefined);
	for (let i = 0; i < size; i++) {
		types[i] = r.u8o16();
	}
	return types;
}

function readVarType(r: Reader, type: BaseVarType): string | number | bigint {
	switch (type) {
		case "int":
			return r.i32();
			break;
		case "string":
			return r.string();
			break;
		case "long":
			return r.i64();
			break;
		default:
			throw new Error(`unknown BaseVarType ${type}`);
	}
}

function readValues(r: Reader, types: ScriptVarID[]): (string | number | bigint)[] {
	let strides = r.u8o16();
	let values = new Array(types.length * strides).fill(undefined);
	for (let stride = 0; stride < strides; stride++) {
		for (let i = 0; i < types.length; i++) {
			let type = ScriptVarType.forID(types[i]);
			if (type === undefined) {
				throw new Error(`unknown type ${types[i]}`);
			}
			values[stride * types.length + i] = readVarType(r, type.baseType);
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
					v.values = new Array(len).fill(undefined);
					v.types = new Array(len).fill(undefined);

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
					v.defaultValues = new Array(len).fill(undefined);
					v.types = new Array(len).fill(undefined);

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

	public static async loadRowIDs(
		cache: CacheProvider | Promise<CacheProvider>,
		table: DBTableID | number,
	): Promise<DBRowID[] | undefined> {
		let idx = await DBTableIndex.load(cache, table, DBTableIndex.MASTER_COLUMN);
		let vs = idx?.values[0];
		if (!vs) {
			return undefined;
		}
		return vs.get(0) ?? [];
	}

	public static async loadRows(
		cache: CacheProvider | Promise<CacheProvider>,
		table: DBTableID | number,
	): Promise<DBRow[] | undefined> {
		let rows = await this.loadRowIDs(cache, table);
		if (!rows) {
			return undefined;
		}
		return await Promise.all(rows.map(id => DBRow.load(cache, id))) as DBRow[];
	}
}

@Typed
export class DBTableIndex extends Loadable {
	constructor(public id: DBTableID, public column: number) {
		super();
	}

	public static readonly index = 21;
	public static readonly MASTER_COLUMN = -1;

	public types: BaseVarType[] = [];
	public values: Map<string | number | bigint, DBRowID[]>[] = [];

	public static loadData(cache: CacheProvider, id: DBColumnID): Promise<Reader | undefined>;
	public static loadData(cache: CacheProvider, id: DBTableID, column: number): Promise<Reader | undefined>;
	public static async loadData(cache: CacheProvider, ...args: number[]): Promise<Reader | undefined> {
		if (args.length == 1) {
			args = DBColumnID.unpack(args[0] as DBColumnID);
		}

		let archive = await cache.getArchive(this.index, args[0]);
		let version = await cache.getVersion(this.index);
		let data = archive?.getFile(args[1] + 1)?.data;
		return data ? new Reader(data, version) : undefined;
	}

	public static decode(reader: Reader, id: DBColumnID): DBTableIndex;
	public static decode(reader: Reader, id: DBTableID, column: number): DBTableIndex;
	public static decode(r: Reader, ...args: number[]): DBTableIndex {
		if (args.length == 1) {
			args = DBColumnID.unpack(args[0] as DBColumnID);
		}

		const v = new DBTableIndex(args[0] as DBTableID, args[1]);

		let len = r.leVarInt();
		v.types = new Array(len).fill(undefined);
		v.values = new Array(len).fill(undefined);

		for (let tupleIndex = 0; tupleIndex < len; tupleIndex++) {
			let type = v.types[tupleIndex] = BaseVarType.forOrdinal(r.u8());
			let map = v.values[tupleIndex] = new Map();

			let numKeys = r.leVarInt();
			for (let i = 0; i < numKeys; i++) {
				let key = readVarType(r, type);
				let numRows = r.leVarInt();
				let rows = new Array(numRows).fill(undefined);
				map.set(key, rows);

				for (let i = 0; i < numRows; i++) {
					rows[i] = r.leVarInt();
				}
			}
		}

		return v;
	}
}
