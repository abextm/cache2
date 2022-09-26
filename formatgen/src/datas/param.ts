import { Coder, PType } from "../def";
import { buildConfig } from "../setupDef";

export const config = buildConfig({
	name: "Param",
	archiveID: 11,
	fields: {
		type: {
			type: PType.ScriptVarChar,
			coder: {
				op: 1,
				coder: Coder.U8,
			},
		},
		isMembers: {
			type: PType.Boolean,
			default: true,
			coder: {
				op: 4,
				coder: Coder.False,
			},
		},
		defaultInt: {
			type: PType.Int,
			coder: {
				op: 2,
				coder: Coder.I32,
			},
		},
		defaultString: {
			type: PType.String,
			coder: {
				op: 5,
				coder: Coder.String,
			},
		},
	},
	ops: {},
});
