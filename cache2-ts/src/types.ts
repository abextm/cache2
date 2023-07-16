const NewTypeType: unique symbol = undefined!;
export type NewType<T, Name extends string> =
	& T
	& {
		readonly [
			// @internal
			Tag in `~tag ${Name}`
		]: typeof NewTypeType;
	};
export type AliasType<T, Name extends string> = T | NewType<T, Name>;

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

export type WearPos = NewType<number, "WearPos">;

export type ScriptVarChar = NewType<number, "ScriptVarChar">;
export type ScriptVarID = NewType<number, "ScriptVarID">;

export type AnimationID = NewType<number, "AnimationID">;
export type CategoryID = NewType<number, "CategoryID">;
export type DBRowID = NewType<number, "DBRowID">;
export type DBTableID = NewType<number, "DBTableID">;
export type DBColumnID = NewType<number, "DBColumnID">;
export type EnumID = NewType<number, "EnumID">;
export type FontID = NewType<number, "FontID">;
export type HitsplatID = NewType<number, "HitsplatID">;
export type ItemID = NewType<number, "ItemID">;
export type ModelID = NewType<number, "ModelID">;
export type NPCID = NewType<number, "NPCID">;
export type ParamID = NewType<number, "ParamID">;
export type SpriteID = NewType<number, "SpriteID">;
export type StructID = NewType<number, "StructID">;
export type TextureID = NewType<number, "TextureID">;
export type VarbitID = NewType<number, "VarbitID">;
export type VarPID = NewType<number, "VarPID">;

export type HSL = AliasType<number, "HSL">;
export type RGB = AliasType<number, "RGB">;

export type WorldPoint = AliasType<number, "WorldPoint">;

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

export namespace DBColumnID {
	export function pack(table: DBTableID, column: number, tupleIndex: number = 0): DBColumnID {
		return ((table << 12) | ((column & 0xFF) << 4) | (tupleIndex & 0xF)) as DBColumnID;
	}
	export function unpack(c: DBColumnID): [table: DBTableID, column: number, tupleIndex: number] {
		return [c >>> 12 as DBTableID, c >>> 4 & 0xFF, c & 0xF];
	}
}
