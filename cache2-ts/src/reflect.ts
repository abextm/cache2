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
			if (typeof type === "function") {
				let value: Any | undefined;
				Object.defineProperty(onto, Typed.type, {
					enumerable: false,
					get: () => value ??= type(),
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

	// injected decorator or value wrapper for c2.Typed(value) calls
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
