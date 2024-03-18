import * as tvfs from "@typescript/vfs";
import { assert } from "chai";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import * as url from "node:url";
import { inspect } from "node:util";
import ts from "typescript";
import { addTypeInfo } from "../reflect/index.js";
import { ParamID, Params, Typed } from "../src/index.js";

inspect.defaultOptions.depth = 1;

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

function testCompile(
	name: string,
	convertConsoleLog: boolean,
	source: string,
	validate: (exports: any) => void = () => void 0,
) {
	it(name, async () => {
		let map = new Map<string, string>();
		const fileName = path.join(__dirname, name + ".ts");
		map.set(fileName, source);
		let sys = tvfs.createFSBackedSystem(map, __dirname, ts);
		sys.getCurrentDirectory = () => __dirname;
		let env = tvfs.createVirtualTypeScriptEnvironment(sys, [fileName], ts, {
			module: ts.ModuleKind.Node16,
			moduleResolution: ts.ModuleResolutionKind.Node16,
			target: ts.ScriptTarget.ES2022,
			strict: true,
			importHelpers: false,
		}, {
			before: [
				sf => addTypeInfo(ts, env.languageService.getProgram()!, convertConsoleLog)(sf),
			],
		});
		let out = env.languageService.getEmitOutput(fileName);
		let diags = [
			...env.languageService.getSyntacticDiagnostics(fileName),
			...env.languageService.getSemanticDiagnostics(fileName),
		];
		if (diags.length > 0) {
			assert.fail(ts.formatDiagnostics(diags, {
				getCanonicalFileName(fileName) {
					return fileName;
				},
				getCurrentDirectory() {
					return __dirname;
				},
				getNewLine() {
					return "\n";
				},
			}));
		}
		let src = out.outputFiles[0].text;
		let scriptName = "reflect test out " + name + ".out.js";
		fs.writeFileSync(path.join(__dirname, scriptName), src);
		let exports = await import("./" + scriptName);
		validate(exports);
	});
}

describe("reflect", () => {
	testCompile(
		"typed class",
		true,
		`
import * as c2 from "../src/index.js";

export class Foo {
	declare [c2.Typed.type]: c2.Typed.Any;

	someItem!: c2.ItemID;
	someNumber = 123;
};
`,
		e => {
			let v = new e.Foo();
			let typ = v[Typed.type];
			assert.equal(typ.type, "obj");
			assert.equal(typ.entries.someNumber.default, 123);
			assert.equal(typ.entries.someItem.name, "ItemID");
		},
	);

	testCompile(
		"typed interface",
		true,
		`
import * as c2 from "../src/index.js";

let v: {
	item: c2.ItemID;
} = {item: 123 as c2.ItemID};
export const v2 = c2.Typed(v);
`,
		e => {
			let typ = e.v2[Typed.type];
			assert.equal(typ.type, "obj");
			assert.equal(typ.entries.item.name, "ItemID");
		},
	);

	testCompile(
		"automagic",
		true,
		`
import * as c2 from "../src/index.js";

interface Foo {
	item: c2.ItemID,
	num: number,
};

let v: Foo[] = [];

export const v2 = c2.Typed(v);
`,
		e => {
			let typ = e.v2[Typed.type];
			assert.equal(typ.type, "list");
			assert.equal(typ.entries.type, "obj");
			assert.equal(typ.entries.entries.item.name, "ItemID");
		},
	);

	testCompile(
		"recursive",
		false,
		`
import * as c2 from "../src/index.js";

interface A {
	b?: B;
}

interface B {
	a?: A;
}

let v: B = {};
export const v2 = c2.Typed(v);
`,
		e => {
			let typ = e.v2[Typed.type];
			assert.equal(typ.type, "obj");
			assert.equal(typ.entries.a.type, "obj");
			assert.equal(typ.entries.a.entries.b, typ);
		},
	);

	testCompile(
		"primitive array",
		false,
		`
import * as c2 from "../src/index.js";

export class Px {
	declare public [c2.Typed.type]: c2.Typed.Any;

	p!: c2.PrimitiveArray<c2.RGB, Uint32Array>;
}
`,
		e => {
			let typ = e.Px.prototype[Typed.type];
			assert.equal(typ.type, "obj");
			assert.equal(typ.entries.p.type, "list");
			assert.equal(typ.entries.p.entries.name, "RGB");
		},
	);

	testCompile(
		"TypedCall",
		true,
		`
import * as c2 from "../src/index.js";
const $_typed_ = c2.Typed;

interface Foo {
	/* @TypedCall */ fn(...v: any[]): void;
}
export const foo = (v: Foo) => {
	v.fn(123 as c2.RGB, 456 as c2.HSL);
	v.fn(...[123, 456] as [c2.RGB, c2.HSL]);
};
export const foo2 = (v: Foo) => v.fn(...[123, 456, 789] as c2.RGB[]);
// should not generate typed wrapper
export const foo3 = (v: c2.Params) => v.has(123 as c2.ParamID);
		`,
		({ foo, foo2, foo3 }) => {
			foo({
				fn: (...args: any[]) => {
					assert.equal(args[0][Typed.type].name, "RGB");
					assert.equal(args[1][Typed.type].name, "HSL");
				},
			});
			foo2({
				fn: (...args: any[]) => {
					assert.equal(args.length, 3);
					for (let arg of args) {
						assert.equal(arg[Typed.type].name, "RGB");
					}
				},
			});
			let params = new Params();
			params.set(123 as ParamID, "hello");
			assert.isTrue(foo3(params));
		},
	);
});
