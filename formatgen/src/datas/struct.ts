import { Coder, PType } from "../def";
import { buildConfig } from "../setupDef";

export const config = buildConfig({
	name: "Struct",
	archiveID: 34,
	fields: {
		params: {
			type: PType.Params,
			coder: {
				op: 249,
				coder: Coder.Params,
			},
		},
	},
	ops: {},
});
