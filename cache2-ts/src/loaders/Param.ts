import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { ParamID, ScriptVarChar } from "../types.js";

export class Param extends PerFileLoadable {
	constructor(public id: ParamID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 11;

	public type = 0 as ScriptVarChar;
	public isMembers = true;
	public defaultInt = 0;
	public defaultString: string | null = null;

	public static decode(r: Reader, id: ParamID): Param {
		const v = new Param(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
				case 1:
					v.type = r.u8() as ScriptVarChar;
					break;
				case 2:
					v.defaultInt = r.i32();
					break;
				case 4:
					v.isMembers = false;
					break;
				case 5:
					v.defaultString = r.string();
					break;
				default:
					throw new Error(`unknown opcode ${opcode}`);
			}
		}
		return v;
	}
}
