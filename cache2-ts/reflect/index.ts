import type * as ts from "typescript";
import { Typed } from "../src/reflect";

const UNDEFINED_SENTINAL: unique symbol = Symbol("undefined");

export const addTypeInfo =
	(ts: typeof import("typescript"), program: ts.Program, convertTypedCall = false) =>
	(ctx: ts.TransformationContext) =>
	(sf: ts.SourceFile): ts.SourceFile => {
		type Transformer<T extends ts.Node> = <O extends T | ts.NodeArray<T>>(o: O) => O;
		function transformer<T extends ts.Node>(
			transform: (node: T) => T | undefined,
		): Transformer<T> {
			return o => {
				if (Array.isArray(o)) {
					return ts.visitNodes(o as ts.NodeArray<T>, transform) as any;
				} else {
					return ts.visitNode(o as T, transform) as any ?? o;
				}
			};
		}

		const checker = program.getTypeChecker();

		function isNode(v: any): v is ts.Expression {
			return typeof v === "object" && v && "getSourceFile" in v;
		}

		const cloneTransformer: Transformer<ts.Node> = transformer(node => {
			return ts.visitEachChild(
				{
					...node,
					parent: undefined!,
					pos: -1,
					end: -1,
				},
				cloneTransformer,
				ctx,
			);
		});

		function pojoToAST(entryValue: any): ts.Expression {
			// obj -> count
			let seen = new Map<any, number>();
			// obj -> var name or "" if not created yet
			let roots = new Map<any, {
				name: string;
				state: "unstarted" | "pending" | "done";
			}>();

			function see(v: any) {
				if (typeof v !== "object" || v === null) {
					return;
				}

				let c = seen.get(v) ?? 0;
				if (c === 1) {
					roots.set(v, {
						name: "v" + roots.size,
						state: "unstarted",
					});
				}
				seen.set(v, c + 1);

				if (c === 0 && !isNode(v)) {
					if (Array.isArray(v)) {
						v.forEach(see);
					} else {
						Object.values(v).forEach(see);
					}
				}
			}

			see(entryValue);

			let vars: ts.Statement[] = [];
			let circulars: ts.Statement[] = [];

			function serializeRoot(rootV: any, isToplevel = false): ts.Expression {
				let path: (string | number)[] = [];
				let root = roots.get(rootV) ?? { name: "v", state: "unstarted" };
				root.state = "pending";

				function serialize(v: any, followRoot = true): ts.Expression {
					let vRoot = roots.get(v);
					if (vRoot !== undefined && followRoot) {
						if (vRoot.state === "unstarted") {
							return serializeRoot(v, false);
						}
						if (vRoot.state === "done") {
							return ts.factory.createIdentifier(vRoot.name);
						}

						let pac: ts.Expression = ts.factory.createIdentifier(root.name);
						for (let level of path) {
							if (typeof level === "number") {
								pac = ts.factory.createElementAccessExpression(pac, level);
							} else {
								pac = ts.factory.createPropertyAccessExpression(pac, level);
							}
						}
						circulars.push(ts.factory.createExpressionStatement(
							ts.factory.createBinaryExpression(
								pac,
								ts.SyntaxKind.EqualsToken,
								ts.factory.createIdentifier(vRoot.name),
							),
						));

						return ts.factory.createVoidZero();
					}
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
							if (isNode(v)) {
								return cloneTransformer(v);
							}
							if (Array.isArray(v)) {
								return ts.factory.createArrayLiteralExpression(
									v.map((v, i) => {
										path.push(i);
										let ex = serialize(v);
										path.pop();
										return ex;
									}),
									false,
								);
							}
							return ts.factory.createObjectLiteralExpression(
								Object.entries(v).map(([k, v]) => {
									path.push(k);
									let ex = ts.factory.createPropertyAssignment(k, serialize(v));
									path.pop();
									return ex;
								}),
								false,
							);
						case "undefined":
							return ts.factory.createVoidZero();
						default:
							throw new Error(typeof v);
					}
				}

				let literal = serialize(rootV, false);
				root.state = "done";

				if (isToplevel && circulars.length <= 0) {
					return literal;
				}

				vars.unshift(ts.factory.createVariableStatement(undefined, [
					ts.factory.createVariableDeclaration(root.name, undefined, undefined, literal),
				]));

				return ts.factory.createIdentifier(root.name);
			}

			let entryAST = serializeRoot(entryValue, true);
			if (vars.length <= 0) {
				return entryAST;
			}

			let ret = ts.factory.createReturnStatement(entryAST);

			return ts.factory.createImmediatelyInvokedFunctionExpression([
				...vars,
				...circulars,
				ret,
			]);
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
			| ts.TypeFlags.Union
			| ts.TypeFlags.TypeVariable;

		let typeCache = new Map<ts.Type, Typed.Any>();

		function preTypeCache(t: ts.Type): (t: Typed.Any) => Typed.Any {
			let obj: any = { [UNDEFINED_SENTINAL]: true };
			typeCache.set(t, obj);
			return v => {
				if (!v) {
					return;
				}
				delete obj[UNDEFINED_SENTINAL];
				Object.entries(v).forEach(([k, v]) => obj[k] = v);
				return obj;
			};
		}

		function typeToTyped(t: ts.Type, node: ts.Node, isTypedDecleration = false): Typed.Any {
			t = t.getNonNullableType();
			{
				let tt = typeCache.get(t);
				if (tt) {
					return tt;
				}
			}

			if (t.aliasSymbol?.escapedName) {
				let name = t.aliasSymbol.escapedName;
				if (name === "PrimitiveArray" && t.aliasTypeArguments?.length == 2) {
					let out = preTypeCache(t);
					let entries = typeToTyped(t.aliasTypeArguments[0], node);
					return entries && out({
						type: "list",
						entries,
					});
				}
				return {
					type: "named",
					name: name as string,
				};
			}

			if (t.flags & boringTypes) {
				return;
			}

			if (isType<ts.ObjectType>(t, ts.TypeFlags.Object)) {
				if (isObjType<ts.TypeReference>(t, ts.ObjectFlags.Reference)) {
					let t2 = t.target;

					if (
						!isTypedDecleration
						&& t2.symbol?.declarations?.some(decl =>
							(ts.isClassDeclaration(decl) || ts.isClassExpression(decl))
							&& ts.getDecorators(decl)?.some(deco => isTypedAccess(deco.expression))
						)
					) {
						// will be handled with the runtime type info
						return undefined;
					}

					if (isObjType<ts.TupleType>(t2, ts.ObjectFlags.Tuple)) {
						let entries = t.typeArguments!.map(v => typeToTyped(v, node));
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
						let out = preTypeCache(t);
						let entries = typeToTyped(t.typeArguments[0], node);
						return entries && out({
							type: "list",
							entries,
						});
					}

					if (name === "Map" && t.typeArguments?.length === 2) {
						return undefined; // TODO:
					}
				}

				if (t.flags & ts.TypeFlags.StructuredType) {
					let out = preTypeCache(t);
					let entries: Typed.Object["entries"] = {};
					let hasEntries = false;
					let defaultEntry: Typed.Any;
					t.symbol?.members?.forEach((v, k) => {
						let defaultValue = v.valueDeclaration
							&& ts.isPropertyDeclaration(v.valueDeclaration)
							&& v.valueDeclaration.initializer;
						let inode = t.symbol.declarations?.[0] ?? node;
						let typ = checker.getTypeOfSymbolAtLocation(v, inode);
						let typed = typ && typeToTyped(typ, inode);
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
						return out({
							type: "obj",
							entries,
							defaultEntry,
						});
					}

					return;
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
		}

		function updateTypedExpr(typed: ts.Expression, arg: Typed.Any): ts.Expression {
			return ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					typed,
					"d",
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

		function isTypedCall(expr: ts.Expression): boolean {
			return exprDeclCommentMatches(expr, comment => comment.indexOf("@TypedCall") !== -1);
		}

		function exprDeclCommentMatches(expr: ts.Expression, test: (comment: string) => boolean): boolean {
			if (!ts.isPropertyAccessExpression(expr)) {
				return false;
			}
			let sym = checker.getSymbolAtLocation(expr);
			return sym?.declarations?.some(decl => {
				let fullText = decl.getSourceFile().text;
				return ts.forEachLeadingCommentRange(
					fullText,
					decl.pos,
					(pos, end, _kind, v) => v || test(fullText.substring(pos, end)),
					false,
				);
			}) ?? false;
		}

		let visitor: Transformer<ts.Node> = transformer<ts.Node>(node => {
			if (ts.isDecorator(node) && isTypedAccess(node.expression)) {
				let p = node.parent;

				let type = typeToTyped(checker.getTypeAtLocation(p), node, true);
				if (type) {
					return ts.factory.updateDecorator(node, updateTypedExpr(node.expression, type));
				}
			}
			if (ts.isCallExpression(node) && isTypedAccess(node.expression)) {
				let type = typeToTyped(checker.getTypeAtLocation(node.arguments[0])!, node.arguments[0]);
				if (type) {
					return ts.factory.updateCallExpression(
						node,
						updateTypedExpr(node.expression, type),
						node.typeArguments,
						visitor(node.arguments),
					);
				}
			}
			if (convertTypedCall && ts.isCallExpression(node) && isTypedCall(node.expression)) {
				return ts.factory.updateCallExpression(
					node,
					visitor(node.expression),
					node.typeArguments,
					node.arguments.map(arg => {
						let isSpread = false;
						if (ts.isSpreadElement(arg)) {
							isSpread = true;
							arg = arg.expression;
						}
						let type = typeToTyped(checker.getTypeAtLocation(arg)!, node);
						if (!type) {
							return visitor(arg);
						}

						let call = ts.factory.createCallExpression(
							ts.factory.createPropertyAccessExpression(
								ts.factory.createIdentifier("$_typed_"),
								isSpread ? "s" : "v",
							),
							undefined,
							[pojoToAST(type), visitor(arg)],
						);

						if (isSpread) {
							return ts.factory.createSpreadElement(call);
						}

						return call;
					}),
				);
			}
			return ts.visitEachChild(node, visitor, ctx);
		});
		return visitor(sf);
	};
