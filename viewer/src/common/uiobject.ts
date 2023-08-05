import {
	CacheProvider,
	DBRow,
	DBTable,
	Enum,
	EnumValueMap,
	NewType,
	Param,
	ParamID,
	Params,
	Reader,
	ScriptVarType,
	Typed,
} from "cache2";
import * as _ from "lodash";
import { isEqual } from "lodash";
import { AbstractTable } from "./Table";

// we use a bunch of tagged arrays as our intermediate format as they all get
// posted via structured clone which seems to be faster with arrays since it doesn't
// have to copy object keys

export type UIPrimitive = string | number | boolean | undefined | bigint | null | Blob | ImageData;
export type UIAny = UIPrimitive | UITyped | UIList | UIPartialList | UIToStringed | UIError;
export type UITyped = [tag: UIType.Typed, type: UITypeRef, val: UIPrimitive];
export type UITypeRef = [string];

export enum UIType {
	Object = 1,
	Map = 2,
	Array = 3,
	Set = 4,
	Typed = 5,
	ToStringed = 6,
	Error = 7,
	ArrayBuffer = 8,
	DefaultValue = 9,
	Instance = 10,
	Table = 11,
}

const TypedArrays = [
	Uint8Array,
	Int8Array,
	Uint8ClampedArray,
	Uint16Array,
	Int16Array,
	Uint32Array,
	Int32Array,
	BigUint64Array,
	BigInt64Array,
	Float32Array,
	Float64Array,
] as const;
export type TypedArray = InstanceType<typeof TypedArrays[number]>;
export type UIListType =
	| UIType.Table
	| UIType.Object
	| UIType.Map
	| UIType.Array
	| UIType.Set
	| UIType.ArrayBuffer
	| `${string}Array`;
export type UIList<T extends UIListType = UIListType> = [tag: T, values: UIAny[] | TypedArray];
export type UIPartialList<T extends UIListType = UIListType> = UIList<T> & {
	tlen: number;
	id: PartialListID;
	isCycle?: true;
};
export type PartialListID = NewType<number, "PartialListID">;
export type UITable = UIList<UIType.Table> & {
	header: [value: UIAny, columns: number][][];
	undAsBlank?: boolean;
};

export type UIToStringed = [tag: UIType.ToStringed, typeName: string, str: string];
export type UIError = [tag: UIType.Error, name: string, message?: string, stack?: string];

export interface UIData {
	value: UIAny;
	port: MessagePort | undefined;
}

export interface UIPartialRequest {
	partial: PartialListID;
	start: number;
	end: number;
}

export interface UIPartialResponse {
	partial: PartialListID;
	start: number;
	end: number;
	entries: UIAny[] | TypedArray;
}

interface Entries {
	type: UIListType;
	entries: any[] | [any, any][] | TypedArray | { at(index: number): any; length: number; };
	isKV: boolean;
	v: object;
	forceFull?: true;
}

type TypeOverride = (k: any, v: any, obj: any) => [Typed.Any | undefined, Typed.Any | undefined] | undefined;
const paramTypeOverride: TypeOverride = (k: keyof Param, v, obj: Param) => {
	if (k === "defaultInt" || k === "defaultString") {
		return [undefined, ScriptVarType.forChar(obj.type)?.asTyped()];
	}
};
const enumValueMapOverride: TypeOverride = (k, v, obj: EnumValueMap) => {
	return [
		ScriptVarType.forChar(obj.parent.keyTypeChar)?.asTyped(),
		ScriptVarType.forChar(obj.parent.valueTypeChar)?.asTyped(),
	];
};
const enumOverride: TypeOverride = (k: keyof Enum, v, obj: Enum) => {
	if (k === "defaultValue") {
		return [undefined, ScriptVarType.forChar(obj.valueTypeChar)?.asTyped()];
	}
};
const dbRowOverride: TypeOverride = (k: keyof DBRow | keyof DBTable, _v, obj: DBRow) => {
	if (k === "values" || k === "defaultValues") {
		return [undefined, {
			type: "tuple",
			entries: obj.types.map((t, column) => (t && {
				type: "tuple",
				entries: t.map((type, index) => {
					if (type) {
						let typed = ScriptVarType.forID(type)?.asTyped();
						if (typed) {
							return typed;
						}
					}
					return undefined;
				}),
			})),
		}];
	}
};

const PARAMID_TYPE: Typed.Named = {
	type: "named",
	name: "ParamID",
	default: -1,
};

const PARAM_TYPES_EMPTY: Promise<Map<ParamID, Typed.Named>> = Promise.resolve(new Map());
let paramTypesPromise = PARAM_TYPES_EMPTY;

async function loadParams(cache: Promise<CacheProvider>): Promise<Map<ParamID, Typed.Named>> {
	let out = new Map<ParamID, Typed.Named>();
	for (let param of await Param.all(cache)) {
		let type = ScriptVarType.forChar(param.type)?.asTyped();
		if (type) {
			out.set(param.id, type);
		}
	}
	return out;
}

export async function serialize(
	v: any,
	hideDefaults: boolean,
	cache: Promise<CacheProvider>,
): Promise<[UIData, Transferable[]]> {
	let references = new Map<any, UIPartialList | null>();
	let types: Map<string, UITypeRef> = new Map();
	let partials: { v: any; rType: Typed.Any | undefined; }[] = [];

	{
		let seen = new Set<any>();
		let hasParams = false;
		function see(v: any) {
			if (typeof v !== "object" || !v) {
				return;
			}
			if (seen.has(v)) {
				references.set(v, null);
				return;
			}

			seen.add(v);

			if (!Array.isArray(v)) {
				if (v instanceof Params && v.size > 0) {
					hasParams = true;
				}
				if (!(v instanceof Map || v instanceof Set)) {
					v = Object.values(v);
				}
			}
			for (let va of v) {
				see(va);
			}
		}
		see(v);

		if (hasParams && paramTypesPromise === PARAM_TYPES_EMPTY) {
			paramTypesPromise = loadParams(cache);
		}
	}

	let paramTypes = await paramTypesPromise;

	const ROOT_ROWS = 50;
	const COLUMNS = 200;

	function wrapType(rType: Typed.Any | undefined, v0: UIPrimitive): UIAny {
		let v: UIAny = v0;
		if (rType && rType.type === "named" && rType.name) {
			let typ = types.get(rType.name);
			if (!typ) {
				types.set(rType.name, typ = [rType.name]);
			}

			v = [UIType.Typed, typ, v];
		}

		return v;
	}

	class Context {
		transferables: Transferable[] = [];

		serStringed(v: any): [UIToStringed, number] {
			let str = typeof v === "symbol" ? v.toString() : "" + v;
			let proto = v.constructor?.name ?? typeof v;
			return [[UIType.ToStringed, proto, str], proto.length + str.length];
		}

		serAny(v: any, limit: number, rType: Typed.Any | undefined, forceFull?: boolean | undefined): [UIAny, number] {
			switch (typeof v) {
				case "string":
					return [wrapType(rType, v), v.length];
				case "number":
				case "boolean":
				case "undefined":
				case "bigint":
					return [wrapType(rType, v), 1];
				case "function":
				case "symbol":
					return this.serStringed(v);
				case "object":
					if (v === null || v instanceof Blob || v instanceof ImageData) {
						return [wrapType(rType, v), 4];
					}
			}

			if (Typed.type in v) {
				rType = v[Typed.type];
				if (Typed.wrapped in v) {
					return this.serAny(v.v, limit, rType);
				}
			}

			if (v instanceof String || v instanceof Number || v instanceof Boolean) {
				return this.serAny(v.valueOf(), limit, rType);
			}
			if (v instanceof Promise || v instanceof RegExp) {
				return this.serStringed(v);
			}
			if (v instanceof Error || v instanceof DOMException) {
				return [[
					UIType.Error,
					v.name,
					v.message,
					v.stack,
				], (v.name || "").length + (v.message || "").length];
			}

			let ref = references.get(v);
			if (Array.isArray(ref)) {
				return [ref, 8];
			}

			let isPartial = false;
			let uiEntries: TypedArray | UIAny[] = [];
			let size = 2;
			let entries = this.toEntries(v, rType);

			if (ref === null) {
				isPartial = true;
				size = 8;
				ref = [entries.type, []] as any;
				ref!.tlen = entries.entries.length;
				ref!.isCycle = true;
				references.set(v, ref!);
			}

			if (ArrayBuffer.isView(entries.entries) && !rType) {
				let lim = limit >= 0 ? limit : COLUMNS * ROOT_ROWS;
				let end = Math.max(8, lim / 4);
				if (end >= entries.entries.length) {
					uiEntries = entries.entries;
				} else {
					uiEntries = entries.entries.slice(0, end);
					this.transferables.push(uiEntries.buffer);
					if (end != entries.entries.length) {
						isPartial = true;
					}
				}
				size += uiEntries.length;
			} else {
				let perLimit = limit == -1 ? COLUMNS : limit / Math.min(entries.entries.length + 1, 6);

				for (let s of ctx.serEntries(entries, perLimit, uiEntries, rType)) {
					size += s;

					if (!forceFull) {
						if (limit == -1) {
							if (uiEntries.length > ROOT_ROWS) {
								isPartial = true;
								break;
							}
						} else {
							if (size > limit && uiEntries.length > 3) {
								if (uiEntries.length !== (entries.entries.length * (entries.isKV ? 2 : 1))) {
									isPartial = true;
								}
								break;
							}
						}
					}
				}
			}

			let list: UIList = [entries.type, uiEntries];
			if (v instanceof AbstractTable) {
				let tab = list as UITable;
				tab.header = v.getHeader().map(row =>
					row.map(col => {
						if (!Array.isArray(col)) {
							col = [col, 1];
						}
						return [this.serAny(col[0], Infinity, undefined)[0], col[1]];
					})
				);
				if (v.undefinedAsBlank) {
					tab.undAsBlank = true;
				}
			}

			if (isPartial) {
				let id = partials.length as PartialListID;
				partials.push({ v, rType });
				let partialList = list as UIPartialList;
				partialList.tlen = entries.entries.length;
				partialList.id = id;
				if (ref) {
					ref.id = id;
					partialList.isCycle = true;
				}
				return [partialList, size];
			}

			return [list, size];
		}

		*serEntries(
			{ entries, isKV, v, forceFull }: Entries,
			perLimit: number,
			uiEntries: UIAny[],
			rType: Typed.Any | undefined,
			start = 0,
			end?: number,
		): Generator<number, void, void> {
			end ??= entries.length;

			let objType = rType?.type === "obj" ? rType : undefined;
			let listType = rType?.type === "list" ? rType : undefined;
			let tupType = rType?.type === "tuple" ? rType : undefined;
			let mapType = rType?.type === "map" ? rType : undefined;
			let typeOverride: TypeOverride | undefined;
			if (v instanceof Params) {
				typeOverride = k => [PARAMID_TYPE, paramTypes.get(k)];
			} else if (v instanceof Param) {
				typeOverride = paramTypeOverride;
			} else if (v instanceof EnumValueMap) {
				typeOverride = enumValueMapOverride;
			} else if (v instanceof Enum) {
				typeOverride = enumOverride;
			} else if (v instanceof DBRow || v instanceof DBTable) {
				typeOverride = dbRowOverride;
			}

			for (let i = start; i < end; i++) {
				let entry = entries.at(i);
				if (isKV) {
					let [ktOver, vtOver] = typeOverride?.(entry[0], entry[1], v) ?? [undefined, undefined];
					let [kv, ks] = this.serAny(entry[0], perLimit, ktOver ?? mapType?.key);
					let [vv, vs] = this.serAny(
						entry[1],
						perLimit,
						vtOver
							?? objType?.entries[entry[0]]
							?? objType?.defaultEntry
							?? mapType?.value,
					);
					uiEntries.push(kv, vv);
					yield ks + vs;
				} else {
					let [v, s] = this.serAny(entry, perLimit, listType?.entries || tupType?.entries?.[i], forceFull);
					uiEntries.push(v);
					yield s;
				}
			}
		}

		toEntries(v: any, rType: Typed.Any): Entries {
			if (Array.isArray(v)) {
				return {
					type: UIType.Array,
					entries: v,
					isKV: false,
					v,
				};
			} else if (v instanceof Set) {
				return {
					type: UIType.Set,
					entries: [...v.values()],
					isKV: false,
					v,
				};
			} else if (v instanceof ArrayBuffer || v instanceof DataView) {
				return {
					type: UIType.ArrayBuffer,
					entries: v instanceof DataView
						? Reader.makeViewOf(Uint8Array, v)
						: new Uint8Array(v),
					isKV: false,
					v,
				};
			} else if (ArrayBuffer.isView(v) && TypedArrays.some(c => v instanceof c)) {
				return {
					type: v.constructor.name as any,
					entries: v as TypedArray,
					isKV: false,
					v,
				};
			} else if (v instanceof Map) {
				return {
					type: UIType.Map,
					entries: [...v.entries()],
					isKV: true,
					v,
				};
			} else if (v instanceof AbstractTable) {
				return {
					type: UIType.Table,
					entries: {
						length: v.getNumRows(),
						at(i) {
							return v.getRow(i);
						},
					},
					isKV: false,
					v,
					forceFull: true,
				};
			} else {
				let entries = Object.entries(v);
				if (hideDefaults && rType && rType.type === "obj") {
					entries = entries.filter(([k, v]) => {
						let ty = rType.entries[k] ?? rType.defaultEntry;
						return !(ty && "default" in ty && isEqual(ty.default, v));
					});
				}
				return {
					type: UIType.Object,
					entries,
					isKV: true,
					v,
				};
			}
		}
	}

	let ctx = new Context();
	let value = ctx.serAny(v, -1, undefined)[0];

	let port: MessagePort | undefined;
	if (partials.length > 0) {
		let chan = new MessageChannel();
		port = chan.port1;
		ctx.transferables.push(port);
		let p2 = chan.port2;
		p2.onmessage = (ev: MessageEvent<UIPartialRequest>) => {
			let ctx = new Context();
			let part = partials[ev.data.partial];
			let entries = ctx.toEntries(part.v, part.rType);
			let uiEntries: UIAny[] | TypedArray;
			if (ArrayBuffer.isView(entries.entries) && !part.rType) {
				uiEntries = entries.entries.slice(ev.data.start, ev.data.end);
				ctx.transferables.push(uiEntries.buffer);
			} else {
				for (let _s of ctx.serEntries(entries, COLUMNS, uiEntries = [], part.rType, ev.data.start, ev.data.end));
			}
			let res: UIPartialResponse = {
				...ev.data,
				entries: uiEntries,
			};
			p2.postMessage(res, ctx.transferables);
		};
	}

	return [{
		value,
		port,
	}, ctx.transferables];
}
