import { gunzipSync } from "fflate";
import * as bz2 from "./bz2.js";
import { Reader } from "./Reader.js";
import { CompressionType, XTEAKey } from "./types.js";
import { decryptXTEA, XTEAKeyManager } from "./xtea.js";

export interface CacheProvider {
	getIndex(index: number): Promise<IndexData | undefined>;
	getArchive(index: number, archive: number): Promise<ArchiveData | undefined>;
	getArchiveByName(index: number, name: string | number): Promise<ArchiveData | undefined>;
	getArchives(index: number): Promise<number[] | undefined>;
	getVersion(index: number): Promise<CacheVersion>;
	getKeys?(): Promise<XTEAKeyManager>;
}

export interface FileProvider {
	getFile(name: string): Promise<Uint8Array | undefined>;
}

export interface IndexData {
	id: number;
	protocol?: number;
	revision: number;
	compression: number;
	crc: number;
	named: boolean;
}

export class ArchiveFile {
	public data!: Uint8Array;

	public constructor(
		public readonly id: number,
		public readonly namehash: number,
	) {
	}
}

export class ArchiveData {
	public constructor(
		public readonly index: number,
		public readonly archive: number,
	) {
	}

	public compressedData!: Uint8Array;
	public namehash!: number;
	public revision!: number;
	public crc!: number;

	/**@internal*/ files: Map<number, ArchiveFile> = new Map();

	public key: XTEAKey | undefined;

	/**@internal*/ decryptedData: Uint8Array | undefined;

	public maxFile = 0;

	/**@internal*/ addFile(id: number, nameHash: number) {
		this.maxFile = Math.max(id, this.maxFile);
		this.files.set(id, new ArchiveFile(id, nameHash));
	}

	public get compression() {
		return this.compressedData[0] as CompressionType;
	}

	/**@internal*/ getCryptedBlob(): Uint8Array {
		let dv = Reader.makeViewOf(DataView, this.compressedData);
		let cLen = dv.getInt32(1);
		return this.compressedData.subarray(5, 5 + cLen + (this.compression == CompressionType.NONE ? 0 : 4));
	}

	getDecryptedData(): Uint8Array {
		if (this.decryptedData) {
			return this.decryptedData;
		}

		let mode = this.compression;
		let data = this.getCryptedBlob();
		if (this.key) {
			data = decryptXTEA(data, this.key);
		}

		if (mode == CompressionType.NONE) {
			// noop
		} else if (mode == CompressionType.BZ2) {
			let outLen = Reader.makeViewOf(DataView, data).getUint32(0);
			let inData = data.subarray(4);
			data = bz2.decompress(inData, 1, outLen);
		} else if (mode == CompressionType.GZIP) {
			let inData = data.subarray(4);
			data = gunzipSync(inData);
		} else {
			throw new Error(`unsupported compression ${mode}`);
		}

		this.decryptedData = data;

		if (this.maxFile == 0) {
			this.files.get(0)!.data = data;
		} else {
			let fileCount = this.files.size;
			let dv = Reader.makeViewOf(DataView, data);
			let numChunks = dv.getUint8(dv.byteLength - 1);

			let off = dv.byteLength - 1 - numChunks * fileCount * 4;
			let doff = data.byteOffset;

			if (numChunks == 1) {
				let size = 0;
				for (let file of this.files.values()) {
					size += dv.getInt32(off);
					off += 4;
					file.data = data.subarray(doff, doff + size);
					doff += size;
				}
			} else {
				let sizeStride = numChunks + 1;
				let sizes = new Uint32Array(sizeStride * fileCount);
				for (let ch = 0; ch < numChunks; ch++) {
					let size = 0;
					for (let id = 0; id < fileCount; id++) {
						size += dv.getInt32(off);
						off += 4;
						let soff = id * sizeStride;
						sizes[soff] += size;
						sizes[soff + 1 + ch] = size;
					}
				}

				let fileData: Uint8Array[] = [];
				for (let file of this.files.values()) {
					let soff = fileData.length * sizeStride;
					fileData.push(file.data = new Uint8Array(sizes[soff]));
					sizes[soff] = 0;
				}

				for (let ch = 0; ch < numChunks; ch++) {
					for (let id = 0; id < fileCount; id++) {
						let soff = id * sizeStride;
						let cSize = sizes[soff + 1 + ch];
						let start = sizes[soff];
						fileData[id].set(data.subarray(doff, doff + cSize), start);
						sizes[soff] = start + cSize;
						doff += cSize;
					}
				}
			}
		}

		return data;
	}

	getFile(id: number): ArchiveFile | undefined {
		this.getDecryptedData();
		return this.files.get(id);
	}

	getFiles(): Map<number, ArchiveFile> {
		this.getDecryptedData();
		return this.files;
	}
}

export function hash(name: string | number): number {
	if (typeof name === "number") {
		return name;
	}

	let bytes = new TextEncoder().encode(name);
	let h = 0;
	for (let v of bytes) {
		h = ~~((31 * h) + (v & 0xFF));
	}
	return h;
}

export interface CacheVersion {
	era: "osrs";
	indexRevision: number;
}
export namespace CacheVersion {
	export function isAfter(prev: CacheVersion | undefined, after: CacheVersion): boolean {
		if (prev === undefined) {
			return true;
		}
		if (prev.era == after.era) {
			return prev.indexRevision > after.indexRevision;
		}
		return false;
	}
}
