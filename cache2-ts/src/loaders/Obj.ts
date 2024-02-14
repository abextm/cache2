import { PerFileLoadable } from "../Loadable";
import { Reader } from "../Reader";
import { Typed } from "../reflect";
import {
	AnimationID,
	CategoryID,
	HSL,
	MapElementID,
	MapSceneIconID,
	ModelID,
	ObjID,
	ObjType,
	Params,
	SoundEffectID,
	TextureID,
	VarbitID,
	VarPID,
} from "../types";

@Typed
export class Obj extends PerFileLoadable {
	constructor(public id: ObjID) {
		super();
	}

	public static readonly index = 2;
	public static readonly archive = 6;

	public models: null | { type: ObjType; model: ModelID; }[] = null;
	public name = "null";
	public width = 1;
	public length = 1;
	public clipType: 0 | 1 | 2 = 2;
	public blocksProjectile = true;
	public isDoor = -1;
	public contouredGround = -1;
	public flatShading = false;
	public modelClipped = false;
	public animationId = <AnimationID> -1;
	public decorDisplacement = 16;
	public ambient = 0;
	public contrast = 0;
	public category = <CategoryID> -1;
	public actions: (string | null)[] = [null, null, null, null, null];
	public recolorFrom: HSL[] = <HSL[]> [];
	public recolorTo: HSL[] = <HSL[]> [];
	public retextureFrom: TextureID[] = <TextureID[]> [];
	public retextureTo: TextureID[] = <TextureID[]> [];
	public mapIconId = <MapElementID> -1;
	public mapSceneId = <MapSceneIconID> -1;
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
	public varbit = <VarbitID> -1;
	public varp = <VarPID> -1;
	public multiChildren: ObjID[] = <ObjID[]> [];
	public oobChild = <ObjID> -1;
	public ambientSoundID = <SoundEffectID> -1;
	public multiAmbientSoundIDs = <SoundEffectID[]> [];
	public ambientSoundDistance = 0;
	public ambientSoundRetain = 0;
	public ambientSoundChangeTicksMin = 0;
	public ambientSoundChangeTicksMax = 0;
	public randomizeAnimationStart = true;
	public blockingMask: undefined | number = undefined;
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
							model: <ModelID> r.u16(),
							type: opcode == 5 ? ObjType.CentrepieceStraight : <ObjType> r.u8(),
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
					v.animationId = <AnimationID> r.u16n();
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
				case 61:
					v.category = <CategoryID> r.u16();
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
					v.mapSceneId = <MapSceneIconID> r.u16();
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
					v.varbit = <VarbitID> r.u16n();
					v.varp = <VarPID> r.u16n();
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = <ObjID> r.u16n();
					}
					break;
				}
				case 78:
					v.ambientSoundID = <SoundEffectID> r.u16();
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
						v.multiAmbientSoundIDs[i] = <SoundEffectID> r.u16();
					}
					break;
				}
				case 81:
					v.contouredGround = r.u8() * 256;
					break;
				case 82:
					v.mapIconId = <MapElementID> r.u16();
					break;
				case 89:
					v.randomizeAnimationStart = false;
					break;
				case 92: {
					v.varbit = <VarbitID> r.u16n();
					v.varp = <VarPID> r.u16n();
					v.oobChild = <ObjID> r.u16n();
					let len = r.u8p1();
					v.multiChildren = new Array(len);
					for (let i = 0; i < len; i++) {
						v.multiChildren[i] = <ObjID> r.u16n();
					}
					break;
				}
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
				v.models?.[0]?.type === ObjType.CentrepieceStraight
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
