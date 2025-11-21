import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import {
	AnimationID,
	CategoryID,
	HSL,
	ModelID,
	NPCID,
	Params,
	SpriteID,
	TextureID,
	VarbitID,
	VarPID,
} from "../types.js";

export class NPC extends PerFileLoadable {
	constructor(public id: NPCID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 9;
	public static readonly gameval = 1;

	public models: ModelID[] = [] as ModelID[];
	public name = "null";
	public size = 1;
	public standingAnimation = -1 as AnimationID;
	public walkingAnimation = -1 as AnimationID;
	public idleRotateLeftAnimation = -1 as AnimationID;
	public idleRotateRightAnimation = -1 as AnimationID;
	public rotate180Animation = -1 as AnimationID;
	public rotateLeftAnimation = -1 as AnimationID;
	public rotateRightAnimation = -1 as AnimationID;
	public category = -1 as CategoryID;
	public actions: (string | null)[] = [null, null, null, null, null];
	public recolorFrom: HSL[] = [] as HSL[];
	public recolorTo: HSL[] = [] as HSL[];
	public retextureFrom: TextureID[] = [] as TextureID[];
	public retextureTo: TextureID[] = [] as TextureID[];
	public chatheadModels: ModelID[] = [] as ModelID[];
	public isMinimapVisible = true;
	public combatLevel = -1;
	public widthScale = 128;
	public heightScale = 128;
	public isVisible = false;
	public ambient = 0;
	public contrast = 0;
	public headIconArchive: SpriteID[] = [];
	public headIconSpriteIndex: number[] = [];
	public rotationSpeed = 32;
	public varbit = -1 as VarbitID;
	public varp = -1 as VarPID;
	public multiChildren: NPCID[] = [] as NPCID[];
	public oobChild = -1 as NPCID;
	public isInteractible = true;
	public isClickable = true;
	public isFollower = false;
	public lowPriorityOps = false;
	public runAnimation = -1 as AnimationID;
	public runRotate180Animation = -1 as AnimationID;
	public runRotateLeftAnimation = -1 as AnimationID;
	public runRotateRightAnimation = -1 as AnimationID;
	public crawlAnimation = -1 as AnimationID;
	public crawlRotate180Animation = -1 as AnimationID;
	public crawlRotateLeftAnimation = -1 as AnimationID;
	public crawlRotateRightAnimation = -1 as AnimationID;
	public attack = 1;
	public defence = 1;
	public strength = 1;
	public hitpoints = 1;
	public ranged = 1;
	public magic = 1;
	public height = -1;
	public footprintSize = -1;
	public unknown1 = false;
	public canHideForOverlap = false;
	public overlapTint: HSL = 39188;
	public params = new Params();

	public static decode(r: Reader, id: NPCID): NPC {
		const v = new NPC(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1: {
					let len = r.u8();
					v.models = new Array(len);
					for (let i = 0; i < len; i++) {
						v.models[i] = r.u16() as ModelID;
					}
					break;
				}
				case 2:
					v.name = r.string();
					break;
				case 12:
					v.size = r.u8();
					break;
				case 13:
					v.standingAnimation = r.u16() as AnimationID;
					break;
				case 14:
					v.walkingAnimation = r.u16() as AnimationID;
					break;
				case 15:
					v.idleRotateLeftAnimation = r.u16() as AnimationID;
					break;
				case 16:
					v.idleRotateRightAnimation = r.u16() as AnimationID;
					break;
				case 17:
					v.walkingAnimation = r.u16() as AnimationID;
					v.rotate180Animation = r.u16() as AnimationID;
					v.rotateLeftAnimation = r.u16() as AnimationID;
					v.rotateRightAnimation = r.u16() as AnimationID;
					break;
				case 18:
					v.category = r.u16() as CategoryID;
					break;
				case 30:
				case 31:
				case 32:
				case 33:
				case 34:
					v.actions[opcode - 30] = r.stringNullHidden();
					break;
				case 40: {
					let len = r.u8();
					v.recolorFrom = new Array(len);
					v.recolorTo = new Array(len);
					for (let i = 0; i < len; i++) {
						v.recolorFrom[i] = r.u16() as HSL;
						v.recolorTo[i] = r.u16() as HSL;
					}
					break;
				}
				case 41: {
					let len = r.u8();
					v.retextureFrom = new Array(len);
					v.retextureTo = new Array(len);
					for (let i = 0; i < len; i++) {
						v.retextureFrom[i] = r.u16() as TextureID;
						v.retextureTo[i] = r.u16() as TextureID;
					}
					break;
				}
				case 60: {
					let len = r.u8();
					v.chatheadModels = new Array(len);
					for (let i = 0; i < len; i++) {
						v.chatheadModels[i] = r.u16() as ModelID;
					}
					break;
				}
				case 74:
					v.attack = r.u16();
					break;
				case 75:
					v.defence = r.u16();
					break;
				case 76:
					v.strength = r.u16();
					break;
				case 77:
					v.hitpoints = r.u16();
					break;
				case 78:
					v.ranged = r.u16();
					break;
				case 79:
					v.magic = r.u16();
					break;
				case 93:
					v.isMinimapVisible = false;
					break;
				case 95:
					v.combatLevel = r.u16();
					break;
				case 97:
					v.widthScale = r.u16();
					break;
				case 98:
					v.heightScale = r.u16();
					break;
				case 99:
					v.isVisible = true;
					break;
				case 100:
					v.ambient = r.i8();
					break;
				case 101:
					v.contrast = r.i8();
					break;
				case 102:
					if (!r.isAfter({ era: "osrs", indexRevision: 3642 })) {
						v.headIconArchive = [-1 as SpriteID];
						v.headIconSpriteIndex = [r.u16()];
					} else {
						let bitfield = r.u8();
						v.headIconArchive = [];
						v.headIconSpriteIndex = [];
						for (let bits = bitfield; bits != 0; bits >>= 1) {
							if ((bits & 1) == 0) {
								v.headIconArchive.push(-1 as SpriteID);
								v.headIconSpriteIndex.push(-1);
							} else {
								v.headIconArchive.push(r.s2o4n() as SpriteID);
								v.headIconSpriteIndex.push(r.u8o16m1());
							}
						}
					}
					break;
				case 103:
					v.rotationSpeed = r.u16();
					break;
				case 106: {
					v.varbit = r.u16n() as VarbitID;
					v.varp = r.u16n() as VarPID;
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = r.u16n() as NPCID;
					}
					break;
				}
				case 107:
					v.isInteractible = false;
					break;
				case 109:
					v.isClickable = false;
					break;
				case 111:
					// removed in 220
					v.isFollower = true;
					v.lowPriorityOps = true;
					break;
				case 114:
					v.runAnimation = r.u16() as AnimationID;
					break;
				case 115:
					v.runAnimation = r.u16() as AnimationID;
					v.runRotate180Animation = r.u16() as AnimationID;
					v.runRotateLeftAnimation = r.u16() as AnimationID;
					v.runRotateRightAnimation = r.u16() as AnimationID;
					break;
				case 116:
					v.crawlAnimation = r.u16() as AnimationID;
					break;
				case 117:
					v.crawlAnimation = r.u16() as AnimationID;
					v.crawlRotate180Animation = r.u16() as AnimationID;
					v.crawlRotateLeftAnimation = r.u16() as AnimationID;
					v.crawlRotateRightAnimation = r.u16() as AnimationID;
					break;
				case 118: {
					v.varbit = r.u16n() as VarbitID;
					v.varp = r.u16n() as VarPID;
					v.oobChild = r.u16n() as NPCID;
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = r.u16n() as NPCID;
					}
					break;
				}
				case 122:
					v.isFollower = true;
					break;
				case 123:
					v.lowPriorityOps = true;
					break;
				case 124:
					v.height = r.u16();
					break;
				case 126:
					v.footprintSize = r.u16();
					break;
				case 129:
					v.unknown1 = true;
					break;
				case 145:
					v.canHideForOverlap = true;
					break;
				case 146:
					v.overlapTint = r.u16();
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
