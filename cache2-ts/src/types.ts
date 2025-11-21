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
export type GameValID = NewType<number, "GameValID">;
export type HealthBarID = NewType<number, "HealthBaID">;
export type HitsplatID = NewType<number, "HitsplatID">;
export type ItemID = NewType<number, "ItemID">;
export type KitID = NewType<number, "KitID">;
export type MapElementID = NewType<number, "MapElementID">;
export type MapSceneIconID = NewType<number, "MapSceneIconID">;
export type MenuFilterMode = NewType<number, "MenuFilterMode">;
export type ModelID = NewType<number, "ModelID">;
export type NPCID = NewType<number, "NPCID">;
export type ObjID = NewType<number, "ObjID">;
export type ParamID = NewType<number, "ParamID">;
export type PoseID = NewType<number, "PoseID">;
export type SkeletonID = NewType<number, "SkeletonID">;
export type SoundEffectID = NewType<number, "SoundEffectID">;
export type SpriteID = NewType<number, "SpriteID">;
export type StructID = NewType<number, "StructID">;
export type TextureID = NewType<number, "TextureID">;
export type UnderlayID = NewType<number, "UnderlayID">;
export type VarbitID = NewType<number, "VarbitID">;
export type VarPID = NewType<number, "VarPID">;
export type WorldEntityID = NewType<number, "WorldEntityID">;

export type HSL = AliasType<number, "HSL">;
export type RGB = AliasType<number, "RGB">;

export type WorldPoint = NewType<number, "WorldPoint">;
export type ObjShape = NewType<number, "ObjType">;

export type PreAnimMoveMode = NewType<number, "PreAnimMoveMode">;
export type PostAnimMoveMode = NewType<number, "PostAnimMoveMode">;
export type AnimRestartMode = NewType<number, "AnimRestartMode">;
export type AmbientSoundCurve = NewType<number, "AmbientSoundCurve">;
export type AmbientSoundVisibility = NewType<number, "AmbientSoundVisibility">;
export type AnimMayaID = NewType<number, "AnimMayaID">;

export class Params extends Map<ParamID, string | number> {
}

export type KitOrItem = { kit: KitID; } | { item: ItemID; } | undefined;

function makeByID<T extends number>(): (this: object, id: T) => string | undefined {
	let byID: string[] | undefined;
	return function(id: T) {
		if (byID === undefined) {
			byID = [];
			for (let [k, v] of Object.entries(this)) {
				if (typeof v === "number") {
					byID[v] = k;
				}
			}
		}
		return byID[id];
	};
}

export namespace WearPos {
	export const Head = 0 as WearPos;
	export const Cape = 1 as WearPos;
	export const Amulet = 2 as WearPos;
	export const Weapon = 3 as WearPos;
	export const Torso = 4 as WearPos;
	export const Shield = 5 as WearPos;
	export const Arms = 6 as WearPos;
	export const Legs = 7 as WearPos;
	export const Hair = 8 as WearPos;
	export const Hands = 9 as WearPos;
	export const Boots = 10 as WearPos;
	export const Jaw = 11 as WearPos;
	export const Ring = 12 as WearPos;
	export const Ammo = 13 as WearPos;

	export const byID = makeByID<WearPos>();
}

export namespace ObjShape {
	export const WallStraight = 0 as ObjShape;
	export const WallDiagonalCorner = 1 as ObjShape;
	export const WallCorner = 2 as ObjShape;
	export const WallSquareCorner = 3 as ObjShape;
	export const WallDecorStraightNoOffset = 4 as ObjShape;
	export const WallDecorStraightOffset = 5 as ObjShape;
	export const WallDecorDiagonalOffset = 6 as ObjShape;
	export const WallDecorDiagonalNoOffset = 7 as ObjShape;
	export const WallDecorDiagonalBoth = 8 as ObjShape;
	export const WallDiagonal = 9 as ObjShape;
	export const CentrepieceStraight = 10 as ObjShape;
	export const CentrepieceDiagonal = 11 as ObjShape;
	export const RoofStraight = 12 as ObjShape;
	export const RoofDiagonalWithRoofEdge = 13 as ObjShape;
	export const RoofDiagonal = 14 as ObjShape;
	export const RoofCornerConcave = 15 as ObjShape;
	export const RoofCornerConvex = 16 as ObjShape;
	export const RoofFlat = 17 as ObjShape;
	export const RoofEdgeStraight = 18 as ObjShape;
	export const RoofEdgeDiagonalCorner = 19 as ObjShape;
	export const RoofEdgeCorner = 20 as ObjShape;
	export const RoofEdgeSquarecorner = 21 as ObjShape;
	export const GroundDecor = 22 as ObjShape;

	export const byID = makeByID<ObjShape>();
}

export namespace PreAnimMoveMode {
	export const DelayMove = 0 as PreAnimMoveMode;
	export const DelayAnim = 1 as PreAnimMoveMode;
	export const Merge = 2 as PreAnimMoveMode;

	export const byID = makeByID<PreAnimMoveMode>();
}

export namespace PostAnimMoveMode {
	export const DelayMove = 0 as PostAnimMoveMode;
	export const AbortAnim = 1 as PostAnimMoveMode;
	export const Merge = 2 as PostAnimMoveMode;

	export const byID = makeByID<PostAnimMoveMode>();
}

export namespace AnimRestartMode {
	export const Continue = 0 as AnimRestartMode;
	export const Restart = 1 as AnimRestartMode;
	export const ResetLoops = 2 as AnimRestartMode;

	export const byID = makeByID<AnimRestartMode>();
}

export namespace AmbientSoundCurve {
	export const Linear = 0 as AmbientSoundCurve;
	export const EaseInSine = 1 as AmbientSoundCurve;
	export const EaseOutSine = 2 as AmbientSoundCurve;
	export const EaseInOutSine = 3 as AmbientSoundCurve;
	export const EaseInQuad = 4 as AmbientSoundCurve;
	export const EaseOutQuad = 5 as AmbientSoundCurve;
	export const EaseInOutQuad = 6 as AmbientSoundCurve;
	export const EaseInCubic = 7 as AmbientSoundCurve;
	export const EaseOutCubic = 8 as AmbientSoundCurve;
	export const EaseInOutCubic = 9 as AmbientSoundCurve;
	export const EaseInQuart = 10 as AmbientSoundCurve;
	export const EaseOutQuart = 11 as AmbientSoundCurve;
	export const EaseInOutQuart = 12 as AmbientSoundCurve;
	export const EaseInQuint = 13 as AmbientSoundCurve;
	export const EaseOutQuint = 14 as AmbientSoundCurve;
	export const EaseInOutQuint = 15 as AmbientSoundCurve;
	export const EaseInExpo = 16 as AmbientSoundCurve;
	export const EaseOutExpo = 17 as AmbientSoundCurve;
	export const EaseInOutExpo = 18 as AmbientSoundCurve;
	export const EaseInCirc = 19 as AmbientSoundCurve;
	export const EaseOutCirc = 20 as AmbientSoundCurve;
	export const EaseInOutCirc = 21 as AmbientSoundCurve;
	export const EaseInBack = 22 as AmbientSoundCurve;
	export const EaseOutBack = 23 as AmbientSoundCurve;
	export const EaseInOutBack = 24 as AmbientSoundCurve;
	export const EaseInElastic = 25 as AmbientSoundCurve;
	export const EaseOutElastic = 26 as AmbientSoundCurve;
	export const EaseInOutElastic = 27 as AmbientSoundCurve;

	export const byID = makeByID<AmbientSoundCurve>();
}

export namespace AmbientSoundVisibility {
	export const Always = 0 as AmbientSoundVisibility;
	export const SameWorldEntity = 1 as AmbientSoundVisibility;
	export const SameOrMainWorldEntity = 2 as AmbientSoundVisibility;

	export const byID = makeByID<AmbientSoundVisibility>();
}

export namespace MenuFilterMode {
	export const None = 0 as MenuFilterMode;
	export const ExamineOnly = 1 as MenuFilterMode;
	export const Everything = 2 as MenuFilterMode;

	export const byID = makeByID<MenuFilterMode>();
}

export namespace DBColumnID {
	export function pack(table: DBTableID, column: number, tupleIndex: number = 0): DBColumnID {
		return ((table << 12) | ((column & 0xFF) << 4) | (tupleIndex & 0xF)) as DBColumnID;
	}
	export function unpack(c: DBColumnID): [table: DBTableID, column: number, tupleIndex: number] {
		return [c >>> 12 as DBTableID, c >>> 4 & 0xFF, c & 0xF];
	}
}
