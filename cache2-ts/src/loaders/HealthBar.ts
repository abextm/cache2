import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { HealthBarID, SpriteID } from "../types.js";

export class HealthBar extends PerFileLoadable {
	constructor(public id: HealthBarID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 33;

	public unused1: number | undefined = undefined;
	public sortOrder: number = 255;
	public despawnPriority: number = 255;
	public fadeOutAt = -1;
	public duration = 70;
	public unused2: number | undefined = undefined;
	public filledSprite = -1 as SpriteID;
	public emptySprite = -1 as SpriteID;
	public denominator = 30;
	public borderSize = 0;

	public static decode(r: Reader, id: HealthBarID): HealthBar {
		const v = new HealthBar(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1:
					v.unused1 = r.u16();
					break;
				case 2:
					v.sortOrder = r.u8();
					break;
				case 3:
					v.despawnPriority = r.u8();
					break;
				case 4:
					v.fadeOutAt = 0;
					break;
				case 5:
					v.duration = r.u16();
					break;
				case 6:
					v.unused2 = r.u8();
					break;
				case 7:
					v.filledSprite = r.u32o16n() as SpriteID;
					break;
				case 8:
					v.emptySprite = r.u32o16n() as SpriteID;
					break;
				case 11:
					v.fadeOutAt = r.u16();
					break;
				case 14:
					v.denominator = r.u8();
					break;
				case 15:
					v.borderSize = r.u8();
					break;
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}
		return v;
	}
}
