import * as c2 from "@abextm/cache2";
import { CacheProvider, DBTable } from "@abextm/cache2";
import * as _ from "lodash";
import { setCacheShare } from "../common/CacheShare";
import { ClearConsole, IRunnerPrivate, Log, LogLevel, LookupType, ScriptResponse } from "../common/Runner";
import { ServiceClient } from "../common/ServiceClient";
import { ServiceServer } from "../common/ServiceServer";
import { type AbstractTable } from "../common/Table";
import { serialize } from "../common/uiobject";
import * as ctx from "../context";

interface System {
	register(dependencies: string[], declare: System.DeclareFn): void;
	register(name: string, dependencies: string[], declare: System.DeclareFn): void;
}
namespace System {
	export type ImportFn = <T extends Module>(moduleId: string, parentUrl?: string) => Promise<T>;

	export type DeclareFn = (_export: ExportFn, _context: Context) => Declare;
	export interface Declare {
		setters?: SetterFn[];
		execute?(): any;
	}
	export type SetterFn = (moduleValue: Module) => any;
	export type ExecuteFn = () => any;

	export interface ExportFn {
		(exportName: string, value: any): void;
		(exports: object): void;
	}

	export interface Context {
		import: ImportFn;
		meta: {
			url: string;
		};
	}

	export interface Module {
		default?: any;
		[exportName: string]: any;
	}
}

class ScriptRunner {
	stopped = false;
	console: Console;
	private context: object;

	constructor(private readonly port: MessagePort) {
		const logger = (level: LogLevel) => {
			return (...args: any[]) => {
				if (this.stopped) {
					self.console.log("(previous)", ...args);
					return;
				}
				self.console.log(...args);
				serialize(args, true, ctx.cache).then(([uidata, transfer]) =>
					this.respond<Log>({
						type: "log",
						level,
						args: uidata,
					}, transfer)
				);
			};
		};

		let console = this.console = {
			...self.console,
			log: logger("info"),
			info: logger("info"),
			warn: logger("warning"),
			debug: logger("debug"),
			error: logger("error"),
			trace: logger("trace"),
			assert(assertion, ...args: any[]) {
				if (!assertion) {
					this.error(...args);
				}
			},
			clear: () => {
				if (this.stopped) {
					return;
				}
				this.respond<ClearConsole>({
					type: "clearconsole",
				});
			},
			dir(obj) {
				this.info(obj);
			},
			dirxml(obj) {
				this.info(obj);
			},
		};

		let system: System = {
			register(...args: [string, string[], System.DeclareFn] | [string[], System.DeclareFn]) {
				if (typeof args[0] === "string") {
					// @ts-ignore
					[, ...args] = args;
				}
				let [deps, declare] = <[string[], System.DeclareFn]> args;

				let iport: System.ImportFn = name => {
					switch (name) {
						case "cache2":
						case "@abextm/cache2":
							return import("@abextm/cache2");
						case "viewer/context":
							return import("../context");
						case "lodash":
							return import("lodash");
						default:
							return import(name);
					}
				};

				let { setters, execute } = declare(() => {/*noop*/}, { import: iport, meta: { url: "/run.js" } });

				if (deps && setters) {
					return (async () => {
						try {
							let resolvedDeps = await Promise.all(deps.map(name => iport(name)));
							resolvedDeps.forEach((v, i) => setters![i](v));
							if (execute) {
								return await execute();
							}
						} catch (e) {
							console.error(e);
						}
					})();
				}
			},
		};

		this.context = {
			console,
			System: system,
			$_typed_: c2.Typed,
			_,
		};
	}

	async evaluate(source: string): Promise<unknown> {
		// @ts-ignore
		let keys: (keyof typeof this.context)[] = Object.keys(this.context);
		let values = keys.map(k => this.context[k]);

		return await new Function(...keys, source).bind(self, ...values)();
	}

	respond<T extends ScriptResponse>(v: T, transferables: Transferable[] = []) {
		try {
			this.port.postMessage(v, transferables);
		} catch (e) {
			console.error(e);
		}
	}

	stop() {
		this.stopped = true;
	}
}

let activeScript: ScriptRunner | undefined;

let index = {
	convertArchiveData(ad: c2.ArchiveData, named: boolean): any {
		let filesOut: any;
		if (named) {
			let files: Map<number, number> = new Map();
			for (let [fi, fd] of ad.files) {
				files.set(fi, fd.namehash);
			}
			filesOut = files;
		} else {
			filesOut = Array.from(ad.files.keys());
		}

		return {
			archive: ad.archive,
			namehash: ad.namehash,
			revision: ad.revision,
			compression: ad.compression,
			crc: ad.crc,
			files: filesOut,
		};
	},
	async load(cache: Promise<CacheProvider>, id: number): Promise<any> {
		try {
			let c = await cache;
			let v = await c.getIndex(id);

			if (!v) {
				return;
			}

			let archives: Map<number, any> = new Map();
			if (v instanceof c2.DiskIndexData || v instanceof c2.FlatIndexData) {
				for (let [aid, ad] of v.archives) {
					archives.set(aid, this.convertArchiveData(ad, v.named));
				}
			} else {
				throw new Error("unsupported cache type");
			}

			let out: any = {
				id: v.id,
				revision: v.revision,
				compression: v.compression,
				crc: v.crc,
				named: v.named,
				archives,
			};
			if ("protocol" in v) {
				out.protocol = v.protocol;
			}
			return out;
		} catch {
			// ignored
		}
	},
	async all(c: Promise<CacheProvider>): Promise<any[]> {
		let lastIndex = 21;
		let indexes: c2.IndexData[] = await Promise.all(
			_.range(0, lastIndex + 1)
				.map(async i => this.load(c, i)),
		);
		indexes = indexes.filter(v => v);

		for (let i = lastIndex; i < 255; i++) {
			let lastOk = indexes[indexes.length - 1].id;
			if (lastOk < i - 2) {
				break;
			}
			let v = await this.load(c, i);
			if (v) {
				indexes.push(v);
			}
		}

		return indexes;
	},
};

interface Filterable<T> {
	load(c: Promise<CacheProvider>, id: number): Promise<T>;
	all(c: Promise<CacheProvider>): Promise<T[]>;
}

let types: Record<LookupType, Filterable<unknown>> = {
	index,
	animation: c2.Animation,
	dbrow: c2.DBRow,
	dbtable: c2.DBTable,
	enum: c2.Enum,
	item: c2.Item,
	healthbar: c2.HealthBar,
	hitsplat: c2.Hitsplat,
	npc: c2.NPC,
	obj: c2.Obj,
	param: c2.Param,
	sprite: c2.Sprites,
	struct: c2.Struct,
	underlay: c2.Underlay,
};

async function loadAndFilter<T>(
	typ: Filterable<T>,
	filter: string | number,
): Promise<{ result: T[]; numeric: boolean; }> {
	if (typeof filter === "number") {
		return {
			result: [await typ.load(ctx.cache, filter)]
				.filter(v => v !== undefined),
			numeric: true,
		};
	}
	if (/^[0-9, -]+$/.test(filter)) {
		let v = await Promise.all(
			filter.split(",")
				.map(v => v.trim())
				.filter(v => v)
				.flatMap(v => {
					if (v.startsWith("-")) {
						return Number.parseInt(v);
					}
					let d = v.split("-");
					if (d.length == 1) {
						return [~~d[0]];
					}
					return _.range(~~d[0], ~~d[1] + 1);
				})
				.map(id => typ.load(ctx.cache, id)),
		);
		return {
			result: v.filter(v => v !== undefined),
			numeric: true,
		};
	} else {
		let re = new RegExp(filter, "iu");
		let v = (await typ.all(ctx.cache))
			.filter(v => re.test((v as any)?.name));
		return {
			result: v.filter(v => v !== undefined),
			numeric: false,
		};
	}
}

new ServiceServer<IRunnerPrivate>(self as DedicatedWorkerGlobalScope, {
	async prepare(cacheShare) {
		setCacheShare(ServiceClient.create(cacheShare));
	},
	executeScript(text, port) {
		activeScript?.stop();
		let script = activeScript = new ScriptRunner(port);
		script.respond<ClearConsole>({
			type: "clearconsole",
			silent: true,
		});
		return script.evaluate(text)
			.catch(e => script.console.error(e))
			.then(value => {
				if (script.stopped) {
					return;
				}

				if (value) {
					serialize([value], true, ctx.cache).then(([uidata, trans]) =>
						script.respond<Log>({
							type: "log",
							level: "done",
							args: uidata,
						}, trans)
					);
				}
			});
	},
	async lookup(type, filter) {
		let { result: v } = await loadAndFilter(types[type], filter);

		if (v.length == 1) {
			return ServiceServer.return(...await serialize(v[0], true, ctx.cache));
		}

		return ServiceServer.return(...await serialize(v, true, ctx.cache));
	},
	async spriteMetadata(filter) {
		let { result: sprites } = await loadAndFilter<c2.Sprites>(c2.Sprites, filter);
		return <c2.Sprites[]> <any> sprites.filter(s => {
			return filter || !(s.sprites.length == 1 && s.sprites[0].pixelsWidth === 0 && s.sprites[0].pixelsHeight === 0);
		}).map(s => ({
			...s,
			palette: undefined!,
			sprites: s.sprites.map(sp => ({
				...sp,
				pixels: undefined!,
			})),
		}));
	},
	async spriteImageData(id) {
		let sprite = await c2.Sprites.load(ctx.cache, id);
		if (!sprite) {
			return [];
		}
		return sprite.sprites.map(v => v.asImageData(true));
	},
	async namedSprite(name, index) {
		let sprites = await c2.Sprites.loadByName(ctx.cache, name);
		return sprites?.sprites?.[index]?.asImageData();
	},
	async dbTables(filter) {
		let { result: v, numeric } = await loadAndFilter<c2.DBTable>(c2.DBTable, filter);
		let contentFilter = undefined;
		if (v.length <= 0 && !numeric) {
			v = await c2.DBTable.all(ctx.cache);
			contentFilter = new RegExp(("" + filter).trim(), "iu");
		}
		let tabs = await Promise.all(v.map(async (tab) => {
			let rows = await c2.DBTable.loadRows(ctx.cache, tab.id);
			if (!rows) {
				return [tab.id, `Broken table ${tab.id}`] as const;
			}
			if (contentFilter) {
				rows = rows!.filter(r => r.values.some(v => v?.some(c => v !== undefined && contentFilter.test("" + c))));
				if (rows.length <= 0) {
					return [tab.id, undefined] as const;
				}
			}
			let at = new class extends ctx.AbstractTable {
				undefinedAsBlank = true;
				override getHeader() {
					let header: AbstractTable.ColumnHeader[][] = [
						[[undefined, 1]], // col id
						[[c2.Typed(c2.ScriptVarType.dbRow.id), 1]], // col type
						[[undefined, 1]], // col default value
					];
					for (let i = 0; i < tab.types.length; i++) {
						let types = tab.types[i];
						let dvs = tab.defaultValues[i];
						if (types === undefined) {
							continue;
						}
						header[0].push([i, types.length]);
						for (let ti = 0; ti < types.length; ti++) {
							let type = types[ti];
							header[1].push([c2.Typed(type), 1]);
							header[2].push([c2.ScriptVarType.withType(dvs?.[ti], type), 1]);
						}
					}
					if (tab.defaultValues.every(v => v === undefined)) {
						header.pop();
					}
					return header;
				}
				override getNumRows() {
					return rows!.length;
				}
				override getRow(i: number) {
					let row = rows![i];
					let vals = row.values.flatMap((col, i) => {
						let types = tab.types[i];
						if (!types) {
							return [];
						}
						if (!col) {
							return types.map(_v => undefined);
						}
						let out = types.map(_v => [] as any[]);
						for (let i = 0; i < col.length;) {
							for (let tup = 0; tup < types.length; tup++, i++) {
								let v = col[i];
								out[tup].push(
									v === undefined
										? undefined
										: c2.ScriptVarType.withType(v, types[tup]),
								);
							}
						}
						return out.map(v => v.length == 1 ? v[0] : v);
					});

					return [
						c2.ScriptVarType.dbRow.withType(row.id),
						...vals,
					];
				}
			}();
			return [tab.id, at] as const;
		}));

		if (contentFilter) {
			tabs = tabs.filter(v => v[1]);
		}

		if (tabs.length === 1 && !contentFilter) {
			return ServiceServer.return(...await serialize(tabs[0][1], false, ctx.cache));
		}
		return ServiceServer.return(...await serialize(new Map<c2.DBTableID, any>(tabs), false, ctx.cache));
	},
});
