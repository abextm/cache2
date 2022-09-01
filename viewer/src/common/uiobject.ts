import { NewType, Typed } from "cache2";
import * as _ from "lodash";

// we use a bunch of tagged arrays as our intermediate format as they all get
// posted via structured clone which seems to be faster with arrays since it doesn't
// have to copy object keys

export type UIPrimitive = string | number | boolean | undefined | bigint | null | Blob;
export type UIAny = UIPrimitive | UITyped | UIList | UIPartialList | UIToStringed | UIError | UIDefaultValue;
export type UITyped = [UIType.Typed, UITypeRef, UIPrimitive];
export type UITypeRef = [string];
export type UIDefaultValue = [UIType.DefaultValue, UIAny];

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
export type UIListType = UIType.Object | UIType.Map | UIType.Array | UIType.Set | UIType.ArrayBuffer | `${string}Array`;
export type UIList<T extends UIListType = UIListType> = [T, UIAny[] | TypedArray];
export type UIPartialList<T extends UIListType = UIListType> = [T, UIAny[] | TypedArray, number, PartialListID];
export type PartialListID = NewType<number>;

export type UIToStringed = [UIType.ToStringed, string, string];
export type UIError = [UIType.Error, string, string?, string?];

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
	entries: any[] | [any, any][] | TypedArray;
	isKV: boolean;
}

export function serialize(v: any): [UIData, Transferable[]] {
	let seen: Map<any, [UIAny, number]> = new Map();
	let types: Map<string, UITypeRef> = new Map();
	let partials: { v: any; rType: Typed.Any | undefined; }[] = [];

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

		v = wrapDefault(v, rType && "default" in rType && rType.default === v0);

		return v;
	}

	function wrapDefault(v: UIAny, isDefault: boolean | undefined): UIAny {
		if (isDefault) {
			v = [UIType.DefaultValue, v];
		}
		return v;
	}

	class Context {
		transferables: Transferable[] = [];

		serStringed(v: any): [UIToStringed, number] {
			let str = "" + v;
			let proto = v.constructor?.name ?? typeof v;
			return [[UIType.ToStringed, proto, str], proto.length + str.length];
		}

		serAny(v: any, limit: number, rType: Typed.Any | undefined): [UIAny, number] {
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
					if (v === null || v instanceof Blob) {
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

			let existing = seen.get(v);
			if (existing) {
				return existing;
			}

			let entries = this.toEntries(v);
			let isPartial = false;

			if (ArrayBuffer.isView(entries.entries)) {
				let lim = limit >= 0 ? limit : COLUMNS * ROOT_ROWS;
				let end = Math.max(8, lim / 4);
				let uiEntries: TypedArray;
				if (end >= entries.entries.length) {
					uiEntries = entries.entries;
				} else {
					uiEntries = entries.entries.slice(0, end);
					this.transferables.push(uiEntries);
					if (end != entries.entries.length) {
						isPartial = true;
					}
				}
				existing = [[entries.type, uiEntries], uiEntries.length + 2];
				seen.set(v, existing);
			} else {
				let uiEntries: UIAny[] = [];
				existing = [[entries.type, uiEntries], 8];
				seen.set(v, existing);

				let perLimit = limit == -1 ? COLUMNS : limit / Math.min(entries.entries.length + 1, 6);
				let size = 2;

				let nonDefault = 0;
				for (let { s, isDefault } of ctx.serEntries(entries, perLimit, uiEntries, rType)) {
					if (isDefault) {
						continue;
					}

					nonDefault++;
					size += s;

					if (limit == -1) {
						if (nonDefault > ROOT_ROWS) {
							isPartial = true;
							break;
						}
					} else {
						if (size > limit && nonDefault > 3) {
							isPartial = true;
							break;
						}
					}
				}
			}

			if (isPartial) {
				let id = partials.length as PartialListID;
				partials.push({ v, rType });
				// @ts-ignore  turn the UIList into UIPartialList in place, as it might already have been referenced somewhere else
				existing[0].push(entries.entries.length, id);
			}

			existing[0] = wrapDefault(existing[0], rType && "default" in rType && _.isEqual(v, rType.default));

			return existing;
		}

		*serEntries(
			{ entries, isKV }: Entries,
			perLimit: number,
			uiEntries: UIAny[],
			rType: Typed.Any | undefined,
			start = 0,
			end?: number,
		): Generator<{ s: number; isDefault: boolean; }, void, void> {
			end ??= entries.length;

			let objType = rType?.type === "obj" ? rType : undefined;
			let listType = rType?.type === "list" ? rType : undefined;
			let tupType = rType?.type === "tuple" ? rType : undefined;

			for (let i = start; i < end; i++) {
				let entry = entries[i];
				if (isKV) {
					let [kv, ks] = this.serAny(entry[0], perLimit, undefined);
					let [vv, vs] = this.serAny(entry[1], perLimit, objType?.entries[entry[0]] || objType?.defaultEntry);
					uiEntries.push(kv, vv);
					yield {
						s: ks + vs,
						isDefault: Array.isArray(vv) && vv[0] === UIType.DefaultValue,
					};
				} else {
					let [v, s] = this.serAny(entry, perLimit, listType?.entries || tupType?.entries?.[i]);
					uiEntries.push(v);
					yield { s, isDefault: false };
				}
			}
		}

		toEntries(v: any): Entries {
			if (Array.isArray(v)) {
				return {
					type: UIType.Array,
					entries: v,
					isKV: false,
				};
			} else if (v instanceof Set) {
				return {
					type: UIType.Set,
					entries: [...v.values()],
					isKV: false,
				};
			} else if (v instanceof ArrayBuffer || v instanceof DataView) {
				return {
					type: UIType.ArrayBuffer,
					entries: v instanceof DataView
						? new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
						: new Uint8Array(v),
					isKV: false,
				};
			} else if (ArrayBuffer.isView(v) && TypedArrays.some(c => v instanceof c)) {
				return {
					type: v.constructor.name as any,
					entries: v as TypedArray,
					isKV: false,
				};
			} else if (v instanceof Map) {
				return {
					type: UIType.Map,
					entries: [...v.entries()],
					isKV: true,
				};
			} else {
				return {
					type: UIType.Object,
					entries: Object.entries(v),
					isKV: true,
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
			let entries = ctx.toEntries(part.v);
			let uiEntries: UIAny[] | TypedArray;
			if (ArrayBuffer.isView(entries.entries)) {
				uiEntries = entries.entries.slice(ev.data.start, ev.data.end);
				ctx.transferables.push(uiEntries);
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
