export type NewType<T> = T & {
	// @internal
	readonly __tag: unique symbol;
};
export type AliasType<T> = T | NewType<T>;

type TypedArray =
	| Uint8Array
	| Int8Array
	| Uint8ClampedArray
	| Uint16Array
	| Int16Array
	| Uint32Array
	| Int32Array
	| BigUint64Array
	| BigInt64Array
	| Float32Array
	| Float64Array;
export type PrimitiveArray<T extends A[0], A extends TypedArray> = A & {
	[index: number]: T;
};

export enum CompressionType {
	NONE = 0,
	BZ2 = 1,
	GZIP = 2,
}

export type XTEAKey = [number, number, number, number];

export type WearPos = NewType<number>;

export type ScriptVarChar = NewType<number>;
export type ScriptVarID = NewType<number>;

export type AnimationID = NewType<number>;
export type CategoryID = NewType<number>;
export type EnumID = NewType<number>;
export type FontID = NewType<number>;
export type HitsplatID = NewType<number>;
export type ItemID = NewType<number>;
export type ModelID = NewType<number>;
export type NPCID = NewType<number>;
export type ParamID = NewType<number>;
export type SpriteID = NewType<number>;
export type StructID = NewType<number>;
export type TextureID = NewType<number>;
export type VarbitID = NewType<number>;
export type VarPID = NewType<number>;

export type HSL = AliasType<number>;
export type RGB = AliasType<number>;

export class Params extends Map<ParamID, string | number> {
}

export namespace WearPos {
	export const HEAD = 0;
	export const CAPE = 1;
	export const AMULET = 2;
	export const WEAPON = 3;
	export const TORSO = 4;
	export const SHIELD = 5;
	export const ARMS = 6;
	export const LEGS = 7;
	export const HAIR = 8;
	export const HANDS = 9;
	export const BOOTS = 10;
	export const JAW = 11;
	export const RING = 12;
	export const AMMO = 13;

	export const byID: string[] = (() => {
		let out: string[] = [];
		for (let [k, v] of Object.entries(WearPos)) {
			if (typeof v === "number") {
				out[v] = k;
			}
		}
		return out;
	})();
}
