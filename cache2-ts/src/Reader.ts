import { CacheVersion } from "./Cache.js";
import { ParamID, Params } from "./types.js";

export const cp1252CharMap: string[] = (() => {
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

	public static makeViewOf<V>(
		typ: new(buffer: ArrayBuffer, byteOffset: number, byteLength: number) => V,
		view: ArrayBufferView | ArrayBuffer | DataView,
	): V {
		if (view instanceof typ) {
			return view;
		}
		if (view instanceof ArrayBuffer) {
			return new typ(view, 0, view.byteLength);
		}
		return new typ(view.buffer, view.byteOffset, view.byteLength);
	}

	public constructor(view: ArrayBufferView | ArrayBuffer, public version?: CacheVersion | undefined) {
		this.view = Reader.makeViewOf(DataView, view);
	}

	private bump(delta: number): number {
		let r = this.offset;
		this.offset += delta;
		return r;
	}

	public subreader(length: number): Reader {
		let start = this.bump(length);
		return new Reader(new DataView(this.view.buffer, this.view.byteOffset + start, length), this.version);
	}

	public array(length: number): Uint8Array {
		let start = this.bump(length);
		return new Uint8Array(this.view.buffer, this.view.byteOffset + start, length);
	}

	public isAfter(ver: CacheVersion): boolean {
		return CacheVersion.isAfter(this.version, ver);
	}

	public u8(): number {
		return this.view.getUint8(this.bump(1));
	}
	public u8p1(): number {
		return this.u8() + 1;
	}
	public i8(): number {
		return this.view.getInt8(this.bump(1));
	}
	public u16(): number {
		return this.view.getUint16(this.bump(2));
	}
	public u16n(): number {
		let v = this.view.getUint16(this.bump(2));
		return v == 0xFFFF ? -1 : v;
	}
	public i16(): number {
		return this.view.getInt16(this.bump(2));
	}
	public u8o16(): number { // rl getUSmart
		if (this.view.getUint8(this.offset) < 128) {
			return this.u8();
		} else {
			return this.u16() - 0x8000;
		}
	}
	public u8o16m1(): number { // rl readUnsignedShortSmartMinusOne
		if (this.view.getUint8(this.offset) < 128) {
			return this.u8() - 1;
		} else {
			return this.u16() - 0x8001;
		}
	}
	public u24(): number {
		let off = this.bump(3);
		return (this.view.getUint8(off) << 16) | this.view.getUint16(off + 1);
	}
	public i32(): number {
		return this.view.getInt32(this.bump(4));
	}
	public s2o4n(): number { // rl BigSmart2
		if (this.view.getUint8(this.offset) & 0x80) {
			return this.i32() & (-1 >>> 1);
		} else {
			return this.u16n();
		}
	}
	public i64(): bigint {
		return this.view.getBigInt64(this.bump(8));
	}
	public string(): string {
		let s = "";
		for (let c: number; (c = this.u8()) != 0;) {
			s += cp1252CharMap[c];
		}
		return s;
	}
	public vString(): string {
		if (this.u8() != 0) {
			throw new Error("invalid string");
		}
		return this.string();
	}
	public stringNullHidden(): string | null {
		let s = this.string();
		if (s == "hidden") {
			return null;
		}
		return s;
	}
	public params(): Params {
		let count = this.u8();
		let out = new Params();

		for (let i = 0; i < count; i++) {
			let type = this.u8();
			let param = this.u24();
			switch (type) {
				case 0:
					out.set(param as ParamID, this.i32());
					break;
				case 1:
					out.set(param as ParamID, this.string());
					break;
				default:
					throw new Error(`invalid type in param table ${type}`);
			}
		}

		return out;
	}
	public u32o16(): number { // rl BigSmart
		if (this.view.getUint8(this.offset) & 0x80) {
			return this.u16();
		} else {
			return this.i32() & (-1 >>> 1);
		}
	}
	public leVarInt(): number { // rl LEVarInt
		let v = 0;
		let shift = 0;
		let octet;
		do {
			octet = this.u8();
			v |= (octet & 127) << shift;
			shift += 7;
		} while (octet > 127);

		return v;
	}
}
