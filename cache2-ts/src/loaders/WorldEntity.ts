import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { AnimationID, HSL, MenuFilterMode, SpriteID, WorldEntityID } from "../types.js";

export class WorldEntity extends PerFileLoadable {
	constructor(public id: WorldEntityID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 72;

	public activePlane: number = 0;
	public unknown3 = false;
	public offsetX = 0;
	public offsetY = 0;
	public boundsX = 0;
	public boundsY = 0;
	public boundsWidth = 0;
	public boundsHeight = 0;
	public unknown10 = false;
	public unknown11 = false;
	public name: string | undefined = undefined;
	public unknown13 = false;
	public interactable = false;
	public actions: (string | null)[] = [null, null, null, null, null];
	public unknown20?: number | undefined = undefined;
	public unknown21 = false;
	public unknown22 = false;
	public unknown23 = 2;
	public menuFilterMode = MenuFilterMode.Everything;
	public animation: AnimationID = -1 as AnimationID;
	public minimapSprite: SpriteID = -1 as SpriteID;
	public tint: HSL = 39188;

	public static decode(r: Reader, id: WorldEntityID) {
		const v = new WorldEntity(id);
		for (let opcode = 0; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 2:
					v.activePlane = r.u8();
					break;
				case 3:
					v.unknown3 = true;
					break;
				case 4:
					v.offsetX = r.i16();
					break;
				case 5:
					v.offsetY = r.i16();
					break;
				case 6:
					v.boundsX = r.i16();
					break;
				case 7:
					v.boundsY = r.i16();
					break;
				case 8:
					v.boundsWidth = r.u16();
					break;
				case 9:
					v.boundsHeight = r.u16();
					break;
				case 10:
					v.unknown10 = true;
					break;
				case 11:
					v.unknown11 = true;
					break;
				case 12:
					v.name = r.string();
					break;
				case 13:
					v.unknown13 = true;
					break;
				case 14:
					v.interactable = true;
					break;
				case 15:
				case 16:
				case 17:
				case 18:
				case 19:
					v.actions[opcode - 15] = r.stringNullHidden();
					v.interactable = true;
					break;
				case 20:
					v.unknown20 = r.u16();
					break;
				case 21:
					v.unknown21 = true;
					break;
				case 22:
					v.unknown22 = true;
					break;
				case 23:
					v.unknown23 = r.u8();
					break;
				case 24:
					v.menuFilterMode = r.u8() as MenuFilterMode;
					break;
				case 25:
					v.animation = r.u16() as AnimationID;
					break;
				case 26:
					v.minimapSprite = r.s2o4n() as SpriteID;
					break;
				case 27:
					v.tint = r.u16();
					break;
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}
		return v;
	}
}
