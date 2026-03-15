import { Reader } from "../Reader.js";
import { VarbitID, VarPID } from "../types.js";

export interface EntityOp {
	text: string | null;
	conditionals?: ConditionalOp[];
	subs?: EntityOps;
}

export interface ConditionalOp {
	text: string;

	varp?: VarPID;
	varbit?: VarbitID;

	min: number;
	max: number;
}

export class EntityOps extends Map<number, EntityOp> {
	public decodeOp(r: Reader, opID: number): void {
		let op = this.getOrCreate(opID);
		op.text = r.stringNullHidden();
	}

	public decodeSubOp(r: Reader): void {
		let op = this.getOrCreate(r.u8(), r.u8());
		op.text = r.string();
	}

	public decodeConditionalOp(r: Reader): void {
		let op = this.getOrCreate(r.u8());
		let varp = r.u16();
		let varbit = r.u16();
		let cop: ConditionalOp = {
			min: r.i32(),
			max: r.i32(),
			text: r.string(),
		};
		if (varp != 0xFFFF) {
			cop.varp = varp as VarPID;
		}
		if (varbit != 0xFFFF) {
			cop.varbit = varbit as VarbitID;
		}
		(op.conditionals ??= []).push(cop);
	}

	public decodeConditionalSubOp(r: Reader): void {
		let op = this.getOrCreate(r.u8(), r.u16());
		let varp = r.u16();
		let varbit = r.u16();
		let cop: ConditionalOp = {
			min: r.i32(),
			max: r.i32(),
			text: r.string(),
		};
		if (varp != 0xFFFF) {
			cop.varp = varp as VarPID;
		}
		if (varbit != 0xFFFF) {
			cop.varbit = varbit as VarbitID;
		}
		(op.conditionals ??= []).push(cop);
	}

	public getOrCreate(index: number, subIndex?: number): EntityOp {
		let v = this.get(index);
		if (!v) {
			this.set(index, v = {} as any);
		}
		if (subIndex == null) {
			return v!;
		}
		return (v!.subs ??= new EntityOps())
			.getOrCreate(subIndex);
	}
}
