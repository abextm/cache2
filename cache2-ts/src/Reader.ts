import * as def from "./def";

const cp1252CharMap: string[] = (() => {
	const ext = "€?‚ƒ„…†‡ˆ‰Š‹Œ?Ž??‘’“”•–—˜™š›œ?žŸ";
	let out = new Array(256);
	for (let i = 0; i < out.length; i++) {
		let v;
		let ei = i - 128;
		if (ei > 0 && ei < ext.length) {
			v = ext.charAt(ei);
		} else {
			v = String.fromCodePoint(i);
		}
		out[i] = v;
	}
	return out;
})();

export class Reader {
	private readonly view: DataView;
	public offset = 0;

	get buffer(): ArrayBuffer {
		return this.view.buffer;
	}

	get length(): number {
		return this.view.byteLength;
	}

	get remaining(): number {
		return this.length - this.offset;
	}
	set remaining(v: number) {
		this.offset = this.length - v;
	}

	public constructor(view: ArrayBufferView | ArrayBuffer) {
		if (view instanceof DataView) {
			this.view = view;
		} else if (ArrayBuffer.isView(view)) {
			this.view = new DataView(view.buffer, view.byteOffset, view.byteLength);
		} else {
			this.view = new DataView(view);
		}
	}

	public fixmeclone(offset = 0) {
		return new Reader(new DataView(this.view.buffer, this.view.byteOffset + offset, this.view.byteLength - offset));
	}

	private bump(delta: number): number {
		let r = this.offset;
		this.offset += delta;
		return r;
	}

	public subreader(length: number): Reader {
		let start = this.bump(length);
		return new Reader(new DataView(this.view.buffer, this.view.byteOffset + start, length));
	}

	public array(length: number): Uint8Array {
		let start = this.bump(length);
		return new Uint8Array(this.view.buffer, this.view.byteOffset + start, length);
	}

	public [def.Coder.U8](): number {
		return this.view.getUint8(this.bump(1));
	}
	public [def.Coder.U8p1](): number {
		return this.u8() + 1;
	}
	public [def.Coder.I8](): number {
		return this.view.getInt8(this.bump(1));
	}
	public [def.Coder.U16](): number {
		return this.view.getUint16(this.bump(2));
	}
	public [def.Coder.U16n](): number {
		let v = this.view.getUint16(this.bump(2));
		return v == 0xFFFF ? -1 : v;
	}
	public [def.Coder.I16](): number {
		return this.view.getInt16(this.bump(2));
	}
	public [def.Coder.U24](): number {
		let off = this.bump(3);
		return (this.view.getUint8(off) << 16) | this.view.getUint16(off + 1);
	}
	public [def.Coder.I32](): number {
		return this.view.getInt32(this.bump(4));
	}
	public [def.Coder.S2o4n](): number {
		if (this.view.getUint8(this.offset) & 0x80) {
			return this.i32() & (-1 >>> 1);
		} else {
			return this.u16n();
		}
	}
	public [def.Coder.True](): boolean {
		return true;
	}
	public [def.Coder.False](): boolean {
		return false;
	}
	public [def.Coder.Zero](): number {
		return 0;
	}
	public [def.Coder.String](): string {
		let s = "";
		for (let c: number; (c = this.u8()) != 0;) {
			s += cp1252CharMap[c];
		}
		return s;
	}
	public [def.Coder.VString](): string {
		if (this.u8() != 0) {
			throw new Error("invalid string");
		}
		return this.string();
	}
	public [def.Coder.StringNullHidden](): string | null {
		let s = this.string();
		if (s == "hidden") {
			return null;
		}
		return s;
	}
	public [def.Coder.Params](): Map<number, string | number> {
		let count = this.u8();
		let out = new Map<number, string | number>();

		for (let i = 0; i < count; i++) {
			let type = this.u8();
			let param = this.u24();
			switch (type) {
				case 0:
					out.set(param, this.i32());
					break;
				case 1:
					out.set(param, this.string());
					break;
				default:
					throw new Error(`invalid type in param table ${type}`);
			}
		}

		return out;
	}
	public u32o16(): number {
		if (this.view.getUint8(this.offset) & 0x80) {
			return this.u16();
		} else {
			return this.i32() & (-1 >>> 1);
		}
	}
}
