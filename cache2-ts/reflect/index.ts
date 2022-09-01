import * as ts from "typescript";
import { Typed } from "../src/reflect";

export const addTypeInfo =
	(ts: typeof import("typescript"), program: ts.Program, convertConsoleLog = false) =>
	(ctx: ts.TransformationContext) =>
	(sf: ts.SourceFile) => {
		const checker = program.getTypeChecker();

		const cloneVisitor: ts.Visitor = node => {
			return ts.visitEachChild(
				{
					...node,
					parent: undefined!,
					pos: -1,
					end: -1,
				},
				cloneVisitor,
				ctx,
			);
		};

		function pojoToAST(v: any): ts.Expression {
			switch (typeof v) {
				case "string":
					return ts.factory.createStringLiteral(v, false);
				case "number":
					return ts.factory.createNumericLiteral(v);
				case "boolean":
					return v ? ts.factory.createTrue() : ts.factory.createFalse();
				case "object":
					if (v === null) {
						return ts.factory.createNull();
					}
					if (Array.isArray(v)) {
						return ts.factory.createArrayLiteralExpression(v.map(pojoToAST), false);
					}
					if ("getSourceFile" in v) {
						return ts.visitNode(v as ts.Expression, cloneVisitor);
					}
					return ts.factory.createObjectLiteralExpression(
						Object.entries(v).map(([k, v]) => ts.factory.createPropertyAssignment(k, pojoToAST(v))),
						false,
					);
				case "undefined":
					return ts.factory.createIdentifier("undefined");
				default:
					throw new Error(typeof v);
			}
		}

		function isType<T extends BT, BT extends ts.Type = ts.Type>(t: BT, flag: number): t is T {
			return !!(t.flags & flag);
		}
		function isObjType<T extends BT, BT extends ts.ObjectType = ts.ObjectType>(t: BT, flag: number): t is T {
			return !!(t.objectFlags & flag);
		}

		const boringTypes = 0
			| ts.TypeFlags.Number
			| ts.TypeFlags.String
			| ts.TypeFlags.Boolean
			| ts.TypeFlags.Void
			| ts.TypeFlags.BigInt
			| ts.TypeFlags.EnumLiteral
			| ts.TypeFlags.Null
			| ts.TypeFlags.Undefined
			| ts.TypeFlags.Unknown
			| ts.TypeFlags.Any
			| ts.TypeFlags.ESSymbol
			| ts.TypeFlags.Union;

		function typeConverter(node: ts.Node) {
			return function typeToTyped(t: ts.Type): Typed.Any {
				t = t.getNonNullableType();

				if (t.aliasSymbol?.escapedName) {
					return {
						type: "named",
						name: t.aliasSymbol.escapedName as string,
					};
				}

				if (t.flags & boringTypes) {
					return;
				}

				if (isType<ts.ObjectType>(t, ts.TypeFlags.Object)) {
					if (isObjType<ts.TypeReference>(t, ts.ObjectFlags.Reference)) {
						let t2 = t.target;
						if (isObjType<ts.TupleType>(t2, ts.ObjectFlags.Tuple)) {
							let entries = t.typeArguments!.map(typeToTyped);
							if (entries.some(v => v)) {
								return {
									type: "tuple",
									entries,
								};
							}
							return;
						}

						let name = t2.symbol.name;
						if ((name === "Array" || name === "Set") && t.typeArguments?.length === 1) {
							let entries = typeToTyped(t.typeArguments[0]);
							return entries && {
								type: "list",
								entries,
							};
						}

						if (name === "Map" && t.typeArguments?.length === 2) {
							return undefined; // TODO:
						}
					}

					if (t.flags & ts.TypeFlags.StructuredType) {
						let entries: Typed.Object["entries"] = {};
						let hasEntries = false;
						let defaultEntry: Typed.Any;
						t.symbol.members?.forEach((v, k) => {
							let defaultValue = v.valueDeclaration
								&& ts.isPropertyDeclaration(v.valueDeclaration)
								&& v.valueDeclaration.initializer;
							let typ = checker.getTypeOfSymbolAtLocation(v, node);
							let typed = typ && typeToTyped(typ);
							if (defaultValue && !typed) {
								typed = { type: "named" };
							}
							if (typed) {
								if (defaultValue) {
									typed.default = defaultValue;
								}
								if (k === ts.InternalSymbolName.Index) {
									defaultEntry = typed;
								} else {
									entries[k as string] = typed;
								}
								hasEntries = true;
							}
						});

						if (hasEntries) {
							return {
								type: "obj",
								entries,
								defaultEntry,
							};
						}
					}
				}

				let pos = node.getSourceFile().getLineAndCharacterOfPosition(node.pos);
				console.log(
					"unknown type for @Typed",
					node.getSourceFile().fileName,
					pos.line + ":" + pos.character,
					(t as any).checker?.typeToString?.(t),
					Object.entries(ts.TypeFlags).filter(e => t.flags & e[1] as number).map(e => e[0]),
					Object.entries(ts.ObjectFlags).filter(e => (t as ts.ObjectType).objectFlags & e[1] as number).map(e => e[0]),
				);
				return undefined!;
			};
		}

		function updateTypedExpr(typed: ts.Expression, arg: Typed.Any): ts.Expression {
			return ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					typed,
					"_",
				),
				undefined,
				[pojoToAST(arg)],
			);
		}

		function isTypedAccess(expr: ts.Expression): boolean {
			if (ts.isPropertyAccessExpression(expr)) {
				expr = expr.name;
			}
			return ts.isIdentifier(expr) && expr.text === "Typed";
		}

		function isConsoleLog(expr: ts.Expression): boolean {
			return ts.isPropertyAccessExpression(expr)
				&& ts.isIdentifier(expr.expression)
				&& expr.expression.escapedText === "console"
				&& ["log", "info", "warn", "debug", "error", "trace"].indexOf(expr.name.escapedText.toString()) !== -1;
		}

		let visitor: ts.Visitor = node => {
			if (ts.isDecorator(node) && isTypedAccess(node.expression)) {
				let p = node.parent;

				let type = typeConverter(node)(checker.getTypeAtLocation(p));
				if (type) {
					return ts.factory.updateDecorator(node, updateTypedExpr(node.expression, type));
				}
			}
			if (ts.isCallExpression(node) && isTypedAccess(node.expression)) {
				let type = typeConverter(node)(checker.getContextualType(node.arguments[0])!);
				if (type) {
					return ts.factory.updateCallExpression(
						node,
						updateTypedExpr(node.expression, type),
						node.typeArguments,
						ts.visitNodes(node.arguments, visitor),
					);
				}
			}
			if (convertConsoleLog && ts.isCallExpression(node) && isConsoleLog(node.expression)) {
				let tc = typeConverter(node);
				return ts.factory.updateCallExpression(
					node,
					node.expression,
					node.typeArguments,
					node.arguments.map(arg => {
						let type = tc(checker.getContextualType(arg)!);
						if (!type) {
							return ts.visitNode(arg, visitor);
						}

						return ts.factory.createCallExpression(
							ts.factory.createCallExpression(
								ts.factory.createIdentifier("$_typed_"),
								undefined,
								[pojoToAST(type)],
							),
							undefined,
							[ts.visitNode(arg, visitor)],
						);
					}),
				);
			}
			return ts.visitEachChild(node, visitor, ctx);
		};
		return ts.visitNode(sf, visitor);
	};
