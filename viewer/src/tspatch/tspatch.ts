import type * as monaco from "monaco-editor";
import type * as ts from "typescript";
import { addTypeInfo } from "../../../cache2-ts/reflect";

type TypeScriptWorker_ = monaco.languages.typescript.TypeScriptWorker & ts.LanguageServiceHost;
(self as any).customTSWorkerFactory = (
	TypeScriptWorker: { new(...args: any[]): TypeScriptWorker_; },
	{ typescript: ts }: { typescript: typeof import("typescript"); },
	libFileMap: Record<string, string>,
) => {
	return class MyWorker extends TypeScriptWorker {
		constructor(...args: any[]) {
			super(...args);
		}

		getCustomTransformers() {
			let prev = super.getCustomTransformers?.();
			if (prev) {
				throw new Error("unimplemented");
			}

			/**
			 * convert scripts (possibly with a trailing expression) into a function body with a return statement
			 */
			function addTrailingReturn(ctx: ts.TransformationContext) {
				return (sf: ts.SourceFile) => {
					let lastStat = sf.statements[sf.statements.length - 1];
					return ts.visitEachChild(sf, node => {
						if (node === lastStat && ts.isExpressionStatement(node)) {
							// munge the ExprStmt into a return statement so the pos (and any leading comment)
							// gets copied correctly, otherwise it can generate `return\n \\comment\n expr`,
							// which is actually `return; unused expr;`
							let rs = ts.factory.updateReturnStatement({
								...node as any,
								expression: undefined,
							}, node.expression);
							return rs;
						}
						return node;
					}, ctx);
				};
			}

			let ls: ts.LanguageService = (<any> this).getLanguageService();

			return {
				before: [
					addTypeInfo(ts, ls.getProgram()!, true),
					// for the script body
					addTrailingReturn,
				],
				after: [
					// for the SystemJS stuff
					addTrailingReturn,
				],
			};
		}
	};
};
