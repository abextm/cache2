import { PerFileLoadable } from "../Loadable";
import { Reader } from "../Reader";
import { Typed } from "../reflect";
import { RGB, UnderlayID } from "../types";

@Typed
export class Underlay extends PerFileLoadable {
	constructor(public id: UnderlayID) {
		super();
	}

	public static readonly index = 2;
	public static readonly archive = 1;

	public rgb: RGB = 0;
	public hsl!: UnderlayHSL;

	public static decode(reader: Reader, id: UnderlayID): Underlay {
		const v = new Underlay(id);
		for (let opcode: number; (opcode = reader.u8()) != 0;) {
			switch (opcode) {
				case 1:
					v.rgb = reader.u24();
					break;
				default:
					throw new Error(`unknown enum opcode ${opcode}`);
			}
		}

		v.hsl = new UnderlayHSL(v.rgb);

		return v;
	}
}

@Typed
export class UnderlayHSL {
	hue: number;
	sat: number;
	lum: number;
	hueMultiplier: number;

	constructor(rgb: RGB) {
		let r = ((rgb >> 16) & 255) / 256;
		let g = ((rgb >> 8) & 255) / 256;
		let b = (rgb & 255) / 256;

		let cMin = Math.min(r, g, b);
		let cMax = Math.max(r, g, b);

		let hue = 0;
		let sat = 0;
		let lum = (cMin + cMax) / 2;
		if (cMax != cMin) {
			if (lum < 0.5) {
				sat = (cMax - cMin) / (cMax + cMin);
			}

			if (lum >= 0.5) {
				sat = (cMax - cMin) / (2 - cMax - cMin);
			}

			if (cMax == r) {
				hue = (g - b) / (cMax - cMin);
			} else if (cMax == g) {
				hue = (b - r) / (cMax - cMin) + 2;
			} else if (cMax == b) {
				hue = (r - g) / (cMax - cMin) + 4;
			}
		}

		hue /= 6;
		this.sat = ~~(256 * sat);
		this.lum = ~~(256 * lum);
		if (this.sat < 0) {
			this.sat = 0;
		} else if (this.sat > 255) {
			this.sat = 255;
		}

		if (this.lum < 0) {
			this.lum = 0;
		} else if (this.lum > 255) {
			this.lum = 255;
		}

		if (lum > 0.5) {
			this.hueMultiplier = ~~(512 * (1 - lum) * sat);
		} else {
			this.hueMultiplier = ~~(sat * lum * 512);
		}

		if (this.hueMultiplier < 1) {
			this.hueMultiplier = 1;
		}

		this.hue = ~~(this.hueMultiplier * hue);
	}
}
