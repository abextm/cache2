export function Typed<T>(v: T): T | Typed.Value<T> {
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
	export type Any = Typed.Object | Typed.List | Typed.Tuple | Typed.Named | undefined;

	export type Value<T> = {
		[Typed.type]: Typed.Any;
	} & T extends object ? T : {
		[Typed.wrapped]: true;
		v: T;
	};

	export function _<T>(type: Any): (v: T) => T | Typed.Value<T> {
		return (v: any) => {
			let onto: any;
			if (typeof v === "function") {
				onto = v.prototype;
			} else if (typeof v === "object" && v) {
				onto = v;
			} else {
				onto = v = {
					[Typed.wrapped]: true,
					v,
				};
			}
			if (!onto[Typed.type]) {
				Object.defineProperty(onto, Typed.type, {
					enumerable: false,
					value: type,
				});
			}
			return v;
		};
	}
}
