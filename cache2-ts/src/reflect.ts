export function Typed<T>(v: T, _ctx?: any): T | Typed.Value<T> {
	return v;
}

export namespace Typed {
	export const type: unique symbol = Symbol("type");
	export const wrapped: unique symbol = Symbol("wrapped");

	export type Object = {
		type: "obj";
		entries: { [name: string | symbol]: Typed.Any; };
		defaultEntry: Typed.Any;
		default?: any;
	};
	export type List = {
		type: "list";
		entries: Any;
		default?: any[];
	};
	export type Tuple = {
		type: "tuple";
		entries: Any[];
		default?: any[];
	};
	export type Named = {
		type: "named";
		name?: string;
		default?: any;
	};
	export type Map = {
		type: "map";
		key?: Any;
		value?: Any;
		default?: any;
	};
	export type Any = Typed.Object | Typed.List | Typed.Tuple | Typed.Named | Typed.Map | undefined;

	export type Value<T> = {
		[Typed.type]: Typed.Any;
	} & T extends object ? T : {
		[Typed.wrapped]: true;
		v: T;
	};

	function mergeType(a: Any, b: Any): Any {
		if (!a || !b) {
			return a ?? b;
		}
		if (a.type !== b.type) {
			return b;
		}
		if (a.type === "obj" && b.type == "obj") {
			let entries: Typed.Object["entries"] = {
				...a.entries,
			};
			for (let [k, v] of Object.entries(b.entries)) {
				if (k in entries) {
					entries[k] = mergeType(entries[k], v);
				} else {
					entries[k] = v;
				}
			}
			return {
				type: a.type,
				entries,
				defaultEntry: mergeType(a.defaultEntry, b.defaultEntry),
				default: b.default ?? a.default,
			};
		}
		return {
			...a,
			...b,
		};
	}

	export function withType<T>(type: Any | (() => Any) | undefined, v: T): T | Typed.Value<T> {
		if (!type) {
			return v;
		}
		let onto: any;
		if (typeof v === "function") {
			onto = v.prototype;
		} else if (typeof v === "object" && v) {
			onto = v;
		} else {
			onto = v = {
				[Typed.wrapped]: true,
				v,
			} as any;
		}
		if (!Object.hasOwn(onto, Typed.type)) {
			if (typeof type === "function" || Typed.type in onto) {
				let typefn = typeof type === "function" ? type : () => type;
				let value: Any | undefined;
				Object.defineProperty(onto, Typed.type, {
					enumerable: false,
					get() {
						if (value) {
							return value;
						}
						let superType = Object.getPrototypeOf(this)?.[Typed.type];
						value = typefn();
						if (superType) {
							value = mergeType(superType, value);
						}
						return value;
					},
				});
			} else {
				Object.defineProperty(onto, Typed.type, {
					enumerable: false,
					value: type,
				});
			}
		}
		return v;
	}

	export function getType(v: any): Any | undefined {
		return v[type];
	}

	// injected value wrapper for c2.Typed(value) calls
	/** @internal */
	export function d(type: Any): <T>(v: T, _ctx?: any) => T | Typed.Value<T> {
		return (v: any) => withType(type, v);
	}

	// injected value wrapper for typedCall
	/** @internal */
	export function v(type: Any, value: any): any {
		return withType(type, value);
	}

	// injected value wrapper for typedCall with a spread argument
	/** @internal */
	export function s(type: Any, value: any[]): any[] {
		if (type?.type === "list") {
			return value.map(v => withType(type.entries, v));
		} else if (type?.type === "tuple") {
			return value.map((v, i) => withType(type.entries[i], v));
		} else {
			return value;
		}
	}
}
