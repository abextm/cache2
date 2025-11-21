import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import {
	AmbientSoundCurve,
	AmbientSoundVisibility,
	AnimationID,
	CategoryID,
	HSL,
	MapElementID,
	MapSceneIconID,
	ModelID,
	ObjID,
	ObjShape,
	Params,
	SoundEffectID,
	TextureID,
	VarbitID,
	VarPID,
} from "../types.js";

export class Obj extends PerFileLoadable {
	constructor(public id: ObjID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 6;
	public static readonly gameval = 6;

	public models: null | { shape: ObjShape; model: ModelID; }[] = null;
	public name = "null";
	public width = 1;
	public length = 1;
	public clipType: 0 | 1 | 2 = 2;
	public blocksProjectile = true;
	public isDoor = -1;
	public contouredGround = -1;
	public flatShading = false;
	public modelClipped = false;
	public animationId = -1 as AnimationID;
	public decorDisplacement = 16;
	public ambient = 0;
	public contrast = 0;
	public category = -1 as CategoryID;
	public actions: (string | null)[] = [null, null, null, null, null];
	public recolorFrom: HSL[] = [] as HSL[];
	public recolorTo: HSL[] = [] as HSL[];
	public retextureFrom: TextureID[] = [] as TextureID[];
	public retextureTo: TextureID[] = [] as TextureID[];
	public mapIconId = -1 as MapElementID;
	public mapSceneId = -1 as MapSceneIconID;
	public isRotated = false;
	public shadow = true;
	public modelSizeX = 128;
	public modelSizeHeight = 128;
	public modelSizeY = 128;
	public offsetX = 0;
	public offsetHeight = 0;
	public offsetY = 0;
	public obstructsGround = false;
	public isHollow = false;
	public supportItems = -1;
	public varbit = -1 as VarbitID;
	public varp = -1 as VarPID;
	public multiChildren: ObjID[] = [] as ObjID[];
	public oobChild = -1 as ObjID;
	public ambientSoundID = -1 as SoundEffectID;
	public multiAmbientSoundIDs = [] as SoundEffectID[];
	public ambientSoundDistance = 0;
	public ambientSoundRetain = 0;
	public ambientSoundDistanceFadeCurve: AmbientSoundCurve = AmbientSoundCurve.Linear;
	public ambientSoundFadeInDuration = 300;
	public ambientSoundFadeOutDuration = 300;
	public ambientSoundFadeInCurve: AmbientSoundCurve = AmbientSoundCurve.Linear;
	public ambientSoundFadeOutCurve: AmbientSoundCurve = AmbientSoundCurve.Linear;
	public ambientSoundVisibility: AmbientSoundVisibility = AmbientSoundVisibility.SameOrMainWorldEntity;
	public ambientSoundChangeTicksMin = 0;
	public ambientSoundChangeTicksMax = 0;
	public randomizeAnimationStart = true;
	public blockingMask: undefined | number = undefined;
	public deferAnimChange = false;
	public unknown1 = false;
	public params = new Params();

	public static decode(r: Reader, id: ObjID): Obj {
		const v = new Obj(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1:
				case 5: {
					let len = r.u8();
					v.models = new Array(len);
					for (let i = 0; i < len; i++) {
						v.models[i] = {
							model: r.u16() as ModelID,
							shape: opcode == 5 ? ObjShape.CentrepieceStraight : r.u8() as ObjShape,
						};
					}
					break;
				}
				case 2:
					v.name = r.string();
					break;
				case 14:
					v.width = r.u8();
					break;
				case 15:
					v.length = r.u8();
					break;
				case 17:
					v.clipType = 0;
					v.blocksProjectile = false;
					break;
				case 18:
					v.blocksProjectile = false;
					break;
				case 19:
					v.isDoor = r.u8();
					break;
				case 21:
					v.contouredGround = 0;
					break;
				case 22:
					v.flatShading = true;
					break;
				case 23:
					v.modelClipped = true;
					break;
				case 24:
					v.animationId = r.u16n() as AnimationID;
					break;
				case 27:
					v.clipType = 1;
					break;
				case 28:
					v.decorDisplacement = r.u8();
					break;
				case 29:
					v.ambient = r.u8();
					break;
				case 39:
					v.contrast = r.u8() * 25;
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
				case 61:
					v.category = r.u16() as CategoryID;
					break;
				case 62:
					v.isRotated = true;
					break;
				case 64:
					v.shadow = false;
					break;
				case 65:
					v.modelSizeX = r.u16();
					break;
				case 66:
					v.modelSizeHeight = r.u16();
					break;
				case 67:
					v.modelSizeY = r.u16();
					break;
				case 68:
					v.mapSceneId = r.u16() as MapSceneIconID;
					break;
				case 69:
					v.blockingMask = r.u8();
					break;
				case 70:
					v.offsetX = r.i16();
					break;
				case 71:
					v.offsetHeight = r.i16();
					break;
				case 72:
					v.offsetY = r.i16();
					break;
				case 73:
					v.obstructsGround = true;
					break;
				case 74:
					v.isHollow = true;
					break;
				case 75:
					v.supportItems = r.u8();
					break;
				case 77: {
					v.varbit = r.u16n() as VarbitID;
					v.varp = r.u16n() as VarPID;
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = r.u16n() as ObjID;
					}
					break;
				}
				case 78:
					v.ambientSoundID = r.u16() as SoundEffectID;
					v.ambientSoundDistance = r.u8();
					if (r.isAfter({ era: "osrs", indexRevision: 4106 })) {
						v.ambientSoundRetain = r.u8();
					}
					break;
				case 79: {
					v.ambientSoundChangeTicksMin = r.u16();
					v.ambientSoundChangeTicksMax = r.u16();
					v.ambientSoundDistance = r.u8();
					if (r.isAfter({ era: "osrs", indexRevision: 4106 })) {
						v.ambientSoundRetain = r.u8();
					}
					let len = r.u8();
					v.multiAmbientSoundIDs = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiAmbientSoundIDs[i] = r.u16() as SoundEffectID;
					}
					break;
				}
				case 81:
					v.contouredGround = r.u8() * 256;
					break;
				case 82:
					v.mapIconId = r.u16() as MapElementID;
					break;
				case 89:
					v.randomizeAnimationStart = false;
					break;
				case 90:
					v.deferAnimChange = true;
					break;
				case 91:
					v.ambientSoundDistanceFadeCurve = r.u8() as AmbientSoundCurve;
					break;
				case 92: {
					v.varbit = r.u16n() as VarbitID;
					v.varp = r.u16n() as VarPID;
					v.oobChild = r.u16n() as ObjID;
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = r.u16n() as ObjID;
					}
					break;
				}
				case 93:
					v.ambientSoundFadeInCurve = r.u8() as AmbientSoundCurve;
					v.ambientSoundFadeInDuration = r.u16();
					v.ambientSoundFadeOutCurve = r.u8() as AmbientSoundCurve;
					v.ambientSoundFadeOutDuration = r.u16();
					break;
				case 94:
					v.unknown1 = true;
					break;
				case 95:
					v.ambientSoundVisibility = r.u8() as AmbientSoundVisibility;
					break;
				case 249:
					v.params = r.params();
					break;
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}

		if (v.isDoor === -1) {
			v.isDoor = 0;
			if (
				v.models?.[0]?.shape === ObjShape.CentrepieceStraight
				|| v.actions.some(a => a !== null)
			) {
				v.isDoor = 1;
			}
		}
		if (v.supportItems === -1) {
			v.supportItems = v.clipType != 0 ? 1 : 0;
		}

		return v;
	}
}
