import { ArchiveData, CacheProvider, CacheVersion, FileProvider, hash, IndexData } from "./Cache.js";
import { Reader } from "./Reader.js";

export class DiskIndexData implements IndexData {
	public id!: number;
	public protocol!: number;
	public revision!: number;
	public compression!: number;
	public crc!: number;
	public named!: boolean;
	/** @internal */ archives: Map<number, ArchiveData> = new Map();
}

export class DiskCacheProvider implements CacheProvider {
	private data: Promise<Uint8Array | undefined>;
	private indexData: Map<number, Promise<DiskIndexData | undefined>> = new Map();
	private pointers: Map<number, Promise<Reader | undefined>> = new Map();

	public constructor(private readonly disk: FileProvider) {
		this.data = disk.getFile("main_file_cache.dat2");
		this.getPointers(255);
	}

	public async getIndex(index: number): Promise<DiskIndexData | undefined> {
		let id = this.indexData.get(index);
		if (!id) {
			this.indexData.set(
				index,
				id = (async () => {
					let cdata = await this.getArchiveRaw(255, index);
					if (!cdata) {
						return undefined;
					}
					let ad = new ArchiveData(255, index);
					ad.addFile(0, 0);
					ad.compressedData = cdata;
					let r = new Reader(ad.getFile(0)!.data);

					let out = new DiskIndexData();
					out.id = index;
					let protocol = out.protocol = r.u8();
					out.revision = protocol >= 6 ? r.i32() : -1;

					let flags = r.u8();
					let named = out.named = !!(flags & 1);

					let numArchives = protocol <= 6 ? r.u16() : r.u32o16();
					let ams: ArchiveData[] = new Array(numArchives);
					for (let i = 0, id = 0; i < numArchives; i++) {
						id += protocol <= 6 ? r.u16() : r.u32o16();
						let v = new ArchiveData(index, id);
						ams[i] = v;
						out.archives.set(id, v);
					}

					if (named) {
						for (let am of ams) {
							am.namehash = r.i32();
						}
					}
					for (let am of ams) {
						am.crc = r.i32();
					}
					for (let am of ams) {
						am.revision = r.i32();
					}

					let numFileses = new Uint32Array(ams.length);
					for (let i = 0; i < numArchives; i++) {
						numFileses[i] = protocol <= 6 ? r.u16() : r.u32o16();
					}

					for (let i = 0; i < numArchives; i++) {
						let am = ams[i];
						let numFiles = numFileses[i];
						let id = 0;
						for (let i = 0; i < numFiles; i++) {
							id += protocol <= 6 ? r.u16() : r.u32o16();
							am.addFile(id, 0);
						}
					}

					if (named) {
						for (let am of ams) {
							for (let file of am.files.values()) {
								(<any> file).namehash = r.i32();
							}
						}
					}

					return out;
				})(),
			);
		}
		return id;
	}

	private async getPointers(index: number): Promise<Reader | undefined> {
		let ptrs = this.pointers.get(index);
		if (!ptrs) {
			this.pointers.set(
				index,
				ptrs = (async () => {
					let data = await this.disk.getFile("main_file_cache.idx" + index);
					return data && new Reader(data);
				})(),
			);
		}
		return ptrs;
	}

	public async getArchives(index: number): Promise<number[] | undefined> {
		let idx = await this.getIndex(index);
		if (!idx) {
			return;
		}

		return Array.from(idx.archives.keys());
	}

	public async getArchive(index: number, archive: number): Promise<ArchiveData | undefined> {
		let idx = await this.getIndex(index);
		if (!idx) {
			return;
		}
		let am = idx.archives.get(archive);
		if (!am) {
			return;
		}
		if (!am.compressedData) {
			let d = await this.getArchiveRaw(index, archive);
			if (!d) {
				return;
			}
			am.compressedData = d;
		}
		return am;
	}

	private async getArchiveRaw(index: number, archive: number): Promise<Uint8Array | undefined> {
		let ptrs = await this.getPointers(index);
		if (!ptrs) {
			return undefined;
		}

		ptrs.offset = archive * 6;
		if (ptrs.remaining <= 0) {
			return undefined;
		}

		let len = ptrs.u24();
		let sector = ptrs.u24();

		let data = await this.data;
		let r = new Reader(data!);

		let headerSize = archive > 0xFFFF ? 10 : 8;
		const SECTOR_SIZE = 520;

		let fastRead = len + headerSize <= SECTOR_SIZE;

		let obuf = fastRead ? undefined : new Uint8Array(len);
		let readBytes = 0;
		let part = 0;
		for (; readBytes < len;) {
			r.offset = sector * SECTOR_SIZE;
			let readArchive = headerSize == 10 ? r.i32() : r.u16();
			let readPart = r.u16();
			let nextSector = r.u24();
			let readIndex = r.u8();

			if (readArchive != archive) {
				throw new Error(`corrupted; read archive ${readArchive} wanted ${archive}`);
			}
			if (readPart != part) {
				throw new Error(`corrupted; read part ${readPart} wanted ${part}`);
			}
			if (readIndex != index) {
				throw new Error(`corrupted; read index ${readIndex} wanted ${index}`);
			}

			let sa = r.array(Math.min(SECTOR_SIZE - headerSize, len - readBytes));
			if (fastRead) {
				return sa;
			}
			obuf!.set(sa, readBytes);
			readBytes += sa.length;

			sector = nextSector;
			part++;
		}

		return obuf;
	}

	public async getArchiveByName(index: number, name: string | number): Promise<ArchiveData | undefined> {
		let namehash = hash(name);

		let idx = await this.getIndex(index);
		if (!idx) {
			return;
		}

		for (let ar of idx.archives.values()) {
			if (ar.namehash === namehash) {
				if (!ar.compressedData) {
					let d = await this.getArchiveRaw(index, ar.archive);
					if (!d) {
						return;
					}
					ar.compressedData = d;
				}
				return ar;
			}
		}
	}

	public async getVersion(index: number): Promise<CacheVersion> {
		return {
			era: "osrs",
			indexRevision: (await this.getIndex(index))?.revision ?? 0,
		};
	}
}
