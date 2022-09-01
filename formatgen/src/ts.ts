import * as fs from "fs";
import * as data from "./data";
import { ArrayType, PType, Type } from "./def";
import { SourceWriter } from "./writer";

const root = process.argv[2];
fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(root, { recursive: true });

class TSWriter extends SourceWriter {
	constructor(name: string) {
		super(name + ".ts");
	}

	block(contents: () => void): this {
		this.ws();
		this.write("{\n").indent();
		contents();
		this.outdent().maybeLF().write("}\n");
		return this;
	}

	semi(): this {
		this.write(";\n");
		return this;
	}

	value(value: any): this {
		if (value instanceof Map) {
			if (value.size != 0) {
				throw new Error();
			}
			return this.write(`new Map()`);
		}
		return this.write(JSON.stringify(value, undefined, "\t"));
	}
}
const tsType = (t: Type): string => {
	if (typeof t === "object") {
		if (t.inner !== undefined) {
			let ar = <ArrayType> t;
			let i = tsType(ar.inner);
			if (i.indexOf(" ") != -1) {
				i = `(${i})`;
			}
			return i + "[]";
		}
		throw new Error();
	} else {
		switch (t) {
			case PType.Params:
				return "Map<number, string|number>";
			case PType.Int:
				return "number";
			case PType.Boolean:
				return "boolean";
			case PType.String:
				return "string | null";
			default:
				return `types.${t}`;
		}
	}
};

const defaultForType = (t: Type): any => {
	if (typeof t === "string") {
		switch (t) {
			case PType.ModelID:
			case PType.ItemID:
			case PType.TextureID:
			case PType.FontID:
			case PType.CategoryID:
			case PType.HitsplatID:
			case PType.SpriteID:
			case PType.VarbitID:
			case PType.VarPID:
				return -1;
			case PType.Int:
			case PType.HSL:
			case PType.RGB:
				return 0;
			case PType.Boolean:
				return false;
			case PType.String:
				return null;
			case PType.Params:
				return new Map();
			default: {
				let _exhaustive: never = t;
				throw new Error();
			}
		}
	}
	return [];
};

let idx = new TSWriter("index");

for (let key in data.configs) {
	const config = data.configs[key];
	let w = new TSWriter(config.name);
	w.write(`import * as types from "../types";`).lf();
	w.write(`import { Config } from "../Config";`).lf();
	w.write(`import * as def from "../def";`).lf();
	w.write(`import { Typed } from "../reflect";`).lf();
	w.write(`@Typed export class ${config.name} extends Config`).block(() => {
		w.write(`constructor (public id: types.${config.name}ID)`)
			.block(() => w.write(`super()`).semi()).lf();
		for (let fieldName in config.fields) {
			let field = config.fields[fieldName];

			w.write(`public ${field.name}: `);
			w.write(tsType(field.type))
				.write(` = `);
			let def = field.default;
			if (def === undefined) {
				def = defaultForType(field.type);
			}
			w.write(`<${tsType(field.type)}>`).value(def).semi();
		}
		w.lf();
		w.write(`public static readonly config: def.Config = <any>`).value(config).semi();
	});
	w.close();
	idx.write(`export * from "./${config.name}"`).semi();
}

idx.close();
