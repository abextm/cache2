import { CacheProvider } from "./Cache";
import * as def from "./def";
import { Loadable } from "./Loadable";
import { Reader } from "./Reader";

export abstract class Config extends Loadable {
	public static readonly config: def.Config;

	public static decode<
		I extends Config,
		ID extends number,
	>(
		this: {
			new(id: ID): I;
			config: def.Config;
		},
		reader: Reader,
		id: ID,
	): I {
		const v = new this(id);
		for (let opcode: number; (opcode = reader.u8()) != 0;) {
			v.readOpcode(opcode, reader);
		}
		return v;
	}

	public static async loadData<
		I extends Config,
		ID extends number,
	>(
		this: {
			new(id: ID): I;
			config: def.Config;
		},
		cache: CacheProvider,
		id: ID,
	): Promise<Uint8Array | undefined> {
		let ad = await cache.getArchive(2, this.config.archiveID);
		return ad?.getFile(id)?.data;
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
		return [...ar.getFiles().values()]
			.map(v => Config.decode<I, ID>.call(this, new Reader(v.data), v.id as ID));
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
