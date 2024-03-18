import * as path from "path";
import ts from "typescript";
import webpack from "webpack";

import tsloader from "ts-loader";
import { TSInstance } from "ts-loader/dist/interfaces";
import * as instances from "../../node_modules/ts-loader/dist/instances.js";

// we wrap ts-loader so any imports for ?dts* files get the actual .d.ts
// contents that tsc generates

type Options = tsloader.Options & {
	findDTS?: boolean;
};

function root(pathStr: string, roots: [string, string?][]): string {
	return roots
		.filter(v => v[0])
		.map(([root, name]) => [path.relative(root, pathStr), name])
		.sort((a, b) => a[0].length - b[0].length)
		.map(([p, name]) => path.join(name || "", p))[0];
}

const dtsjsLoader = async function(this: webpack.LoaderContext<any>, instance: TSInstance) {
	let program = instance.languageService!.getProgram();

	let moduleName = (pathStr: string) => {
		let nm = /node_modules\/(.*)$/.exec(pathStr);
		if (nm) {
			return "node_modules/" + nm[1];
		}

		pathStr = root(pathStr, [
			[instance.compilerOptions.declarationDir],
			[instance.compilerOptions.outDir],
		]);
		pathStr = root(pathStr, [
			["cache2-ts/src", "@abextm/cache2"],
			["viewer/src", "viewer"],
		]);

		return pathStr;
	};

	let toImport = [];
	let importedSet = new Set<string>();
	let doImport = (resource: string, mp: string) => {
		let p = instance.servicesHost!.resolveModuleNames!([mp], resource, [], undefined, instance.compilerOptions)[0]
			?.resolvedFileName;
		if (!p) {
			if (path.isAbsolute(mp)) {
				p = mp;
			} else {
				p = path.join(path.dirname(resource), mp);
			}
		}

		if (!importedSet.has(p)) {
			importedSet.add(p);
			toImport.push(p);
		}
	};
	doImport(this.resourcePath, this.resourcePath);

	let files = {};
	for (let resource: string; resource = toImport.pop()!;) {
		let tsFi = program!.getSourceFile(resource);
		if (!tsFi) {
			throw new Error(`cannot get source for "${resource}"`);
		}

		let declarationTransformer: ts.TransformerFactory<ts.SourceFile | ts.Bundle> = ctx => tsFi => {
			if (!ts.isSourceFile(tsFi)) {
				throw new Error();
			}

			let visit = (node: ts.Node) => {
				try {
					if (ts.isImportDeclaration(node)) {
						if (!ts.isStringLiteral(node.moduleSpecifier)) {
							throw new Error();
						}

						doImport(resource, node.moduleSpecifier.text);
					}
					if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
						if (!ts.isStringLiteral(node.moduleSpecifier)) {
							throw new Error();
						}

						doImport(resource, node.moduleSpecifier.text);
					}
					if (ts.isImportTypeNode(node)) {
						if (!ts.isLiteralTypeNode(node.argument)) {
							throw new Error();
						}
						if (!ts.isStringLiteral(node.argument.literal)) {
							throw new Error();
						}

						doImport(resource, node.argument.literal.text);
					}
				} catch (e) {
					console.error(e, node.getText(tsFi), node);
					throw e;
				}
				return ts.visitEachChild(node, visit, ctx);
			};

			let out = ts.visitEachChild(tsFi, visit, ctx);
			for (let ref of out.referencedFiles) {
				doImport(resource, ref.fileName);
			}
			return out;
		};

		if (tsFi.isDeclarationFile) {
			tsFi = <ts.SourceFile> ts.transform(tsFi, [declarationTransformer], instance.compilerOptions).transformed[0];
			let tsPrinter = ts.createPrinter({
				newLine: ts.NewLineKind.LineFeed,
			});
			files[moduleName(resource)] = tsPrinter.printFile(tsFi);
		} else {
			program!.emit(
				tsFi,
				(path, src) => {
					files[moduleName(path)] = src;
				},
				undefined,
				true,
				{
					afterDeclarations: [declarationTransformer],
				},
				// @ts-expect-error forceDtsEmit
				true,
			);
		}
	}

	let src = `
export const files = ${JSON.stringify(files, undefined, "\t")};
`;

	return src;
};

const dtsLoader: webpack.LoaderDefinition = function(contents, map, meta) {
	let opts = <Options> this.getOptions();
	if (!opts.instance) {
		throw new Error("all dtscs must have instance set");
	}

	if (this.resourcePath.endsWith(".d.ts")) {
		let { instance } = instances.getTypeScriptInstance(<any> { instance: opts.instance }, <any> this);
		return dtsjsLoader.call(this, instance, false);
	}

	let dts = this.resourceQuery.indexOf("dts") != -1;
	let gdts = this.resourceQuery.indexOf("gdts") != -1;
	if (dts) {
		let cb = this.async();
		this.async = () => (err) => {
			if (err) {
				cb(err);
				return;
			}

			let { instance } = instances.getTypeScriptInstance(<any> { instance: opts.instance }, <any> this);
			dtsjsLoader.call(this, instance, gdts).then(t => cb(null, t), e => cb(e));
		};
	}
	tsloader.call(this, contents);
};

export default dtsLoader;
