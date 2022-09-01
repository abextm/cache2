import { XTEAKey } from "./types";

export function decryptXTEA(data: Uint8Array, key: XTEAKey | undefined) {
	if (!key) {
		return;
	}
	if (key.length != 4) {
		throw new Error("invalid key " + key);
	}

	const ROUNDS = 32;
	const GOLDEN = 0x9E3779B9;
	const iv = ~~(ROUNDS * GOLDEN);

	const k = new Uint32Array(key);
	const d = new Uint32Array(data.buffer, data.byteOffset, (~~(data.byteLength / 8)) * 2);

	for (let o = 0; o < d.length; o += 2) {
		let v0 = d[o];
		let v1 = d[o + 1];
		let sum = iv;
		for (let r = 0; r < ROUNDS; r++) {
			v1 = ~~(v1 - (((v0 << 4) ^ (v0 >>> 5)) + v0) ^ (sum + k[(sum >>> 11) & 3]));
			sum -= GOLDEN;
			v0 = ~~(v0 - (((v1 << 4) ^ (v1 >>> 5)) + v1) ^ (sum + k[sum & 3]));
		}
		d[o] = v0;
		d[o + 1] = v1;
	}
}
