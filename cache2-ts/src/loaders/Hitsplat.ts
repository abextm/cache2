import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { FontID, HitsplatID, RGB, SpriteID, VarbitID, VarPID } from "../types.js";

export class Hitsplat extends PerFileLoadable {
	constructor(public id: HitsplatID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 32;

	public font = -1 as FontID;
	public fontColor = 16777215 as RGB;
	public leftSprite = -1 as SpriteID;
	public leftSprite2 = -1 as SpriteID;
	public backgroundSprite = -1 as SpriteID;
	public rightSprite = -1 as SpriteID;
	public animX = 0;
	public animY = 0;
	public animStart = -1;
	public animDuration = 0;
	public animMode = 0;
	public formatString: string | null = null;
	public textY = 0;
	public varbit = -1 as VarbitID;
	public varp = -1 as VarPID;
	public multiChildren: HitsplatID[] = [] as HitsplatID[];
	public oobChild = -1 as HitsplatID;

	public static decode(r: Reader, id: HitsplatID): Hitsplat {
		const v = new Hitsplat(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1:
					v.font = r.s2o4n() as FontID;
					break;
				case 2:
					v.fontColor = r.u24() as RGB;
					break;
				case 3:
					v.leftSprite = r.s2o4n() as SpriteID;
					break;
				case 4:
					v.leftSprite2 = r.s2o4n() as SpriteID;
					break;
				case 5:
					v.backgroundSprite = r.s2o4n() as SpriteID;
					break;
				case 6:
					v.rightSprite = r.s2o4n() as SpriteID;
					break;
				case 7:
					v.animX = r.i16();
					break;
				case 8:
					v.formatString = r.vString();
					break;
				case 9:
					v.animDuration = r.u16();
					break;
				case 10:
					v.animY = r.i16();
					break;
				case 11:
					v.animStart = 0;
					break;
				case 12:
					v.animMode = r.u8();
					break;
				case 13:
					v.textY = r.i16();
					break;
				case 14:
					v.animStart = r.u16();
					break;
				case 17:
				case 18: {
					v.varbit = r.u16n() as VarbitID;
					v.varp = r.u16n() as VarPID;
					if (opcode == 18) {
						v.oobChild = r.u16n() as HitsplatID;
					}
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = r.u16n() as HitsplatID;
					}
					break;
				}
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}
		return v;
	}
}
