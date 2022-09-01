/*
Copyright 2011 The Go Authors. All rights reserved.
Copyright 2022 Abex

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

   * Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
   * Redistributions in binary form must reproduce the above
copyright notice, this list of conditions and the following disclaimer
in the documentation and/or other materials provided with the
distribution.
   * Neither the name of Google Inc. nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// this is more or less a direct copy of the Go compress/bz2 package

function calcCRCTable(poly: number): Uint32Array {
	let out = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i << 24;
		for (let j = 8; j > 0; j--) {
			c = (c << 1) ^ (((c & 0x8000_0000) >> 31) & poly);
		}
		out[i] = c;
	}
	return out;
}

const crcTable = calcCRCTable(0x04c11db7);

/** @internal */ export class BitReader {
	private off = 0;
	constructor(private readonly buf: Uint8Array) {
	}

	public bits(bits: number): number {
		let out = 0;
		let bitOffset = this.off;
		for (; bits > 0;) {
			let byte = bitOffset >> 3;
			let bit = bitOffset & 7;
			let numBits = Math.min(bits, 8 - bit);
			bits -= numBits;
			bitOffset += numBits;
			out <<= numBits;
			out |= (this.buf[byte] >> ((8 - bit) - numBits)) & ((1 << numBits) - 1);
		}
		this.off = bitOffset;
		return out;
	}

	public bit(): number {
		let bitOffset = this.off++;
		let byte = bitOffset >> 3;
		let bit = ~bitOffset & 7;
		return (this.buf[byte] >> bit) & 1;
	}
}

// laid out as [rightIndex, leftIndex, rightValue, leftValue]...
// The symbols are uint16s because bzip2 encodes not only MTF indexes in the
// tree, but also two magic values for run-length encoding and an EOF symbol.
// Thus there are more than 256 possible symbols.
type HuffmanTree = Uint16Array;

const HUFFMAN_INDEX_IS_LEAF = 0xFFFF;

function huffmanDecode(t: HuffmanTree, br: BitReader): number {
	let nodeIndex = 0;
	for (;;) {
		let bit = br.bit();
		let nextIndex = t[nodeIndex * 4 + bit];
		if (nextIndex === HUFFMAN_INDEX_IS_LEAF) {
			// its a value!
			return t[nodeIndex * 4 + 2 + bit];
		}
		nodeIndex = nextIndex;
	}
}

// lengths is (length << 16 | symbol value)[]
function newHuffmanTree(lengths: Uint32Array): HuffmanTree {
	if (lengths.length < 2) {
		throw new Error(`too few symbols`);
	}

	// sort ascending by length then symbol value
	lengths.sort();

	// Now we assign codes to the symbols, starting with the longest code.
	// We keep the codes packed into a uint32, at the most-significant end.
	// So branches are taken from the MSB downwards. This makes it easy to
	// sort them later.
	let code = 0;
	let length = 32;

	// [code, codeLen | value << 16]
	let codes = new Uint32Array(lengths.length * 2);
	let indexes = new Uint16Array(lengths.length);
	for (let i = lengths.length - 1; i >= 0; i--) {
		length = Math.min(length, lengths[i] >>> 16);
		codes[i * 2] = code;
		codes[i * 2 + 1] = length | (lengths[i] & 0xFFFF) << 16;
		indexes[i] = i * 2;
		// We need to 'increment' the code, which means treating |code|
		// like a |length| bit number.
		code = (code + ((1 << (32 - length)) >>> 0)) >>> 0;
	}

	// Now we can sort by the code so that the left half of each branch are
	// grouped together, recursively.
	indexes.sort((a, b) => codes[a] - codes[b]);

	let nodes = new Uint16Array(4 * lengths.length);

	let nextNode = 0;
	function buildHuffmanNode(indexStart: number, indexLength: number, level: number): number {
		let test = 1 << (31 - level);

		let firstRightIndex = indexLength;
		for (let i = indexStart; i < indexLength; i++) {
			if (codes[indexes[i]] & test) {
				firstRightIndex = i;
				break;
			}
		}

		if (indexStart === firstRightIndex || firstRightIndex === indexLength) {
			// Go source has a large explaination of what happens to get here
			if ((indexLength - indexStart) < 2 || level === 31) {
				throw new Error(`invalid tree`);
			}

			if (indexStart === firstRightIndex) {
				return buildHuffmanNode(firstRightIndex, indexLength, level + 1);
			}
			return buildHuffmanNode(indexStart, firstRightIndex, level + 1);
		}

		let nodeIndex = nextNode++;
		let realIndex = nodeIndex * 4;

		if (firstRightIndex - indexStart === 1) {
			nodes[realIndex + 1] = HUFFMAN_INDEX_IS_LEAF;
			nodes[realIndex + 3] = codes[indexes[indexStart] + 1] >>> 16;
		} else {
			nodes[realIndex + 1] = buildHuffmanNode(indexStart, firstRightIndex, level + 1);
		}
		if (indexLength - firstRightIndex == 1) {
			nodes[realIndex] = HUFFMAN_INDEX_IS_LEAF;
			nodes[realIndex + 2] = codes[indexes[firstRightIndex] + 1] >>> 16;
		} else {
			nodes[realIndex] = buildHuffmanNode(firstRightIndex, indexLength, level + 1);
		}

		return nodeIndex;
	}

	buildHuffmanNode(0, indexes.length, 0);

	return nodes;
}

/** @internal */ export function moveToFront(symbols: Uint8Array, n: number): number {
	let o = symbols[n];
	symbols.copyWithin(1, 0, n);
	symbols[0] = o;
	return o;
}

function inverseBWT(tt: Uint32Array, origPtr: number, c: Uint32Array): number {
	let sum = 0;
	for (let i = 0; i < c.length; i++) {
		sum += c[i];
		c[i] = sum - c[i];
	}

	for (let i = 0; i < tt.length; i++) {
		let b = tt[i] & 0xFF;
		tt[c[b]++] |= i << 8;
	}

	return tt[origPtr] >> 8;
}

export function decompress(bytes: Uint8Array, level: number, outSize: number): Uint8Array {
	let br = new BitReader(bytes);

	// output buffer
	let out = new Uint8Array(outSize);
	let outIndex = 0;

	// we don't have the header, but if we did, the level
	// would come from that ('BZh'[0-9])
	let blockSize = 100 * 1000 * level;

	// mirrors the tt array in the bzip2 source + P array in upper 24 bits
	let tt = new Uint32Array(blockSize);
	let tPos = 0;
	// inverse BWT "C" array
	let c = new Uint32Array(256);

	// rle to be processed
	let preRLEUsed = 0;
	let preRLE = new Uint32Array(0);

	// last rle byte seen
	let lastByte = 0;
	// number of repeats of lastByte seen
	let byteRepeats = 0;
	// copies of lastByte to output
	let repeats = 0;

	let iBlockCRC = ~0;
	let wantBlockCRC = 0;

	let fileCRC = 0;

	for (;;) {
		// read from block
		for (; (repeats > 0 || preRLEUsed < preRLE.length) && outIndex < out.length;) {
			if (repeats > 0) {
				out[outIndex++] = lastByte;
				iBlockCRC = crcTable[(iBlockCRC >>> 24) ^ lastByte] ^ (iBlockCRC << 8);
				repeats--;
				if (repeats === 0) {
					lastByte = -1;
				}
				continue;
			}

			tPos = preRLE[tPos];
			let b = tPos & 0xFF;
			tPos >>= 8;
			preRLEUsed++;

			if (byteRepeats === 3) {
				repeats = b;
				byteRepeats = 0;
				continue;
			}

			if (lastByte === b) {
				byteRepeats++;
			} else {
				byteRepeats = 0;
			}
			lastByte = b;
			out[outIndex++] = b;
			iBlockCRC = crcTable[(iBlockCRC >>> 24) ^ b] ^ (iBlockCRC << 8);
		}

		// end of block
		if (~iBlockCRC !== wantBlockCRC) {
			throw new Error(`block checksum mismatch ${(~iBlockCRC).toString(16)} != ${wantBlockCRC.toString(16)}`);
		}

		// find next block
		let biHigh = br.bits(32);
		let biLow = br.bits(16);

		if (biHigh === 0x3141_5926 && biLow === 0x5359) {
			wantBlockCRC = br.bits(32);
			iBlockCRC = ~0;
			fileCRC = (fileCRC << 1 | fileCRC >>> 31) ^ wantBlockCRC;

			if (br.bit()) {
				throw new Error(`deprecated random files`);
			}

			let origPtr = br.bits(24);

			let symbolRangeUsedBitmap = br.bits(16);
			let symbolPresent = new Uint8Array(256);
			let numSymbols = 0;
			for (let symRange = 0; symRange < 16; symRange++) {
				if (symbolRangeUsedBitmap & (1 << (15 - symRange))) {
					let bits = br.bits(16);
					for (let sym = 0; sym < 16; sym++) {
						if (bits & (1 << (15 - sym))) {
							symbolPresent[16 * symRange | sym] = 1;
							numSymbols++;
						}
					}
				}
			}
			if (numSymbols <= 0) {
				throw new Error(`no symbols`);
			}

			let numHuffmanTrees = br.bits(3);
			if (numHuffmanTrees < 2 || numHuffmanTrees > 6) {
				throw new Error(`invalid huffman tree count`);
			}

			let numSelectors = br.bits(15);
			let treeIndexes = new Uint8Array(numSelectors);

			let mtfTreeDecoder = new Uint8Array(numHuffmanTrees);
			for (let i = 0; i < mtfTreeDecoder.length; i++) {
				mtfTreeDecoder[i] = i;
			}
			for (let i = 0; i < treeIndexes.length; i++) {
				let c = 0;
				for (; br.bit(); c++);
				if (c >= numHuffmanTrees) {
					throw new Error(`tree index too large`);
				}
				treeIndexes[i] = moveToFront(mtfTreeDecoder, c);
			}

			let symbols = new Uint8Array(numSymbols);
			let nextSymbol = 0;
			for (let i = 0; i < 256; i++) {
				if (symbolPresent[i]) {
					symbols[nextSymbol++] = i;
				}
			}

			// for RUNA & RUNB
			numSymbols += 2;
			let lengths = new Uint32Array(numSymbols);
			let trees: HuffmanTree[] = [];
			for (let tree = 0; tree < numHuffmanTrees; tree++) {
				let len = br.bits(5);
				for (let j = 0; j < numSymbols; j++) {
					for (;;) {
						if (len < 1 || len > 20) {
							throw new Error(`huffman length out of range`);
						}
						if (!br.bit()) {
							break;
						}
						if (br.bit()) {
							len--;
						} else {
							len++;
						}
					}
					lengths[j] = len << 16 | j;
				}
				trees.push(newHuffmanTree(lengths));
			}

			let selectorIndex = 1;
			if (treeIndexes.length == 0) {
				throw new Error(`no tree selectors given`);
			}
			if (treeIndexes[0] >= numHuffmanTrees) {
				throw new Error(`tree selector out of range`);
			}
			let currentHuffmanTree = trees[treeIndexes[0]];
			let bufIndex = 0;

			let repeat = 0;
			let repeatPower = 0;

			c.fill(0);

			let decoded = 0;
			for (;;) {
				if (decoded === 50) {
					if (selectorIndex >= numSelectors) {
						throw new Error(`insufficient selector indicies for number of symbols`);
					}

					let index = treeIndexes[selectorIndex++];
					if (index >= numHuffmanTrees) {
						throw new Error(`tree selector out of range`);
					}
					currentHuffmanTree = trees[index];

					decoded = 0;
				}

				let v = huffmanDecode(currentHuffmanTree, br);
				decoded++;

				if (v < 2) {
					// RUNA or RUNB
					if (repeat === 0) {
						repeatPower = 1;
					}
					repeat += repeatPower << v;
					repeatPower <<= 1;

					if (repeat > 2 * 1024 * 1024) {
						throw new Error(`repeat count too large`);
					}
					continue;
				}

				if (repeat > 0) {
					if (repeat > blockSize - bufIndex) {
						throw new Error(`repeats past end of block`);
					}

					let b = symbols[0];
					c[b] += repeat;
					tt.fill(b, bufIndex, bufIndex += repeat);
					repeat = 0;
				}

				if (v === numSymbols - 1) {
					// EOF symbol
					break;
				}

				let b = moveToFront(symbols, v - 1);
				if (bufIndex >= blockSize) {
					throw new Error(`data exceeds block size`);
				}
				tt[bufIndex++] = b;
				c[b]++;
			}

			if (origPtr >= bufIndex) {
				throw new Error(`origPtr out of bounds`);
			}

			preRLE = tt.subarray(0, bufIndex);
			preRLEUsed = 0;
			tPos = inverseBWT(preRLE, origPtr, c);
			lastByte = -1;
			byteRepeats = 0;
			repeats = 0;
		} else if (biHigh === 0x1772_4538 && biLow === 0x5090) {
			let wantFileCRC = br.bits(32);
			if (fileCRC !== wantFileCRC) {
				throw new Error(`file checksum mismatch ${fileCRC.toString(16)} != ${wantFileCRC.toString(16)}`);
			}

			// go checks for concatenated archives here

			if (outSize != outIndex) {
				throw new Error(`incorrect outSize ${outIndex} != ${outSize}`);
			}

			return out;
		} else {
			throw new Error(`invalid block magic value ${biHigh.toString(16)}_${biLow.toString(16)}`);
		}
	}
}
