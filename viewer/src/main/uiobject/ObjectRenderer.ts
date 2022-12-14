import { mdiRepeatVariant } from "@mdi/js";
import { ScriptVarChar, ScriptVarID, ScriptVarType, WearPos } from "cache2";
import { ComponentConstructorOptions, SvelteComponentTyped } from "svelte";
import { getRunner, LookupType, lookupTypes, Runner } from "../../common/Runner";
import {
	PartialListID,
	TypedArray,
	UIAny,
	UIData,
	UIList,
	UIListType,
	UIPartialList,
	UIPartialRequest,
	UIPartialResponse,
	UIType,
} from "../../common/uiobject";
import { measure, mutate } from "../util/DOMTiming";
import { addTooltip, addTooltipAsync, hoverListener } from "../util/tooltip";
import JSObject from "./JSObject.svelte";
import ReferenceTooltip from "./ReferenceTooltip.svelte";
import Sprites from "./Sprites.svelte";

// we don't use svelte to construct this because the svelte impl
// was very ugly and hard to change. Manually constructing the dom tree
// is easier and more performant in this case as we don't need much reactivity

export interface RenderedObject {
	setExpanded(v: boolean): void;
	destroy(destroyData: boolean | UIData): void;
}

function patchProps<A extends object, B extends object>(
	ctor: typeof SvelteComponentTyped<A>,
	props: Omit<A, keyof B>,
): typeof SvelteComponentTyped<B> {
	return <any> function(opts: ComponentConstructorOptions<B>) {
		return new ctor({
			...opts,
			props: <any> {
				...opts.props!,
				...props,
			},
		});
	};
}

export async function lookupUI<T extends LookupType>(
	runner: Runner,
	type: T,
	filter: string | number,
	style: string,
): Promise<typeof SvelteComponentTyped<{ context: "viewer" | "tooltip"; }> | undefined> {
	if (type === "sprite" && style === "default") {
		let sprites = await runner.spriteMetadata("" + filter);
		return patchProps(Sprites, { sprites, runner });
	}
	let uiobj = await runner.lookup(type, filter);
	if (uiobj) {
		return patchProps(JSObject, {
			expanded: true,
			value: uiobj,
		});
	}
}

let activeBlob: string | undefined;

function anyIsTypedArray(v: UIAny): v is UIList<`${string}Array`> {
	return Array.isArray(v) && typeof v[0] === "string" && v[0].endsWith("Array");
}

function onClick<T extends HTMLElement>(
	e: T,
	onClick: (ev: MouseEvent) => void,
	predicate?: (ev: Event) => boolean,
): T {
	e.addEventListener("click", ev => {
		if (predicate && !predicate(ev)) {
			return;
		}
		ev.preventDefault();
		ev.stopPropagation();
		onClick(ev);
	});
	hoverListener(e, ev => {
		if (predicate && !predicate(ev)) {
			return;
		}
		ev.preventDefault();
		ev.stopPropagation();
		e.classList.add("hovered");
	}, ev => {
		ev.preventDefault();
		ev.stopPropagation();
		e.classList.remove("hovered");
	});
	return e;
}

function intersect(a: DOMRect | undefined, b: DOMRect | HTMLElement | undefined): DOMRect | undefined {
	if (!a || !b) {
		return;
	}

	if (b instanceof Element) {
		b = b.getBoundingClientRect();
	}

	let left = Math.max(a.left, b.left);
	let top = Math.max(a.top, b.top);
	let right = Math.min(a.right, b.right);
	let bottom = Math.min(a.bottom, b.bottom);

	if (left > right || top > bottom || (top == bottom && right == bottom)) {
		return;
	}

	return new DOMRect(left, top, right - left, bottom - top);
}

function visibleScreenArea(element: HTMLElement): DOMRect | undefined {
	let screenVis = element.getBoundingClientRect();
	for (let p = element.parentElement!; p && (p = p.parentElement!) && p !== document.documentElement;) {
		if (!(screenVis = intersect(screenVis, p)!)) {
			break;
		}
	}
	return screenVis;
}

function screenToElement(screen: DOMRect, element: HTMLElement): DOMRect {
	let rect = element.getBoundingClientRect();
	return new DOMRect(
		screen.x - rect.x,
		screen.y - rect.y,
		screen.width,
		screen.height,
	);
}

function addVerticalPadding(r: DOMRect, dh: number): DOMRect {
	return new DOMRect(
		r.x,
		r.y - dh,
		r.width,
		r.height + dh + dh,
	);
}

export function renderObject(parent: HTMLElement, data: UIData, unwrap: boolean): RenderedObject {
	let port = data.port;
	port?.start();

	let loadedPartials = new Map<PartialListID, number>();
	(<any> window).ll = loadedPartials;

	function expandable<T extends HTMLElement>(e: T, clickParent: HTMLElement = e): T {
		e.classList.add("expandable", "collapsed");
		onClick(clickParent, () => setExpanded(e), ev => {
			let el = (ev.currentTarget as HTMLElement).parentElement!;
			return el.closest(".collapsed") === null;
		});
		return e;
	}

	function sp(contents: string | (string | Node | undefined | null)[], ...classes: string[]): HTMLSpanElement {
		let e = document.createElement("span");
		if (typeof contents === "string") {
			contents = [contents];
		}
		e.append(...contents.filter(v => v) as any);
		if (classes.length > 0) {
			e.classList.add(...classes);
		}
		return e;
	}

	function linkTyped(e: HTMLElement, clickParent: HTMLElement | undefined, ty2: LookupType, val: number): HTMLElement {
		let a = document.createElement("a");
		a.href = `#/viewer/${ty2}/${val}`;
		a.classList.add("number");
		a.appendChild(e);
		a.addEventListener("click", ev => ev.stopPropagation());
		addTooltipAsync(clickParent ?? a, async () => {
			let ctor = await lookupUI(getRunner(), ty2, "" + val, "default");
			return target => new ReferenceTooltip({ target, props: { ctor, type: ty2 } });
		});
		return a;
	}

	function openBlob(v: Blob) {
		if (activeBlob) {
			URL.revokeObjectURL(activeBlob);
			activeBlob = undefined;
		}
		let url = URL.createObjectURL(v);
		activeBlob = url;
		window.open(url, "_blank");
	}

	function constructEntries(
		type: UIListType,
		es: UIAny[] | TypedArray,
		start = 0,
		end: number = start + es.length,
	): HTMLElement {
		let element = sp([], "inner");
		if (type == UIType.Object || type == UIType.Map) {
			for (let i = 0; i < es.length; i += 2) {
				let line = sp([]);
				let useClickParent = !Array.isArray(es[i]);
				let val = renderAny(es[i + 1], { clickParent: useClickParent ? line : undefined });
				if (val) {
					line.append(
						renderAny(es[i], { unwrap: true }),
						": ",
						val,
					);
					element.appendChild(line);
				}
			}
		} else {
			for (let i = 0; i < es.length; i++) {
				element.append(renderAny(es[i], { unwrap: false }));
			}
		}
		element.dataset.start = "" + start;
		element.dataset.end = "" + end;
		return element;
	}

	let lineHeight = parseInt(window.getComputedStyle(parent).lineHeight);

	let observers: IntersectionObserver[] = [];

	function renderList(
		v: UIList | UIPartialList,
		name: string | undefined,
		startBrace: string,
		endBrace: string,
		clickParent: HTMLElement | undefined,
	): HTMLElement {
		let thisPartialLoaded = 0;
		if (v.length === 5) {
			const partial = v[3];
			thisPartialLoaded = loadedPartials.get(partial) ?? 0;
			loadedPartials.set(partial, thisPartialLoaded + 1);
		}

		let entries = constructEntries(v[0], v[1]);

		if (v.length === 5) {
			const partial = v[3];

			let firstEntry = entries;
			entries = sp([v[1].length > 0 ? firstEntry : null]);
			entries.dataset.partial = "" + partial;

			let detached = new Map<HTMLElement, HTMLElement>();

			let allocated: HTMLElement[] = [firstEntry];
			let numLinesAllocated = 0;

			async function attachVisibleElements(sentinals: HTMLElement[], parentScreen = visibleScreenArea(parent)) {
				if (!parentScreen || sentinals.length <= 0) {
					return;
				}
				await measure();
				let update: {
					blank: HTMLElement;
					sentinal: HTMLElement;
					start: number;
					end: number;
					len: number;
					minEntry: number;
					maxEntry: number;
				}[] = [];
				for (let sentinal of sentinals) {
					let blank = sentinal.parentElement!;
					let screenVisibleArea = intersect(addVerticalPadding(parentScreen, 500), blank.getBoundingClientRect());
					if (!screenVisibleArea) {
						continue;
					}

					let visibleArea = screenToElement(screenVisibleArea, blank);

					let det = detached.get(blank);
					if (det) {
						obs.unobserve(sentinal);
						blank.replaceWith(det);
						detached.delete(blank);
						break;
					}

					let start = ~~blank.dataset.start!;
					let end = ~~blank.dataset.end!;
					let len = end - start;

					let minEntry = Math.floor(visibleArea.top / lineHeight) - 20;
					let maxEntry = Math.ceil(visibleArea.bottom / lineHeight) + 20;
					if (minEntry < 10) {
						minEntry = 0;
					}
					if (maxEntry > len - 10) {
						maxEntry = len;
						if (minEntry >= maxEntry) {
							minEntry = Math.max(0, len - 50);
						}
					}
					if (minEntry >= maxEntry) {
						continue;
					}

					maxEntry = Math.min(maxEntry, minEntry + 500);
					update.push({ blank, sentinal, start, end, len, minEntry, maxEntry });
					break;
				}

				await mutate();
				let outstandingUpdates = 0;
				for (let { blank, sentinal, start, end, len, minEntry, maxEntry } of update) {
					let temp = createBlank(minEntry + start, maxEntry + start, true);

					let bits: HTMLElement[] = [];
					if (minEntry > 0) {
						bits.push(createBlank(start, minEntry + start, false));
					}
					bits.push(temp);
					if (maxEntry < len) {
						bits.push(createBlank(maxEntry + start, end, false));
					}
					obs.unobserve(sentinal);
					blank.replaceWith(...bits);

					let req: UIPartialRequest = {
						partial,
						start: minEntry + start,
						end: maxEntry + start,
					};
					outstandingUpdates++;
					async function recv(ev: MessageEvent<UIPartialResponse>) {
						if (ev.data.partial !== req.partial || ev.data.start !== req.start || ev.data.end !== req.end) {
							return;
						}

						port!.removeEventListener("message", recv);
						ev.stopPropagation();

						await measure();

						let el = constructEntries(v[0], ev.data.entries, ev.data.start, ev.data.end);

						numLinesAllocated += el.children.length;
						let free: { el: HTMLElement; height: number; }[] = [];
						let parentScreen = visibleScreenArea(parent);
						let noFree = parentScreen && addVerticalPadding(parentScreen, 750);
						for (let t = 0; t < 5 && numLinesAllocated > 500; t++) {
							let el = allocated.shift()!;
							if (!el) {
								break;
							}
							if (intersect(noFree, el)) {
								allocated.push(el);
								continue;
							}

							let height = el.getBoundingClientRect().height;
							free.push({ el, height });
						}
						if (--outstandingUpdates === 0) {
							attachVisibleElements(sentinals.filter(el => el.parentElement!.parentElement), parentScreen);
						}

						await mutate();
						temp.replaceWith(el);
						allocated.push(el);

						for (let { el, height } of free) {
							el.querySelectorAll("[data-partial]")
								.forEach(p => {
									let partial = ~~(p as HTMLElement).dataset.partial! as PartialListID;
									loadedPartials.set(partial, (loadedPartials.get(partial) ?? 0) - 1);
								});

							if (Math.abs(height - el.childNodes.length * lineHeight) > 2) {
								let bl = createBlank(~~el.dataset.start!, ~~el.dataset.end!, false, height);
								bl.classList.add("nomerge");
								el.replaceWith(bl);
								detached.set(bl, el);
								continue;
							}

							function isMergable(el: Element | null): HTMLElement | undefined {
								return el && el.classList.contains("blank") && !el.classList.contains("nomerge")
									? el as HTMLElement
									: undefined;
							}
							let start = isMergable(el.previousElementSibling) ?? el;
							let end = isMergable(el.nextElementSibling) ?? el;
							let bl = createBlank(~~start.dataset.start!, ~~end.dataset.end!, false);
							el.replaceWith(bl);
							start.remove();
							end.remove();
							numLinesAllocated -= el.children.length;
						}
					}

					port!.addEventListener("message", recv);
					port!.postMessage(req);
				}
			}

			let obs = new IntersectionObserver(ios => {
				let els: HTMLElement[] = [];
				for (let io of ios) {
					if (io.isIntersecting) {
						els.push(io.target as HTMLElement);
					}
				}
				if (els.length) {
					attachVisibleElements(els);
				}
			});
			observers.push(obs);

			function createBlank(start: number, end: number, temp: boolean, height?: number): HTMLElement {
				let element = sp([], "blank");
				element.style.height = (height ?? (lineHeight * (end - start))) + "px";
				element.dataset.start = "" + start;
				element.dataset.end = "" + end;

				if (!temp) {
					let sentinal = sp([], "sentinal");
					element.appendChild(sentinal);
					obs.observe(sentinal);
				} else {
					element.classList.add("nomerge");
				}
				return element;
			}
			let end = v[1].length;
			if (v[0] === UIType.Object || v[0] === UIType.Map) {
				end /= 2;
			}
			entries.appendChild(createBlank(end, v[2], false));
		}

		let len = v[2];
		if (!len) {
			len = v[1].length;
			if (v[0] === UIType.Object || v[0] === UIType.Map) {
				len /= 2;
			}
		}

		let cycle: Element | undefined;
		entries.classList.add("entries");
		if (v[4] && thisPartialLoaded > 0) {
			entries.classList.add("cycle");

			const svgns = "http://www.w3.org/2000/svg";
			cycle = document.createElementNS(svgns, "svg");
			cycle.classList.add("mdi", "cycle-icon");
			cycle.setAttribute("viewBox", "0 0 24 24");
			let p = document.createElementNS(svgns, "path");
			p.setAttribute("d", mdiRepeatVariant);
			cycle.appendChild(p);
		}

		let expander = sp([
			name && sp(name, "type"),
			v[0] !== UIType.Object ? sp(`(${len})`, "length") : null,
			startBrace,
			cycle,
			entries,
			endBrace,
		], "list");
		expandable(expander, clickParent);
		return expander;
	}

	function renderAny(
		v: UIAny,
		{ unwrap = false, clickParent }: { unwrap?: boolean; clickParent?: HTMLElement; } = {},
	): HTMLElement {
		if (typeof v === "string") {
			const escapes: { [key: string]: string; } = {
				"\0": "0",
				"\n": "n",
				'"': '"',
				"\r": "r",
				"\t": "t",
			};

			const wsSet = new Set(["\n", "\r", "\t"]);

			function escape(s: string, ws?: boolean): string {
				return s.replace(/["\x00-\x1f]/g, c => {
					if (ws && wsSet.has(c)) {
						return c;
					}
					let esc = escapes[c];
					if (!esc) {
						esc = "x" + c.charCodeAt(0).toString(16);
					}
					return "\\" + esc;
				});
			}

			let escaped = escape(v);
			if (unwrap && !/[^a-z0-9$_]/i.test(escaped)) {
				return sp(v, "identstr");
			}

			escaped = `"${escaped}"`;
			let bits: (string | Node)[] = [];
			let re = /(?:(<img=)([0-9]+)(>))|(?:(<col=)([0-9a-fA-F]+)(>))|<[^>]+>|[^<]+/g;
			for (let m: RegExpExecArray; (m = re.exec(escaped)!) != null;) {
				let str = m[0];
				if (m[1] !== undefined) {
					let val = Number.parseInt(m[2], 10);
					let icon = document.createElement("canvas");
					getRunner().namedSprite("mod_icons", val)
						.then(img => {
							if (img) {
								icon.style.width = (icon.width = img.width) + "px";
								icon.style.height = (icon.height = img.height) + "px";
								icon.getContext("2d")!.putImageData(img, 0, 0);
							}
						});
					bits.push(sp([m[1], icon, m[2] + m[3]], "tag"));
				} else if (m[4] !== undefined) {
					let val = Number.parseInt(m[5], 16);
					let color = `rgb(${val >> 16 & 0xFF}, ${val >> 8 & 0xFF}, ${val & 0xFF})`;
					let swatch = sp([], "swatch");
					swatch.style.backgroundColor = color;
					bits.push(sp([m[4], swatch, m[5] + m[6]], "tag"));
				} else if (str.startsWith("<")) {
					bits.push(sp(str, "tag"));
				} else {
					bits.push(str);
				}
			}

			let e = sp(bits, "string");
			addTooltip(clickParent ?? e, p => {
				let el = document.createElement("pre");
				el.textContent = v;
				p.appendChild(el);
				return {
					$destroy() {
						el.remove();
					},
				};
			});
			return e;
		}
		if (typeof v !== "object" || v === null) {
			let type = v === null ? "null" : typeof v;
			return sp("" + v, type);
		}

		if (!Array.isArray(v)) {
			if (v instanceof Blob) {
				let e = sp(["Blob(", renderAny(v.size), ")"], "blob");
				e.addEventListener("click", _ev => openBlob(v));
				return e;
			} else if (v instanceof ImageData) {
				let c = document.createElement("canvas");
				c.width = v.width;
				c.height = v.height;
				c.getContext("2d")?.putImageData(v, 0, 0);
				expandable(c, clickParent);
				addTooltip(clickParent ?? c, p => {
					let c = document.createElement("canvas");
					c.width = v.width;
					c.height = v.height;
					c.getContext("2d")?.putImageData(v, 0, 0);
					p.appendChild(c);
					return {
						$destroy() {
							c.remove();
						},
					};
				});
				return c;
			} else {
				return sp("unknown");
			}
		}

		const type = v[0];
		if (
			type === UIType.Object
			|| type === UIType.Map
			|| type === UIType.Array
			|| type === UIType.Set
			|| type === UIType.ArrayBuffer
			|| anyIsTypedArray(v)
		) {
			let name = "";
			let brace: "[" | "{" | "" = "[";
			if (type === UIType.Object) {
				brace = "{";
			} else if (type === UIType.Map) {
				brace = "{";
				name = "Map";
			} else if (type === UIType.Set) {
				name = "Set";
			} else if (type === UIType.ArrayBuffer) {
				name = "ArrayBuffer";
			}
			if (anyIsTypedArray(v)) {
				name = v[0];
			}

			if (unwrap) {
				brace = "";
			}

			if (unwrap && type === UIType.Array) {
				if (v[1].length === 1) {
					return renderAny(v[1][0], { unwrap: false });
				}
			}

			let otherBrace = {
				"{": "}",
				"[": "]",
				"": "",
			};

			return renderList(v, name, brace, otherBrace[brace], clickParent);
		}

		if (type === UIType.Typed) {
			let type = v[1][0];
			let val = v[2];
			if (typeof val === "number" && (type === "HSL" || type === "RGB")) {
				let color: string;
				let str: string;
				if (type === "HSL") {
					let h = ((val >> 10) & 63) / 64;
					let s = ((val >> 7) & 7) / 8;
					let l = (val & 127) / 128;
					h += .5 / 64;
					s += .5 / 8;
					color = `hsl(${h * 360}deg, ${s * 100}%, ${l * 100}%)`;
					str = "" + val;
				} else {
					color = `rgb(${val >> 16 & 0xFF}, ${val >> 8 & 0xFF}, ${val & 0xFF})`;
					str = "0x" + val.toString(16);
				}
				let swatch = sp([], "swatch");
				swatch.style.backgroundColor = color;
				return sp([swatch, str]);
			}
			if (typeof val === "number" && (type === "ScriptVarChar" || type === "ScriptVarID")) {
				let svt = type === "ScriptVarChar"
					? ScriptVarType.forChar(val as ScriptVarChar)
					: ScriptVarType.forID(val as ScriptVarID);
				if (svt) {
					return sp([svt.name], "type");
				}
			}
			if (typeof val === "number" && type === "WearPos") {
				let name = WearPos.byID[val];
				if (name) {
					return sp([name], "type");
				}
			}
			let e = renderAny(v[2], { unwrap, clickParent });
			if (e) {
				e.dataset.type = type;

				if (typeof val === "number" && val >= 0 && type in lookupTypes) {
					let ty2 = lookupTypes[type as keyof typeof lookupTypes];
					e = linkTyped(e, clickParent, ty2, val);
				}
			}
			return e;
		}

		return sp("unknown");
	}

	function setExpanded(e: HTMLElement, value?: boolean) {
		if (value === undefined) {
			value = e.classList.contains("collapsed");
		}

		if (!value) {
			e.classList.add("collapsed");
			e.querySelectorAll(".expandable:not(.collapsed)").forEach(el => el.classList.add("collapsed", "child-expanded"));
		} else {
			e.classList.remove("collapsed");
			e.querySelectorAll(".expandable.child-expanded").forEach(el =>
				el.classList.remove("child-expanded", "collapsed")
			);
		}
	}

	{
		let el = renderAny(data.value, { unwrap });

		for (; parent.lastChild; parent.removeChild(parent.lastChild));
		parent.appendChild(el);
		el.classList.add("root");

		return {
			setExpanded(expanded) {
				setExpanded(el, expanded);
			},
			destroy(destroyData: boolean | UIData) {
				if (destroyData !== false && destroyData !== data) {
					port?.close();
				}

				for (let obs of observers) {
					obs.disconnect();
				}
			},
		};
	}
}
