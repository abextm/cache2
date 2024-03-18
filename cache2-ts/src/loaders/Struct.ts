import { PerFileLoadable } from "../Loadable.js";
import { Reader } from "../Reader.js";
import { Typed } from "../reflect.js";
import { Params, StructID } from "../types.js";

export class Struct extends PerFileLoadable {
	constructor(public id: StructID) {
		super();
	}

	declare public [Typed.type]: Typed.Any;

	public static readonly index = 2;
	public static readonly archive = 34;

	public params = new Params();

	public static decode(r: Reader, id: StructID): Struct {
		const v = new Struct(id);
		for (let opcode: number; (opcode = r.u8()) != 0;) {
			switch (opcode) {
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
