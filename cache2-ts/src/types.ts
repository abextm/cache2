export type NewType<T> = T & {
	// @internal
	readonly __tag: unique symbol;
};
export type AliasType<T> = T | NewType<T>;

export enum CompressionType {
	NONE = 0,
	BZ2 = 1,
	GZIP = 2,
}

export type XTEAKey = [number, number, number, number];

export type ItemID = NewType<number>;
export type TextureID = NewType<number>;
export type ModelID = NewType<number>;
export type CategoryID = NewType<number>;
export type FontID = NewType<number>;
export type SpriteID = NewType<number>;
export type VarbitID = NewType<number>;
export type VarPID = NewType<number>;
export type HitsplatID = NewType<number>;

export type HSL = AliasType<number>;
export type RGB = AliasType<number>;
