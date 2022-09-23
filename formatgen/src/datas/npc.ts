import { Coder, PType } from "../def";
import { buildConfig, range } from "../setupDef";

export const config = buildConfig({
	name: "NPC",
	archiveID: 9,
	fields: {
		models: {
			type: {
				inner: PType.ModelID,
			},
		},
		name: {
			type: PType.String,
			default: "null",
			coder: {
				op: 2,
				coder: Coder.String,
			},
		},
		size: {
			type: PType.Int,
			default: 1,
			coder: {
				op: 12,
				coder: Coder.U8,
			},
		},
		standingAnimation: {
			type: PType.AnimationID,
			coder: {
				op: 13,
				coder: Coder.U16,
			},
		},
		walkingAnimation: {
			type: PType.AnimationID,
			coder: {
				op: 14,
				coder: Coder.U16,
			},
		},
		idleRotateLeftAnimation: {
			type: PType.AnimationID,
			coder: {
				op: 15,
				coder: Coder.U16,
			},
		},
		idleRotateRightAnimation: {
			type: PType.AnimationID,
			coder: {
				op: 16,
				coder: Coder.U16,
			},
		},
		rotate180Animation: {
			type: PType.AnimationID,
		},
		rotateLeftAnimation: {
			type: PType.AnimationID,
		},
		rotateRightAnimation: {
			type: PType.AnimationID,
		},
		category: {
			type: PType.CategoryID,
			coder: {
				op: 18,
				coder: Coder.U16,
			},
		},
		actions: {
			type: {
				inner: PType.String,
			},
			default: [null, null, null, null, null],
		},
		recolorFrom: {
			type: {
				inner: PType.HSL,
			},
		},
		recolorTo: {
			type: {
				inner: PType.HSL,
			},
		},
		retextureFrom: {
			type: {
				inner: PType.TextureID,
			},
		},
		retextureTo: {
			type: {
				inner: PType.TextureID,
			},
		},
		chatheadModels: {
			type: {
				inner: PType.ModelID,
			},
		},
		isMinimapVisible: {
			type: PType.Boolean,
			default: true,
			coder: {
				op: 93,
				coder: Coder.False,
			},
		},
		combatLevel: {
			type: PType.Int,
			default: -1,
			coder: {
				op: 95,
				coder: Coder.U16,
			},
		},
		widthScale: {
			type: PType.Int,
			default: 128,
			coder: {
				op: 97,
				coder: Coder.U16,
			},
		},
		heightScale: {
			type: PType.Int,
			default: 128,
			coder: {
				op: 98,
				coder: Coder.U16,
			},
		},
		isVisible: {
			type: PType.Boolean,
			coder: {
				op: 99,
				coder: Coder.True,
			},
		},
		ambient: {
			type: PType.Int,
			coder: {
				op: 100,
				coder: Coder.I8,
			},
		},
		contrast: {
			type: PType.Int,
			coder: {
				op: 101,
				coder: Coder.I8,
			},
		},
		headIcon: {
			type: PType.Int,
			default: -1,
			coder: {
				op: 102,
				coder: Coder.U16,
			},
		},
		rotationSpeed: {
			type: PType.Int,
			default: 32,
			coder: {
				op: 103,
				coder: Coder.U16,
			},
		},
		varbit: {
			type: PType.VarbitID,
		},
		varp: {
			type: PType.VarPID,
		},
		multiChildren: {
			type: {
				inner: PType.NPCID,
			},
		},
		oobChild: {
			type: PType.NPCID,
		},
		isInteractible: {
			type: PType.Boolean,
			default: true,
			coder: {
				op: 107,
				coder: Coder.False,
			},
		},
		isClickable: {
			type: PType.Boolean,
			default: true,
			coder: {
				op: 109,
				coder: Coder.False,
			},
		},
		isPet: {
			type: PType.Boolean,
			coder: {
				op: 111,
				coder: Coder.True,
			},
		},
		runAnimation: {
			type: PType.AnimationID,
			coder: {
				op: 114,
				coder: Coder.U16,
			},
		},
		runRotate180Animation: {
			type: PType.AnimationID,
		},
		runRotateLeftAnimation: {
			type: PType.AnimationID,
		},
		runRotateRightAnimation: {
			type: PType.AnimationID,
		},
		crawlAnimation: {
			type: PType.AnimationID,
			coder: {
				op: 116,
				coder: Coder.U16,
			},
		},
		crawlRotate180Animation: {
			type: PType.AnimationID,
		},
		crawlRotateLeftAnimation: {
			type: PType.AnimationID,
		},
		crawlRotateRightAnimation: {
			type: PType.AnimationID,
		},
		params: {
			type: PType.Params,
			coder: {
				op: 249,
				coder: Coder.Params,
			},
		},
	},
	ops: {
		1: {
			coder: [{
				coder: Coder.U8,
				new: ["models"],
				inner: PType.ModelID,
				each: [{
					into: "models",
					coder: Coder.U16,
				}],
			}],
		},
		17: {
			coder: [{
				coder: Coder.U16,
				into: "walkingAnimation",
			}, {
				coder: Coder.U16,
				into: "rotate180Animation",
			}, {
				coder: Coder.U16,
				into: "rotateLeftAnimation",
			}, {
				coder: Coder.U16,
				into: "rotateRightAnimation",
			}],
		},
		...range(5, i => ({
			[30 + i]: {
				coder: [{
					into: ["actions", i],
					coder: Coder.StringNullHidden,
				}],
			},
		})),
		40: {
			coder: [{
				coder: Coder.U8,
				new: ["recolorFrom", "recolorTo"],
				inner: PType.HSL,
				each: [{
					into: "recolorFrom",
					coder: Coder.U16,
				}, {
					into: "recolorTo",
					coder: Coder.U16,
				}],
			}],
		},
		41: {
			coder: [{
				coder: Coder.U8,
				new: ["retextureFrom", "retextureTo"],
				inner: PType.TextureID,
				each: [{
					into: "retextureFrom",
					coder: Coder.U16,
				}, {
					into: "retextureTo",
					coder: Coder.U16,
				}],
			}],
		},
		60: {
			coder: [{
				coder: Coder.U8,
				new: ["chatheadModels"],
				inner: PType.ModelID,
				each: [{
					into: "chatheadModels",
					coder: Coder.U16,
				}],
			}],
		},
		106: {
			coder: [{
				into: "varbit",
				coder: Coder.U16n,
			}, {
				into: "varp",
				coder: Coder.U16n,
			}, {
				coder: Coder.U8p1,
				new: ["multiChildren"],
				inner: PType.HitsplatID,
				each: [{
					into: "multiChildren",
					coder: Coder.U16n,
				}],
			}],
		},
		118: {
			coder: [{
				into: "varbit",
				coder: Coder.U16n,
			}, {
				into: "varp",
				coder: Coder.U16n,
			}, {
				into: "oobChild",
				coder: Coder.U16n,
			}, {
				coder: Coder.U8p1,
				new: ["multiChildren"],
				inner: PType.HitsplatID,
				each: [{
					into: "multiChildren",
					coder: Coder.U16n,
				}],
			}],
		},
		115: {
			coder: [{
				coder: Coder.U16,
				into: "runAnimation",
			}, {
				coder: Coder.U16,
				into: "runRotate180Animation",
			}, {
				coder: Coder.U16,
				into: "runRotateLeftAnimation",
			}, {
				coder: Coder.U16,
				into: "runRotateRightAnimation",
			}],
		},
		117: {
			coder: [{
				coder: Coder.U16,
				into: "crawlAnimation",
			}, {
				coder: Coder.U16,
				into: "crawlRotate180Animation",
			}, {
				coder: Coder.U16,
				into: "crawlRotateLeftAnimation",
			}, {
				coder: Coder.U16,
				into: "crawlRotateRightAnimation",
			}],
		},
	},
});
