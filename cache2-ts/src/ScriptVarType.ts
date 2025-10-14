import { cp1252CharMap } from "./Reader.js";
import { Typed } from "./reflect.js";
import { ScriptVarChar, ScriptVarID } from "./types.js";

const byChar = new Map<ScriptVarChar, ScriptVarType>();
const byID = new Map<ScriptVarID, ScriptVarType>();

export type BaseVarType = "int" | "string" | "long";

export namespace BaseVarType {
	export function forOrdinal(ordinal: number): BaseVarType {
		switch (ordinal) {
			case 0:
				return "int";
			case 1:
				return "long";
			case 2:
				return "string";
			default:
				throw new Error(`unknown BaseVarType ordinal ${ordinal}`);
		}
	}
}

export class ScriptVarType {
	public static forChar(c: ScriptVarChar): ScriptVarType | undefined {
		return byChar.get(c);
	}
	public static forID(i: ScriptVarID): ScriptVarType | undefined {
		return byID.get(i);
	}
	public static withType<T>(v: T, type: ScriptVarID | ScriptVarType | undefined): Typed.Value<T> {
		if (typeof type === "number") {
			type = ScriptVarType.forID(type);
		}
		if (!type) {
			return v;
		}
		return type.withType(v);
	}

	constructor(
		public readonly name: string,
		public readonly id: ScriptVarID | undefined,
		public readonly char: ScriptVarChar | undefined,
		public readonly jagexName: string | undefined,
		public readonly typeName: string | undefined,
		public readonly baseType: BaseVarType,
	) {
	}

	public asTyped(): Typed.Named | undefined {
		if (this.typeName) {
			return {
				type: "named",
				name: this.typeName,
			};
		}
	}

	public withType<T>(v: T): Typed.Value<T> {
		let typed = this.asTyped();
		if (!typed) {
			return v;
		}

		return Typed.withType(typed, v);
	}

	private static t(k: {
		id?: number;
		char?: string;
		jag?: string;
		type?: string;
		base?: "string" | "long";
	}): ScriptVarType {
		let char: number | undefined = undefined;
		if (k.char) {
			char = cp1252CharMap.indexOf(k.char);
			if (char < 0) {
				throw new Error("invalid cp1252 char " + k.char);
			}
		}
		let svt = new ScriptVarType(
			undefined!,
			k.id as ScriptVarID,
			char as ScriptVarChar,
			k.jag,
			k.type,
			k.base ?? "int",
		);

		if (svt.char !== undefined) {
			byChar.set(svt.char, svt);
		}
		if (svt.id !== undefined) {
			byID.set(svt.id, svt);
		}

		return svt;
	}

	static readonly int = this.t({ id: 0, char: "i", jag: "integer" });
	static readonly bool = this.t({ id: 1, char: "1", jag: "boolean" });
	static readonly anim = this.t({ id: 6, char: "A", jag: "seq", type: "AnimationID" });
	static readonly color = this.t({ id: 7, char: "C", jag: "colour", type: "RGB" });
	static readonly objShape = this.t({ id: 8, char: "H", jag: "locshape", type: "ObjShape" });
	static readonly widget = this.t({ id: 9, char: "I", jag: "component" });
	static readonly kit = this.t({ id: 10, char: "K", jag: "idkit" });
	static readonly midi = this.t({ id: 11, char: "M", jag: "midi" });
	static readonly namedItem = this.t({ id: 13, char: "O", jag: "namedobj", type: "ItemID" });
	static readonly synth = this.t({ id: 14, char: "P", jag: "synth", type: "SoundEffectID" });
	static readonly stat = this.t({ id: 17, char: "S", jag: "stat" });
	static readonly coord = this.t({ id: 22, char: "c", jag: "coordgrid", type: "WorldPoint" });
	static readonly sprite = this.t({ id: 23, char: "d", jag: "graphic", type: "SpriteID" });
	static readonly font = this.t({ id: 25, char: "f", jag: "fontmetrics", type: "FontID" });
	static readonly enum = this.t({ id: 26, char: "g", jag: "enum", type: "EnumID" });
	static readonly jingle = this.t({ id: 28, char: "j", jag: "jingle" });
	static readonly obj = this.t({ id: 30, char: "l", jag: "loc", type: "ObjID" });
	static readonly model = this.t({ id: 31, char: "m", jag: "model", type: "ModelID" });
	static readonly npc = this.t({ id: 32, char: "n", jag: "npc", type: "NPCID" });
	static readonly item = this.t({ id: 33, char: "o", jag: "obj", type: "ItemID" });
	static readonly string = this.t({ id: 36, char: "s", jag: "string", base: "string" });
	static readonly spotAnim = this.t({ id: 37, char: "t", jag: "spotanim" });
	static readonly inventory = this.t({ id: 39, char: "v", jag: "inv" });
	static readonly texture = this.t({ id: 40, char: "x", jag: "texture", type: "TextureID" });
	static readonly category = this.t({ id: 41, char: "y", jag: "category", type: "CategoryID" });
	static readonly char = this.t({ id: 42, char: "z", jag: "char" });
	static readonly mapSceneIcon = this.t({ id: 55, char: "£", jag: "mapsceneicon", type: "MapSceneIconID" });
	static readonly mapElement = this.t({ id: 59, char: "µ", jag: "mapelement", type: "MapElementID" });
	static readonly hitsplat = this.t({ id: 62, char: "×", jag: "hitmark", type: "HitsplatID" });
	static readonly struct = this.t({ id: 73, char: "J", jag: "struct", type: "StructID" });
	static readonly dbRow = this.t({ id: 74, char: "Ð", jag: "dbrow", type: "DBRowID" });
	static readonly varp = this.t({ id: 209, char: "7", jag: "varp", type: "VarPID" });

	// 49, 56, 71, 110, 115, 116 are base long
}

for (let [name, v] of Object.entries(ScriptVarType)) {
	if (v instanceof ScriptVarType) {
		if (v.name === undefined) {
			(v as any).name = name;
		}
	}
}
