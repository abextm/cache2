import { BitReader, decompress, moveToFront } from "../src/bz2";

test("BitReader", () => {
	let br = new BitReader(new Uint8Array([0xab, 0x12, 0x34, 0x56, 0x78, 0x71, 0x3f, 0x8d]));
	let table = [
		{ nbits: 1, value: 1 },
		{ nbits: 1, value: 0 },
		{ nbits: 1, value: 1 },
		{ nbits: 5, value: 11 },
		{ nbits: 32, value: 0x12345678 },
		{ nbits: 15, value: 14495 },
		{ nbits: 3, value: 6 },
		{ nbits: 6, value: 13 },
	];
	expect(table.map(({ nbits }) => ({
		nbits,
		value: br.bits(nbits),
	}))).toEqual(table);
});
test("BitReader by bit", () => {
	let br = new BitReader(new Uint8Array([0b10110100]));
	expect(br.bit()).toBe(1);
	expect(br.bit()).toBe(0);
	expect(br.bit()).toBe(1);
	expect(br.bit()).toBe(1);
	expect(br.bit()).toBe(0);
	expect(br.bits(3)).toBe(0b100);
});

test("move to front", () => {
	let data = new Uint8Array(5);
	for (let i = 0; i < data.length; i++) {
		data[i] = i;
	}

	let table = [
		{ idx: 1, sym: 1 }, // [1 0 2 3 4]
		{ idx: 0, sym: 1 }, // [1 0 2 3 4]
		{ idx: 1, sym: 0 }, // [0 1 2 3 4]
		{ idx: 4, sym: 4 }, // [4 0 1 2 3]
		{ idx: 1, sym: 0 }, // [0 4 1 2 3]
	];
	expect(table.map(({ idx }) => ({
		idx,
		sym: moveToFront(data, idx),
	}))).toEqual(table);
});

function testDecompress(expected: string | Uint8Array, compressed: string) {
	if (typeof expected === "string") {
		expected = new TextEncoder().encode(expected);
	}

	let c = Uint8Array.from(Buffer.from(compressed, "hex"));

	expect(c.subarray(0, 3)).toEqual(new Uint8Array([0x42, 0x5a, 0x68]));
	expect(decompress(c.subarray(4), c[3] - "0".charCodeAt(0), expected.length))
		.toEqual(expected);
}

test("hello world", () =>
	testDecompress(
		"hello world\n",
		"425a68393141592653594eece83600000251800010400006449080200031064c"
			+ "4101a7a9a580bb9431f8bb9229c28482776741b0",
	));
