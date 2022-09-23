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

export type AnimationID = NewType<number>;
export type CategoryID = NewType<number>;
export type FontID = NewType<number>;
export type HitsplatID = NewType<number>;
export type ItemID = NewType<number>;
export type ModelID = NewType<number>;
export type NPCID = NewType<number>;
export type SpriteID = NewType<number>;
export type TextureID = NewType<number>;
export type VarbitID = NewType<number>;
export type VarPID = NewType<number>;

export type HSL = AliasType<number>;
export type RGB = AliasType<number>;
