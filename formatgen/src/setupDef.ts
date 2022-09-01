import { ArrayType, Coder, Config, EConfig, Field, IntoCoder, Op } from "./def";

type BConfig = EConfig<
	Omit<Field, "name"> & {
		name?: string;
		coder?: Omit<Op, "coder"> & { coder: Coder; };
	},
	Omit<Op, "op"> & {
		op?: number;
	}
>;

export function range<V>(count: number, generate: (i: number) => { [k: number]: V; }): { [k: number]: V; } {
	let out = {};
	for (let i = 0; i < count; i++) {
		Object.assign(out, generate(i));
	}
	return out;
}

export function buildConfig(c: BConfig): Config {
	for (let name in c.fields) {
		let f = c.fields[name];
		if (!f.name) {
			f.name = name;
		}
		if (f.coder) {
			let co = f.coder;
			(<any> co).coder = [{
				coder: co.coder,
				into: f.name,
			}];
			if (c.ops[co.op]) {
				throw new Error(`Duplicate op ${co.op} on field ${f.name}`);
			}
			c.ops[co.op] = <Op> <any> co;
			delete f.coder;
		}
	}
	for (let opcode in c.ops) {
		let o = c.ops[opcode];
		if (!o.op) {
			o.op = ~~opcode;
		}
		for (let iic of o.coder) {
			fixIntoCoder(<Config> c, iic, 0);
		}
	}
	return <Config> c;
}

function fixIntoCoder(c: Config, ic: IntoCoder, deindex: number) {
	if ("into" in ic) {
		if (ic.type === undefined) {
			let basename: string;
			let index: number | undefined;
			if (Array.isArray(ic.into)) {
				[basename, index] = ic.into;
			} else {
				basename = ic.into;
			}
			let f = c.fields[basename];
			if (!f) {
				throw new Error(`invalid into field ${ic.into}`);
			}
			let t = f.type;
			let ideindex = deindex;
			if (index !== undefined) {
				ideindex++;
			}
			for (let i = 0; i < ideindex; i++) {
				t = (<ArrayType> t).inner;
			}
			ic.type = t;
		}
	}
	if ("each" in ic) {
		for (let iic of ic.each) {
			fixIntoCoder(c, iic, deindex + 1);
		}
	}
}

function snake(s: string): string {
	return s.replace(/([A-Z]*)((?:[A-Z]|^)(?:[a-z]|$)+)/g, (_, a, b) => {
		if (a.length > 0) {
			a = "_" + a;
		}
		return a + "_" + b;
	}).substring(1);
}

export function CAPS_CASE(s: string): string {
	return snake(s).toUpperCase();
}
export function snake_case(s: string): string {
	return snake(s).toLowerCase();
}
