import { Coder, PType } from "../def";
import { buildConfig, range } from "../setupDef";

export const config = buildConfig({
	name: "Item",
	archiveID: 10,
	indexName: "obj.idx",
	dataName: "obj.dat",
	fields: {
		inventoryModel: {
			type: PType.ModelID,
			coder: {
				op: 1,
				coder: Coder.U16,
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
		examine: {
			type: PType.String,
			coder: {
				op: 3,
				lastRev: "rs377", // disappeared somewhere between rs377 and osrs180
				coder: Coder.String,
			},
		},
		zoom2d: {
			type: PType.Int,
			default: 2000,
			coder: {
				op: 4,
				coder: Coder.U16,
			},
		},
		xan2d: {
			type: PType.Int,
			coder: {
				op: 5,
				coder: Coder.U16,
			},
		},
		yan2d: {
			type: PType.Int,
			coder: {
				op: 6,
				coder: Coder.U16,
			},
		},
		offsetX2d: {
			type: PType.Int,
			coder: {
				op: 7,
				coder: Coder.I16,
			},
		},
		offsetY2d: {
			type: PType.Int,
			coder: {
				op: 8,
				coder: Coder.I16,
			},
		},
		isStackable: {
			type: PType.Boolean,
			coder: {
				op: 11,
				coder: Coder.True,
			},
		},
		price: {
			type: PType.Int,
			default: 1,
			coder: {
				op: 12,
				coder: Coder.I32,
			},
		},
		isMembers: {
			type: PType.Boolean,
			coder: {
				op: 16,
				coder: Coder.True,
			},
		},
		maleModel: {
			type: PType.ModelID,
		},
		maleOffset: {
			type: PType.Int,
		},
		maleModel1: {
			type: PType.ModelID,
			coder: {
				op: 24,
				coder: Coder.U16,
			},
		},
		femaleModel: {
			type: PType.ModelID,
		},
		femaleOffset: {
			type: PType.Int,
		},
		femaleModel1: {
			type: PType.ModelID,
			coder: {
				op: 26,
				coder: Coder.U16,
			},
		},
		groundActions: {
			default: [null, null, "Take", null, null],
			type: {
				inner: PType.String,
			},
		},
		inventoryActions: {
			default: [null, null, null, null, "Drop"],
			type: {
				inner: PType.String,
			},
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
		shiftClickIndex: {
			type: PType.Int,
			default: -2,
			coder: {
				op: 42,
				coder: Coder.U8,
			},
		},
		isGrandExchangable: {
			type: PType.Boolean,
			coder: {
				op: 65,
				coder: Coder.True,
			},
		},
		maleModel2: {
			type: PType.ModelID,
			coder: {
				op: 78,
				coder: Coder.U16,
			},
		},
		femaleModel2: {
			type: PType.ModelID,
			coder: {
				op: 79,
				coder: Coder.U16,
			},
		},
		maleChatheadModel: {
			type: PType.ModelID,
			coder: {
				op: 90,
				coder: Coder.U16,
			},
		},
		femaleChatheadModel: {
			type: PType.ModelID,
			coder: {
				op: 91,
				coder: Coder.U16,
			},
		},
		maleChatheadModel2: {
			type: PType.ModelID,
			coder: {
				op: 92,
				coder: Coder.U16,
			},
		},
		femaleChatheadModel2: {
			type: PType.ModelID,
			coder: {
				op: 93,
				coder: Coder.U16,
			},
		},
		category: {
			type: PType.CategoryID,
			coder: {
				op: 94,
				coder: Coder.U16,
			},
		},
		zan2d: {
			type: PType.Int,
			coder: {
				op: 95,
				coder: Coder.U16,
			},
		},
		noteLinkedItem: {
			type: PType.ItemID,
			coder: {
				op: 97,
				coder: Coder.U16,
			},
		},
		noteTemplate: {
			type: PType.ItemID,
			coder: {
				op: 98,
				coder: Coder.U16,
			},
		},
		stackVariantItems: {
			type: {
				inner: PType.ItemID,
			},
			default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		},
		stackVariantQuantities: {
			type: {
				inner: PType.Int,
			},
			default: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		},
		resizeX: {
			type: PType.Int,
			default: 128,
			coder: {
				op: 110,
				coder: Coder.U16,
			},
		},
		resizeY: {
			type: PType.Int,
			default: 128,
			coder: {
				op: 111,
				coder: Coder.U16,
			},
		},
		resizeZ: {
			type: PType.Int,
			default: 128,
			coder: {
				op: 112,
				coder: Coder.U16,
			},
		},
		ambient: {
			type: PType.Int,
			coder: {
				op: 113,
				coder: Coder.I8,
			},
		},
		contrast: {
			type: PType.Int,
			coder: {
				op: 114,
				coder: Coder.I8,
			},
		},
		team: {
			type: PType.Int,
			coder: {
				op: 115,
				coder: Coder.I8,
			},
		},
		noted2: {
			type: PType.ItemID,
			coder: {
				op: 139,
				coder: Coder.U16,
			},
		},
		noted3: {
			type: PType.ItemID,
			coder: {
				op: 140,
				coder: Coder.U16,
			},
		},
		placeholderLinkedItem: {
			type: PType.ItemID,
			coder: {
				op: 148,
				coder: Coder.U16,
			},
		},
		placeholderTemplate: {
			type: PType.ItemID,
			coder: {
				op: 149,
				coder: Coder.U16,
			},
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
		23: {
			coder: [{
				into: "maleModel",
				coder: Coder.U16,
			}, {
				into: "maleOffset",
				coder: Coder.U8,
			}],
		},
		25: {
			coder: [{
				into: "femaleModel",
				coder: Coder.U16,
			}, {
				into: "femaleOffset",
				coder: Coder.U8,
			}],
		},
		...range(5, i => ({
			[30 + i]: {
				coder: [{
					into: ["groundActions", i],
					coder: Coder.StringNullHidden,
				}],
			},
		})),
		...range(5, i => ({
			[35 + i]: {
				coder: [{
					into: ["inventoryActions", i],
					coder: Coder.String,
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
		...range(10, i => ({
			[100 + i]: {
				coder: [{
					into: ["stackVariantItems", i],
					coder: Coder.U16,
				}, {
					into: ["stackVariantQuantities", i],
					coder: Coder.U16,
				}],
			},
		})),
	},
});
