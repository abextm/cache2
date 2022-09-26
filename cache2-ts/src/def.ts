export enum PType {
	Int = "int",
	String = "string",
	Boolean = "boolean",

	HSL = "HSL",
	RGB = "RGB",

	ScriptVarChar = "ScriptVarChar",

	AnimationID = "AnimationID",
	CategoryID = "CategoryID",
	FontID = "FontID",
	HitsplatID = "HitsplatID",
	ItemID = "ItemID",
	ModelID = "ModelID",
	NPCID = "NPCID",
	SpriteID = "SpriteID",
	TextureID = "TextureID",
	VarbitID = "VarbitID",
	VarPID = "VarPID",

	Params = "Params",
}
export type ArrayType = {
	inner: Type;
};

export type Type = PType | ArrayType;

export enum Coder {
	U8 = "u8",
	U8p1 = "u8p1",
	I8 = "i8",
	U16 = "u16",
	U16n = "u16n",
	I16 = "s16",
	U24 = "u24",
	I32 = "i32",
	S2o4n = "s2o4n",
	True = "true",
	False = "false",
	Zero = "zero",
	String = "string",
	VString = "vString",
	StringNullHidden = "stringNullHidden",
	Params = "params",
}

export type MaybeArrayIndex = string | [string, number];

export interface Field {
	name: string;
	type: Type;
	doc?: string;
	default?: string | number | boolean | (null | string)[] | number[];
}

export type IntoCoder = {
	coder: Coder;
	into: MaybeArrayIndex;
	type?: Type;
} | {
	coder: Coder;
	new: string[];
	inner: Type;
	each: IntoCoder[];
};

export interface Op {
	op: number;
	firstRev?: string;
	lastRev?: string;
	coder: IntoCoder[];
}

export interface EConfig<Field, Op> {
	name: string;
	archiveID: number;
	dataName?: string;
	indexName?: string;
	fields: { [name: string]: Field; };
	ops: { [op: number]: Op; };
}
export type Config = EConfig<Field, Op>;
