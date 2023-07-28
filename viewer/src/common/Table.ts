import { Typed } from "cache2";

export namespace AbstractTable {
	export type ColumnHeader = [value: any | number, columns: number];
}

export abstract class AbstractTable {
	abstract getHeader(): AbstractTable.ColumnHeader[][];
	abstract getNumRows(): number;
	abstract getRow(i: number): any[];
	undefinedAsBlank?: boolean;
}

export class ObjectTable<const T extends object> extends AbstractTable {
	private header: (string | number)[] | undefined;
	private keys: string[] | undefined;
	private values: any[] = [];

	public constructor();
	public constructor(...keys: ((keyof T) & string)[]);
	public constructor(names: { [K in keyof T]: string | number; });
	public constructor(...args: [] | (keyof T)[] | [object]) {
		super();
		if (args.length == 0) {
			return;
		} else if (args.length === 1 && typeof args[0] === "object") {
			this.keys = Object.keys(args[0]);
			this.header = Object.values(args[0]);
		} else {
			this.header = this.keys = args as string[];
		}
	}

	private convertRow(v: T): any {
		if (this.keys) {
			return this.keys.map(k => {
				let e = v[k as keyof T];
				if (Typed.getType(v) && !Typed.getType(e)) {
					let typ = Typed.getType(v)!;
					if (typ.type === "obj") {
						return Typed.withType(typ.entries[k], e);
					}
				}
				return e;
			});
		} else {
			return v;
		}
	}

	/** @TypedCall */
	public push(...v: T[]): ObjectTable<T> {
		this.values.push(...v.map(r => this.convertRow(r)));
		return this;
	}

	private finish(): void {
		if (this.keys) {
			return;
		}

		let keymap = new Map<string, number>();
		for (let val of this.values) {
			for (let key of Object.keys(val)) {
				keymap.set(key, 1 + (keymap.get(key) ?? 0));
			}
		}
		let keylist = [...keymap.entries()];
		keylist.sort((a, b) => b[1] - a[1]);
		this.header = this.keys = keylist.map(v => v[0]);

		this.values = this.values.map(v => this.convertRow(v));
	}

	public override getHeader() {
		this.finish();
		return [this.header!.map(v => [v, 1] satisfies AbstractTable.ColumnHeader)];
	}

	public override getNumRows(): number {
		return this.values.length;
	}

	public override getRow(i: number) {
		this.finish();
		return this.values[i];
	}
}

type FixedLength<T, N extends number> = T[] & { length: N; };
export class Table<const N extends number> extends AbstractTable {
	private header: any[];
	private values: any[] = [];

	public constructor();
	/** @TypedCall */ public constructor(...header: FixedLength<string | number, N>);
	public constructor(...header: any[]) {
		super();
		this.header = header;
	}

	/** @TypedCall */
	public push<T extends FixedLength<any, N>>(...v: T): Table<N> {
		this.values.push(v);
		return this;
	}

	public override getHeader() {
		return [this.header!.map(v => [v, 1] satisfies AbstractTable.ColumnHeader)];
	}

	public override getNumRows(): number {
		return this.values.length;
	}

	public override getRow(i: number) {
		return this.values[i];
	}
}
