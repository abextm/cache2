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

	public font = <FontID> -1;
	public fontColor = <RGB> 16777215;
	public leftSprite = <SpriteID> -1;
	public leftSprite2 = <SpriteID> -1;
	public backgroundSprite = <SpriteID> -1;
	public rightSprite = <SpriteID> -1;
	public animX = 0;
	public animY = 0;
	public animStart = -1;
	public animDuration = 0;
	public animMode = 0;
	public formatString: string | null = null;
	public textY = 0;
	public varbit = <VarbitID> -1;
	public varp = <VarPID> -1;
	public multiChildren: HitsplatID[] = <HitsplatID[]> [];
	public oobChild = <HitsplatID> -1;

	public static decode(r: Reader, id: HitsplatID): Hitsplat {
		const v = new Hitsplat(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1:
					v.font = <FontID> r.s2o4n();
					break;
				case 2:
					v.fontColor = <RGB> r.u24();
					break;
				case 3:
					v.leftSprite = <SpriteID> r.s2o4n();
					break;
				case 4:
					v.leftSprite2 = <SpriteID> r.s2o4n();
					break;
				case 5:
					v.backgroundSprite = <SpriteID> r.s2o4n();
					break;
				case 6:
					v.rightSprite = <SpriteID> r.s2o4n();
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
					v.varbit = <VarbitID> r.u16n();
					v.varp = <VarPID> r.u16n();
					if (opcode == 18) {
						v.oobChild = <HitsplatID> r.u16n();
					}
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = <HitsplatID> r.u16n();
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
