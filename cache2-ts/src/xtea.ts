import { ArchiveData } from "./Cache";
import { Reader } from "./Reader";
import { CompressionType, XTEAKey } from "./types";

const ROUNDS = 32;
const GOLDEN = 0x9E3779B9;
const IV = ~~(ROUNDS * GOLDEN);

export function decryptXTEA(data: Uint8Array, key: XTEAKey): Uint8Array {
	if (key.length != 4) {
		throw new Error("invalid key " + key);
	}

	const k = new Uint32Array(key);
	const d = new DataView(data.buffer, data.byteOffset, (~~(data.byteLength / 8)) * 8);
	let out = new Uint8Array(data.byteLength);
	let outdv = Reader.makeViewOf(DataView, out);

	for (let o = 0; o < d.byteLength; o += 8) {
		let v0 = d.getInt32(o);
		let v1 = d.getInt32(o + 4);
		let sum = IV;
		for (let r = 0; r < ROUNDS; r++) {
			v1 = ~~(v1 - ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum >>> 11) & 3])));
			sum -= GOLDEN;
			v0 = ~~(v0 - ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3])));
		}
		outdv.setInt32(o, v0);
		outdv.setInt32(o + 4, v1);
	}

	for (let o = d.byteLength; o < data.byteLength; o++) {
		out[o] = data[o];
	}

	return out;
}

function decryptXTEABlock(input: Int32Array, out: Int32Array, k: Int32Array, kIndex: number) {
	let v0 = input[0];
	let v1 = input[1];
	let sum = IV;
	for (let r = 0; r < ROUNDS; r++) {
		v1 = ~~(v1 - ((((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[kIndex + ((sum >>> 11) & 3)])));
		sum -= GOLDEN;
		v0 = ~~(v0 - ((((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[kIndex + (sum & 3)])));
	}
	out[0] = v0;
	out[1] = v1;
}

function compareKey(a: Int32Array, ai: number, b: XTEAKey): number {
	for (let i = 0; i < 4; i++) {
		let d = (b[i] >>> 0) - (a[ai + i] >>> 0);
		if (d != 0) {
			return d;
		}
	}
	return 0;
}

// This is so stupid. JS Set cannot hold non primitives, and packing the keys
// into a bigint means we spend ~50% of tryDecrypt unpacking it, and another 20%
// in Set's next
class KeySet {
	length = 0;
	bits: number;
	data: Int32Array;

	constructor(expectedSize = 8) {
		this.bits = Math.max(3, ~~Math.log2(expectedSize));
		this.data = new Int32Array(4 << this.bits);
	}

	add(key: XTEAKey): boolean {
		if (this.length >= this.data.length * .75) {
			this.grow();
		}

		if (key[0] === 0 && key[1] === 0 && key[2] === 0 && key[3] === 0) {
			return false;
		}

		let data = this.data;

		let index = (key[0] >>> (32 - this.bits)) * 4;
		for (;;) {
			if (data[index] === 0 && data[index + 1] === 0 && data[index + 2] === 0 && data[index + 3] === 0) {
				this.data.set(key, index);
				this.length += 4;
				return true;
			}
			let d = compareKey(data, index, key);
			if (d == 0) {
				return false;
			}
			if (d < 0) {
				let next = [
					this.data[index],
					this.data[index + 1],
					this.data[index + 2],
					this.data[index + 3],
				] satisfies XTEAKey;
				this.data.set(key, index);
				key = next;
			}

			index = (index + 4) & (this.data.length - 1);
		}
	}

	grow(): void {
		let old = this.data;
		let it = this.iterator();
		this.bits++;
		this.data = new Int32Array(4 << this.bits);
		this.length = 0;

		for (let index: number; (index = it()) != -1;) {
			this.add([old[index], old[index + 1], old[index + 2], old[index + 3]]);
		}
	}

	iterator(): () => number {
		let checkAll = true;
		let index = -4;
		let data = this.data;
		return () => {
			for (;;) {
				index += 4;
				if (index >= data.length) {
					return -1;
				}
				if (data[index] === 0) {
					if (!checkAll || (data[index + 1] === 0 && data[index + 2] === 0 && data[index + 3] === 0)) {
						continue;
					}
				} else {
					checkAll = false;
				}
				return index;
			}
		};
	}
}

export class XTEAKeyManager {
	public unknownKeys = new KeySet();
	public keysByMapSquare = new Map<number, KeySet>();
	public allKeys = new KeySet();
	constructor() {
	}

	public loadKeys(document: any): number {
		if (typeof document !== "object") {
			throw new Error(`document must be an object or array, not ${typeof document}`);
		}

		let count = 0;

		if (Array.isArray(document)) {
			for (let item of document) {
				if (typeof item !== "object") {
					throw new Error(`document must contain objects or keys, not ${typeof item}`);
				}
				if (Array.isArray(item)) {
					// OpenRS2 all key list
					// XTEAKey[]
					this.unknownKeys.add(item as XTEAKey);
					if (this.allKeys.add(item as XTEAKey)) {
						count++;
					}
				} else {
					// OpenRS2 per cache key list
					// also matches polar/runestats
					// {mapsquare: packed region id, key: XTEAKey}[]
					// RuneLite xtea service
					// {region: packed region id, keys: XTEAKey}[]
					let key = item.key ?? item.keys;
					let mapsquare = item.mapsquare ?? item.region;
					if (key === undefined || mapsquare === undefined) {
						throw new Error(`document must contain key & mapsquare/region, not ${JSON.stringify(item)}`);
					}
					if (this.putKeyForMapsquare(mapsquare, key)) {
						count++;
					}
				}
			}
		} else {
			for (let [mapsq, item] of Object.entries(document)) {
				if (Array.isArray(item)) {
					// RuneLite xtea cache
					// {packed region id: XTEAKey}
					if (this.putKeyForMapsquare(~~mapsq, item as XTEAKey)) {
						count++;
					}
				} else {
					throw new Error(`document must contain keys, not ${JSON.stringify(item)}`);
				}
			}
		}

		return count;
	}

	private putKeyForMapsquare(mapsquare: number, key: XTEAKey): boolean {
		let set = this.keysByMapSquare.get(mapsquare);
		if (!set) {
			set = new KeySet();
			this.keysByMapSquare.set(mapsquare, set);
		}
		set.add(key);
		return this.allKeys.add(key);
	}

	public tryDecrypt(ad: ArchiveData, region?: number): Error | undefined {
		if (this.allKeys.length <= 0) {
			return new Error(`No keys added`);
		}

		if (ad.decryptedData) {
			return;
		}

		let crypted = ad.getCryptedBlob();
		if (crypted.length < 8) {
			// last block is not encrypted
			return;
		}

		let keys = [undefined, this.allKeys];
		if (region) {
			let ikeys = this.keysByMapSquare.get(region);
			if (ikeys) {
				keys = [undefined, ikeys, this.unknownKeys];
			} else {
				keys = [undefined, this.unknownKeys];
			}
		}

		let firstBlock = new Int32Array(2);
		{
			let dv = Reader.makeViewOf(DataView, crypted);
			firstBlock[0] = dv.getInt32(0);
			firstBlock[1] = dv.getInt32(4);
		}
		let decrypted = Int32Array.from(firstBlock);

		let compression = ad.compression;
		let error: any;

		let hitUndefined = 0;
		for (let keyset of keys) {
			let data = keyset?.data;
			let iterator = keyset?.iterator() ?? (() => hitUndefined++ === 0 ? 0 : -1);
			for (let index: number; (index = iterator()) != -1;) {
				if (data) {
					decryptXTEABlock(firstBlock, decrypted, data, index);
				}

				if (compression === CompressionType.GZIP) {
					if (decrypted[1] != 0x1f8b0800) {
						// not the right header, can discard now
						continue;
					}
				}

				try {
					ad.key = data ? Array.from(data.subarray(index, index + 4)) as XTEAKey : undefined;
					ad.getDecryptedData();
					return undefined;
				} catch (e) {
					ad.key = undefined;
					if (!error) {
						error = e;
					}
				}
			}
		}

		return error
			? new Error(`no matching keys (${error})`, { cause: error })
			: new Error(`no matching keys`);
	}
}
