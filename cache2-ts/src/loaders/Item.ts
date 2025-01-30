import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { CategoryID, HSL, ItemID, ModelID, Params, TextureID, WearPos } from "../types.js";

export class Item extends PerFileLoadable {
	constructor(public id: ItemID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 10;

	public inventoryModel = <ModelID> -1;
	public name: string | null = "null";
	public examine: string | null = null;
	public zoom2d = 2000;
	public xan2d = 0;
	public yan2d = 0;
	public offsetX2d = 0;
	public offsetY2d = 0;
	public isStackable = false;
	public price = 1;
	public isMembers = false;
	public wearpos1 = <WearPos> -1;
	public wearpos2 = <WearPos> -1;
	public wearpos3 = <WearPos> -1;
	public weight = 0;
	public maleModel = <ModelID> -1;
	public maleOffset = 0;
	public maleModel1 = <ModelID> -1;
	public femaleModel = <ModelID> -1;
	public femaleOffset = 0;
	public femaleModel1 = <ModelID> -1;
	public groundActions: (string | null)[] = [null, null, "Take", null, null];
	public inventoryActions: (string | null)[] = [null, null, null, null, "Drop"];
	public subops: string[][] = [];
	public recolorFrom: HSL[] = <HSL[]> [];
	public recolorTo: HSL[] = <HSL[]> [];
	public retextureFrom: TextureID[] = <TextureID[]> [];
	public retextureTo: TextureID[] = <TextureID[]> [];
	public shiftClickIndex = -2;
	public isGrandExchangable = false;
	public maleModel2 = <ModelID> -1;
	public femaleModel2 = <ModelID> -1;
	public maleChatheadModel = <ModelID> -1;
	public femaleChatheadModel = <ModelID> -1;
	public maleChatheadModel2 = <ModelID> -1;
	public femaleChatheadModel2 = <ModelID> -1;
	public category = <CategoryID> -1;
	public zan2d = 0;
	public noteLinkedItem = <ItemID> -1;
	public noteTemplate = <ItemID> -1;
	public stackVariantItems: ItemID[] = <ItemID[]> [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	public stackVariantQuantities: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	public resizeX = 128;
	public resizeY = 128;
	public resizeZ = 128;
	public ambient = 0;
	public contrast = 0;
	public team = 0;
	public noted2 = <ItemID> -1;
	public noted3 = <ItemID> -1;
	public placeholderLinkedItem = <ItemID> -1;
	public placeholderTemplate = <ItemID> -1;
	public params = new Params();

	public static decode(r: Reader, id: ItemID): Item {
		const v = new Item(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1:
					v.inventoryModel = <ModelID> r.u16();
					break;
				case 2:
					v.name = r.string();
					break;
				case 3:
					v.examine = r.string();
					break;
				case 4:
					v.zoom2d = r.u16();
					break;
				case 5:
					v.xan2d = r.u16();
					break;
				case 6:
					v.yan2d = r.u16();
					break;
				case 7:
					v.offsetX2d = r.i16();
					break;
				case 8:
					v.offsetY2d = r.i16();
					break;
				case 11:
					v.isStackable = true;
					break;
				case 12:
					v.price = r.i32();
					break;
				case 13:
					v.wearpos1 = <WearPos> r.u8();
					break;
				case 14:
					v.wearpos2 = <WearPos> r.u8();
					break;
				case 16:
					v.isMembers = true;
					break;
				case 23:
					v.maleModel = <ModelID> r.u16();
					v.maleOffset = r.u8();
					break;
				case 24:
					v.maleModel1 = <ModelID> r.u16();
					break;
				case 25:
					v.femaleModel = <ModelID> r.u16();
					v.femaleOffset = r.u8();
					break;
				case 26:
					v.femaleModel1 = <ModelID> r.u16();
					break;
				case 27:
					v.wearpos3 = <WearPos> r.u8();
					break;
				case 30:
				case 31:
				case 32:
				case 33:
				case 34:
					v.groundActions[opcode - 30] = r.stringNullHidden();
					break;
				case 35:
				case 36:
				case 37:
				case 38:
				case 39:
					v.inventoryActions[opcode - 35] = r.string();
					break;
				case 40: {
					let len = r.u8();
					v.recolorFrom = new Array(len);
					v.recolorTo = new Array(len);
					for (let i = 0; i < len; i++) {
						v.recolorFrom[i] = <HSL> r.u16();
						v.recolorTo[i] = <HSL> r.u16();
					}
					break;
				}
				case 41: {
					let len = r.u8();
					v.retextureFrom = new Array(len);
					v.retextureTo = new Array(len);
					for (let i = 0; i < len; i++) {
						v.retextureFrom[i] = <TextureID> r.u16();
						v.retextureTo[i] = <TextureID> r.u16();
					}
					break;
				}
				case 42:
					v.shiftClickIndex = r.i8();
					break;
				case 43: {
					let index = r.u8();
					let subop = v.subops[index] ??= [];
					for (;;) {
						let subindex = r.u8() - 1;
						if (subindex < 0) {
							break;
						}
						subop[subindex] = r.string();
					}
					break;
				}
				case 65:
					v.isGrandExchangable = true;
					break;
				case 75:
					v.weight = r.i16();
					break;
				case 78:
					v.maleModel2 = <ModelID> r.u16();
					break;
				case 79:
					v.femaleModel2 = <ModelID> r.u16();
					break;
				case 90:
					v.maleChatheadModel = <ModelID> r.u16();
					break;
				case 91:
					v.femaleChatheadModel = <ModelID> r.u16();
					break;
				case 92:
					v.maleChatheadModel2 = <ModelID> r.u16();
					break;
				case 93:
					v.femaleChatheadModel2 = <ModelID> r.u16();
					break;
				case 94:
					v.category = <CategoryID> r.u16();
					break;
				case 95:
					v.zan2d = r.u16();
					break;
				case 97:
					v.noteLinkedItem = <ItemID> r.u16();
					break;
				case 98:
					v.noteTemplate = <ItemID> r.u16();
					break;
				case 100:
				case 101:
				case 102:
				case 103:
				case 104:
				case 105:
				case 106:
				case 107:
				case 108:
				case 109:
					v.stackVariantItems[opcode - 100] = <ItemID> r.u16();
					v.stackVariantQuantities[opcode - 100] = r.u16();
					break;
				case 110:
					v.resizeX = r.u16();
					break;
				case 111:
					v.resizeY = r.u16();
					break;
				case 112:
					v.resizeZ = r.u16();
					break;
				case 113:
					v.ambient = r.i8();
					break;
				case 114:
					v.contrast = r.i8();
					break;
				case 115:
					v.team = r.i8();
					break;
				case 139:
					v.noted2 = <ItemID> r.u16();
					break;
				case 140:
					v.noted3 = <ItemID> r.u16();
					break;
				case 148:
					v.placeholderLinkedItem = <ItemID> r.u16();
					break;
				case 149:
					v.placeholderTemplate = <ItemID> r.u16();
					break;
				case 249:
					v.params = r.params();
					break;
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}
		return v;
	}
}
