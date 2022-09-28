import { NamedPerArchiveLoadable } from "../Loadable";
import { Reader } from "../Reader";
import { Typed } from "../reflect";
import * as types from "../types";

@Typed
export class Sprite {
	constructor(public readonly sprites: Sprites, public readonly index: number) {
	}

	offsetX = 0;
	offsetY = 0;
	pixelsWidth = 0;
	pixelsHeight = 0;

	encodingMode!: number;

	pixels: Uint8Array = undefined!;

	get canvasWidth(): number {
		return this.sprites.width;
	}
	get canvasHeight(): number {
		return this.sprites.height;
	}

	asImageData(includePadding = true): ImageData {
		let tw = includePadding ? this.canvasWidth : this.pixelsWidth;
		let th = includePadding ? this.canvasHeight : this.pixelsHeight;
		let tx = includePadding ? this.offsetX : 0;
		let ty = includePadding ? this.offsetY : 0;

		let out = new Uint8Array(th * tw * 4);

		let px = this.pixels;
		let palette = this.sprites.palette;
		let pw = this.pixelsWidth;
		let ph = this.pixelsHeight;
		for (let y = 0; y < ph; y++) {
			let po = y * pw;
			let to = (y + ty) * tw;
			for (let x = 0; x < pw; x++) {
				let rgb = palette[px[po + x]];
				let oi = 4 * (to + tx + x);
				out[oi + 0] = rgb >>> 16;
				out[oi + 1] = rgb >> 8;
				out[oi + 2] = rgb;
				out[oi + 3] = rgb == 0 ? 0 : 0xFF;
			}
		}

		return new ImageData(new Uint8ClampedArray(out.buffer, out.byteOffset, out.byteLength), tw, th);
	}
}

@Typed
export class Sprites extends NamedPerArchiveLoadable {
	constructor(public id: types.SpriteID, count: number) {
		super();
		this.sprites = new Array(count);
		for (let i = 0; i < count; i++) {
			this.sprites[i] = new Sprite(this, i);
		}
	}

	static readonly index = 8;

	width!: number;
	height!: number;

	sprites: Sprite[];

	palette!: types.PrimitiveArray<types.RGB, Uint32Array>;

	public static decode(r: Reader, id: types.SpriteID): Sprites {
		let chunkOffset = r.length - 2;
		r.offset = chunkOffset;
		let count = r.u16();
		let out = new Sprites(id, count);

		r.offset = chunkOffset -= 5 + (count * 8);
		out.width = r.u16();
		out.height = r.u16();
		let paletteLength = r.u8();
		out.palette = new Uint32Array(paletteLength + 1);

		for (let i = 0; i < count; i++) {
			out.sprites[i].offsetX = r.u16();
		}
		for (let i = 0; i < count; i++) {
			out.sprites[i].offsetY = r.u16();
		}
		for (let i = 0; i < count; i++) {
			out.sprites[i].pixelsWidth = r.u16();
		}
		for (let i = 0; i < count; i++) {
			out.sprites[i].pixelsHeight = r.u16();
		}

		r.offset = chunkOffset -= paletteLength * 3;
		for (let i = 1; i < out.palette.length; i++) {
			out.palette[i] = Math.max(1, r.u24());
		}

		r.offset = 0;
		for (let i = 0; i < count; i++) {
			let sprite = out.sprites[i];
			let mode = sprite.encodingMode = r.u8();

			if (mode == 0) {
				sprite.pixels = r.array(sprite.pixelsWidth * sprite.pixelsHeight);
			} else if (mode == 1) {
				let px = sprite.pixels = new Uint8Array(sprite.pixelsWidth * sprite.pixelsHeight);
				for (let x = 0; x < sprite.pixelsWidth; x++) {
					for (let y = 0; y < sprite.pixelsHeight; y++) {
						px[y * sprite.pixelsWidth + x] = r.u8();
					}
				}
			} else {
				throw new Error(`invalid mode ${mode}`);
			}
		}

		return out;
	}
}
