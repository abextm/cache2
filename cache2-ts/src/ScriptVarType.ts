import { cp1252CharMap } from "./Reader";
import { Typed } from "./reflect";
import { ScriptVarChar, ScriptVarID } from "./types";

const byChar = new Map<ScriptVarChar, ScriptVarType>();
const byID = new Map<ScriptVarID, ScriptVarType>();

function t(k: {
	id?: number;
	char?: string;
	jag?: string;
	type?: string;
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
	);

	if (svt.char !== undefined) {
		byChar.set(svt.char, svt);
	}
	if (svt.id !== undefined) {
		byID.set(svt.id, svt);
	}

	return svt;
}

export class ScriptVarType {
	public static forChar(c: ScriptVarChar): ScriptVarType | undefined {
		return byChar.get(c);
	}
	public static forID(i: ScriptVarID): ScriptVarType | undefined {
		return byID.get(i);
	}

	constructor(
		public readonly name: string,
		public readonly id: ScriptVarID | undefined,
		public readonly char: ScriptVarChar | undefined,
		public readonly jagexName: string | undefined,
		public readonly typeName: string | undefined,
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

	static readonly int = t({ id: 0, char: "i", jag: "integer" });
	static readonly bool = t({ id: 1, char: "1", jag: "boolean" });
	static readonly anim = t({ id: 6, char: "A", jag: "seq", type: "AnimationID" });
	static readonly color = t({ id: 7, char: "C", jag: "colour", type: "RGB" });
	static readonly widget = t({ id: 9, char: "I", jag: "component" });
	static readonly kit = t({ id: 10, char: "K", jag: "idkit" });
	static readonly midi = t({ id: 11, char: "M", jag: "midi" });
	static readonly namedItem = t({ id: 13, char: "O", jag: "namedobj", type: "ItemID" });
	static readonly synth = t({ id: 14, char: "P", jag: "synth" });
	static readonly stat = t({ id: 17, char: "S", jag: "stat" });
	static readonly coord = t({ id: 22, char: "c", jag: "coordgrid" });
	static readonly sprite = t({ id: 23, char: "d", jag: "graphic", type: "SpriteID" });
	static readonly font = t({ id: 25, char: "f", jag: "fontmetrics", type: "FontID" });
	static readonly enum = t({ id: 26, char: "g", jag: "enum" });
	static readonly jingle = t({ id: 28, char: "j", jag: "jingle" });
	static readonly object = t({ id: 30, char: "l", jag: "loc" });
	static readonly model = t({ id: 31, char: "m", jag: "model", type: "ModelID" });
	static readonly npc = t({ id: 32, char: "n", jag: "npc", type: "NPCID" });
	static readonly item = t({ id: 33, char: "o", jag: "obj", type: "ItemID" });
	static readonly string = t({ id: 36, char: "s", jag: "string" });
	static readonly spotAnim = t({ id: 37, char: "t", jag: "spotanim" });
	static readonly inventory = t({ id: 39, char: "v", jag: "inv" });
	static readonly texture = t({ id: 40, char: "x", jag: "texture", type: "TextureID" });
	static readonly char = t({ id: 42, char: "z", jag: "char" });
	static readonly mapSceneIcon = t({ id: 55, char: "£", jag: "mapsceneicon" });
	static readonly mapElement = t({ id: 59, char: "µ", jag: "mapelement" });
	static readonly hitsplat = t({ id: 62, char: "×", jag: "hitmark", type: "HitsplatID" });
	static readonly struct = t({ id: 73, char: "J", jag: "struct", type: "StructID" });
	static readonly dbRow = t({ id: 74, char: "Ð", jag: "dbrow" });
}

for (let [name, v] of Object.entries(ScriptVarType)) {
	if (v instanceof ScriptVarType) {
		if (v.name === undefined) {
			(v as any).name = name;
		}
	}
}
