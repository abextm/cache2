import { Coder, PType } from "../def";
import { buildConfig } from "../setupDef";

export const config = buildConfig({
	name: "Hitsplat",
	archiveID: 32,
	fields: {
		font: {
			type: PType.FontID,
			coder: {
				op: 1,
				coder: Coder.S2o4n,
			},
		},
		fontColor: {
			type: PType.RGB,
			default: 0xFFFFFF,
			coder: {
				op: 2,
				coder: Coder.U24,
			},
		},
		leftSprite: {
			type: PType.SpriteID,
			coder: {
				op: 3,
				coder: Coder.S2o4n,
			},
		},
		leftSprite2: {
			type: PType.SpriteID,
			coder: {
				op: 4,
				coder: Coder.S2o4n,
			},
		},
		backgroundSprite: {
			type: PType.SpriteID,
			coder: {
				op: 5,
				coder: Coder.S2o4n,
			},
		},
		rightSprite: {
			type: PType.SpriteID,
			coder: {
				op: 6,
				coder: Coder.S2o4n,
			},
		},
		animX: {
			type: PType.Int,
			coder: {
				op: 7,
				coder: Coder.I16,
			},
		},
		animY: {
			type: PType.Int,
			coder: {
				op: 10,
				coder: Coder.I16,
			},
		},
		animStart: {
			type: PType.Int,
			default: -1,
			coder: {
				op: 14,
				coder: Coder.U16,
			},
		},
		animDuration: {
			type: PType.Int,
			coder: {
				op: 9,
				coder: Coder.U16,
			},
		},
		animMode: {
			type: PType.Int,
			coder: {
				op: 12,
				coder: Coder.U8,
			},
		},
		formatString: {
			type: PType.String,
			coder: {
				op: 8,
				coder: Coder.VString,
			},
		},
		textY: {
			type: PType.Int,
			coder: {
				op: 13,
				coder: Coder.I16,
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
				inner: PType.HitsplatID,
			},
		},
		oobChild: {
			type: PType.HitsplatID,
		},
	},
	ops: {
		11: {
			coder: [{
				into: "animStart",
				coder: Coder.Zero,
			}],
		},
		17: {
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
		18: {
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
	},
});
