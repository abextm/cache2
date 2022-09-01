import { CacheProvider } from "./Cache";
import * as def from "./def";
import { Reader } from "./Reader";

function decode0<
	I extends Config,
	ID extends number,
>(
	typ: {
		new(id: ID): I;
		config: def.Config;
	},
	reader: Reader | ArrayBufferView | ArrayBuffer,
	id: ID | number,
): I {
	if (!(reader instanceof Reader)) {
		reader = new Reader(reader);
	}
	const v = new typ(id as ID);
	for (let opcode: number; (opcode = reader.u8()) != 0;) {
		v.readOpcode(opcode, reader);
	}
	return v;
}

export abstract class Config {
	public static readonly config: def.Config;

	protected constructor() {}

	public static decode<
		I extends Config,
		ID extends number,
	>(
		this: {
			new(id: ID): I;
			config: def.Config;
		},
		cache: CacheProvider | Promise<CacheProvider>,
		id: ID | number,
	): Promise<I | undefined>;
	public static decode<
		I extends Config,
		ID extends number,
	>(
		this: {
			new(id: ID): I;
			config: def.Config;
		},
		reader: Reader | ArrayBufferView | ArrayBuffer,
		id: ID | number,
	): I;
	public static decode<
		I extends Config,
		ID extends number,
	>(
		this: {
			new(id: ID): I;
			config: def.Config;
		},
		reader: Reader | ArrayBufferView | ArrayBuffer | CacheProvider | Promise<CacheProvider>,
		id: ID | number,
	): I | Promise<I | undefined> {
		if (reader instanceof Reader || reader instanceof ArrayBuffer || ArrayBuffer.isView(reader)) {
			return decode0(this, reader, id);
		} else {
			return (async () => {
				let v = await (await reader).getArchive(2, this.config.archiveID);
				let fi = v?.getFile(id);
				if (fi) {
					return decode0(this, fi.data, id);
				}
			})();
		}
	}

	public static async all<
		I extends Config,
		ID extends number,
	>(this: {
		new(id: ID): I;
		config: def.Config;
	}, cache: CacheProvider | Promise<CacheProvider>): Promise<I[]> {
		let ar = await (await cache).getArchive(2, this.config.archiveID);
		if (!ar) {
			return [];
		}
		return [...ar.getFiles().values()].map(v => decode0(this, v.data, v.id));
	}

	public getConfig(): def.Config {
		return <def.Config> (<any> this.constructor).config;
	}

	public readOpcode(opcode: number, reader: Reader) {
		let config = this.getConfig();
		let op = config.ops[opcode];
		if (!op) {
			throw new Error(`unknown config opcode ${opcode}`);
		}
		const coders = op.coder;
		for (const coder of coders) {
			readCoder(reader, coder, this, []);
		}
	}

	public isDefault(fields: string | (string | number)[]) {
		if (!Array.isArray(fields)) {
			fields = [fields];
		}

		let config = this.getConfig();

		let fieldName = fields.shift()!;

		let field = config.fields[fieldName];
		if (!field) {
			return false;
		}

		let def = <any> field.default;
		let object = (<any> this)[fieldName];
		for (let p of fields) {
			if ((def === undefined) != (object === undefined)) {
				return false;
			}
			if (def === undefined) {
				return true;
			}
			def = def[p];
			object = object[p];
		}

		return def === object;
	}
}

function write(object: any, path: (string | number)[], value: any) {
	let last = path.pop()!;
	for (let part of path) {
		object = object[part];
	}
	object[last] = value;
}

function readCoder(
	reader: Reader,
	coder: def.IntoCoder,
	object: any,
	path: (string | number)[],
) {
	let value = reader[coder.coder]();
	if ("into" in coder) {
		if (Array.isArray(coder.into)) {
			write(object, [...coder.into, ...path], value);
		} else {
			write(object, [coder.into, ...path], value);
		}
	} else if ("each" in coder || "new" in coder) {
		if (!Number.isInteger(value)) {
			throw new Error();
		}
		let len: number = <number> value;
		if ("new" in coder) {
			for (let n of coder.new) {
				write(object, [...path, n], new Array(len));
			}
		}
		if ("each" in coder) {
			for (let i = 0; i < len; i++) {
				for (let icoder of coder.each) {
					readCoder(reader, icoder, object, [...path, i]);
				}
			}
		}
	} else {
		throw new Error("invalid coder");
	}
}
