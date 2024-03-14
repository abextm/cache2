import * as ts from "typescript";
import { addTypeInfo } from "../../../cache2-ts/reflect";

import { ICreateData, TypeScriptWorker } from "./vendor/typescript/tsWorker";
// @ts-ignore
import { worker } from "monaco-editor/esm/vs/editor/editor.api";
// @ts-ignore
import { initialize } from "monaco-editor/esm/vs/editor/editor.worker.js";

class MyWorker extends TypeScriptWorker {
	getCustomTransformers() {
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
}

self.onmessage = () => {
	// ignore the first message
	initialize((ctx: worker.IWorkerContext, createData: ICreateData) => {
		return new MyWorker(ctx, createData);
	});
};
