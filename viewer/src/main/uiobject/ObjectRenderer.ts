import { getRunner, lookupTypes } from "../../common/Runner";
import {
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
import { addTooltip, addTooltipAsync, hoverListener } from "../util/tooltip";
import ReferenceTooltip from "./ReferenceTooltip.svelte";

// we don't use svelte to construct this because the svelte impl
// was very ugly and hard to change. Manually constructing the dom tree
// is easier and more performant in this case as we don't need much reactivity

export interface RenderedObject {
	setExpanded(v: boolean): void;
	destroy(destroyData: boolean | UIData): void;
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

function intersection(a: DOMRect, b: DOMRect): DOMRect {
	let left = Math.max(a.left, b.left);
	let right = Math.min(a.right, b.right);
	let top = Math.max(a.top, b.top);
	let bottom = Math.min(a.bottom, b.bottom);
	return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
}

function getVisibleArea(e: Element): DOMRect {
	let myBounds = e.getBoundingClientRect();
	let clip = myBounds;
	for (let p = e.parentElement; p; p = p.parentElement!) {
		clip = intersection(clip, p!.getBoundingClientRect());
	}
	return new DOMRect(
		clip.x - myBounds.x,
		clip.y - myBounds.y,
		clip.width,
		clip.height,
	);
}

export function renderObject(parent: HTMLElement, data: UIData, unwrap: boolean, showDefault: boolean): RenderedObject {
	let port = data.port;
	port?.start();

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
				let val = renderAny(es[i + 1], { clickParent: line });
				if (val) {
					line.append(
						renderAny(es[i], { unwrap: true, forceDefault: true }),
						": ",
						val,
					);
					element.appendChild(line);
				}
			}
		} else {
			for (let i = 0; i < es.length; i++) {
				element.append(renderAny(es[i], { unwrap: false, forceDefault: true }));
			}
		}
		element.dataset.start = "" + start;
		element.dataset.end = "" + end;
		return element;
	}

	let lineHeight = parseInt(window.getComputedStyle(parent).lineHeight);

	function recalcHeight(el: HTMLElement): void {
		let start = parseInt(el.dataset.start!);
		let end = parseInt(el.dataset.end!);
		el.style.height = (lineHeight * (end - start)) + "px";
	}

	let observers: IntersectionObserver[] = [];

	function renderList(
		v: UIList | UIPartialList,
		name: string | undefined,
		startBrace: string,
		endBrace: string,
		clickParent: HTMLElement | undefined,
	): HTMLElement {
		let entries = constructEntries(v[0], v[1]);

		if (v.length === 4) {
			const partial = v[3];

			let firstEntry = entries;
			entries = sp([firstEntry]);

			let detached = new Map<HTMLElement, HTMLElement>();

			let allocated: HTMLElement[] = [firstEntry];
			let numLinesAllocated = 0;

			// Using InteractionObserver is a bad idea, it won't fire updates
			// in certain cases and is impossible to avoid flashes of missing
			// entries
			// TODO: switch to something more reliable
			let obs = new IntersectionObserver(ios => {
				let update: {
					el: HTMLElement;
					start: number;
					end: number;
					len: number;
					minEntry: number;
					maxEntry: number;
				}[] = [];
				for (let io of ios) {
					if (io.intersectionRatio <= 0) {
						continue;
					}

					let el = io.target as HTMLElement;

					let visibleArea = getVisibleArea(el);
					if (visibleArea.height <= 0) {
						continue;
					}

					let det = detached.get(el);
					if (det) {
						el.replaceWith(det);
						detached.delete(el);
						continue;
					}

					let start = ~~el.dataset.start!;
					let end = ~~el.dataset.end!;
					let len = end - start;

					let minEntry = Math.floor(visibleArea.top / lineHeight) - 20;
					let maxEntry = Math.ceil(visibleArea.bottom / lineHeight) + 20;
					if (minEntry < 10) {
						minEntry = 0;
					}
					if (maxEntry > len - 10) {
						maxEntry = len;
					}
					if (minEntry >= maxEntry) {
						continue;
					}

					maxEntry = Math.min(maxEntry, minEntry + 200);
					update.push({ el, start, end, len, minEntry, maxEntry });
				}

				for (let { el, start, end, len, minEntry, maxEntry } of update) {
					let temp = createBlank(minEntry + start, maxEntry + start, true);

					if (minEntry > 0) {
						entries.insertBefore(createBlank(start, minEntry + start, false), el);
					}
					entries.insertBefore(temp, el);
					if (maxEntry < len) {
						entries.insertBefore(createBlank(maxEntry + start, end, false), el);
					}
					obs.unobserve(el);
					el.remove();

					let req: UIPartialRequest = {
						partial,
						start: minEntry + start,
						end: maxEntry + start,
					};
					async function recv(ev: MessageEvent<UIPartialResponse>) {
						if (ev.data.partial !== req.partial || ev.data.start !== req.start || ev.data.end !== req.end) {
							return;
						}

						ev.stopPropagation();

						await new Promise(requestAnimationFrame);

						let el = constructEntries(v[0], ev.data.entries, ev.data.start, ev.data.end);

						numLinesAllocated += el.children.length;
						let free: { el: HTMLElement; height: number; }[] = [];

						for (let t = 0; t < 5 && numLinesAllocated > 500; t++) {
							let el = allocated.shift()!;
							if (!el) {
								break;
							}
							let vis = getVisibleArea(el);
							if (vis.height > 0) {
								allocated.push(el);
								continue;
							}

							let height = el.getBoundingClientRect().height;
							if (Math.abs(height - el.childNodes.length * lineHeight) > 2) {
								let bl = createBlank(~~el.dataset.start!, ~~el.dataset.end!, false, height);
								bl.classList.add("nomerge");
								el.replaceWith(bl);
								detached.set(bl, el);
								continue;
							}

							free.push({ el, height });
						}

						temp.replaceWith(el);
						allocated.push(el);

						for (let { el, height } of free) {
							let mergeSibs = [el.previousElementSibling, el.nextElementSibling]
								.filter(el => el && el.classList.contains("blank") && !el.classList.contains("nomerge"))
								.map(v => v as HTMLElement);

							if (mergeSibs.length === 2) {
								el.remove();
								obs.unobserve(mergeSibs[1]);
								mergeSibs[1].remove();
								mergeSibs[0].dataset.end = mergeSibs[1].dataset.end;
								recalcHeight(mergeSibs[0]);
							} else if (mergeSibs[0] === el.previousElementSibling) {
								el.remove();
								mergeSibs[0].dataset.end = el.dataset.end;
								recalcHeight(mergeSibs[0]);
							} else if (mergeSibs[0] === el.nextElementSibling) {
								el.remove();
								mergeSibs[0].dataset.start = el.dataset.start;
								recalcHeight(mergeSibs[0]);
							} else {
								let bl = createBlank(~~el.dataset.start!, ~~el.dataset.end!, false, height);
								el.replaceWith(bl);
							}
							numLinesAllocated -= el.children.length;
						}
					}

					port!.addEventListener("message", recv);
					port!.postMessage(req);
				}
			});
			observers.push(obs);

			function createBlank(start: number, end: number, temp: boolean, height?: number): HTMLElement {
				let element = sp([], "blank");
				element.style.height = (height ?? (lineHeight * (end - start))) + "px";
				element.dataset.start = "" + start;
				element.dataset.end = "" + end;

				if (!temp) {
					obs.observe(element);
				} else {
					element.classList.add("nomerge");
				}
				return element;
			}
			entries.appendChild(createBlank(v[1].length, v[2], false));
		}

		entries.classList.add("entries");

		let e = sp([
			name && sp(name, "type"),
			startBrace,
			entries,
			endBrace,
		], "list");
		expandable(e, clickParent);
		return e;
	}

	function renderAny(v: UIAny, a: { unwrap?: boolean; forceDefault: true; clickParent?: HTMLElement; }): HTMLElement;
	function renderAny(
		v: UIAny,
		a?: { unwrap?: boolean; forceDefault?: boolean; clickParent?: HTMLElement; },
	): HTMLElement | undefined;
	function renderAny(
		v: UIAny,
		{ unwrap, forceDefault, clickParent }: { unwrap?: boolean; forceDefault?: boolean; clickParent?: HTMLElement; } = {
			unwrap: false,
			forceDefault: false,
		},
	): HTMLElement | undefined {
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

			let e = sp(`"${escape(v)}"`, "string");
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
					return renderAny(v[1][0], { unwrap: false, forceDefault: true });
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
			let e = renderAny(v[2], { unwrap, forceDefault, clickParent });
			if (e) {
				let type = v[1][0];
				e.dataset.type = type;

				let val = v[2];
				if (typeof val === "number" && type in lookupTypes) {
					let ty2 = lookupTypes[type as keyof typeof lookupTypes];
					let a = document.createElement("a");
					a.href = `#/viewer/${ty2}/${val}`;
					a.classList.add("number");
					a.appendChild(e);
					a.addEventListener("click", ev => ev.stopPropagation());
					e = a;
					addTooltipAsync(clickParent ?? e, async () => {
						let value = await getRunner().lookup(ty2, "" + val);
						return target => new ReferenceTooltip({ target, props: { value, type: ty2 } });
					});
				}
				if (typeof val === "number" && (type === "HSL" || type === "RGB")) {
					let color: string;
					if (type === "HSL") {
						let h = ((val >> 10) & 63) / 64;
						let s = ((val >> 7) & 7) / 8;
						let l = (val & 127) / 128;
						h += .5 / 64;
						s += .5 / 8;
						color = `hsl(${h * 360}deg, ${s * 100}%, ${l * 100}%)`;
					} else {
						color = `rgb(${val >> 16 & 0xFF}, ${val >> 8 & 0xFF}, ${val & 0xFF})`;
					}
					let swatch = sp([], "swatch");
					swatch.style.backgroundColor = color;
					e = sp([swatch, e]);
				}
			}
			return e;
		}

		if (type === UIType.DefaultValue) {
			if (showDefault || forceDefault) {
				return renderAny(v, { unwrap, forceDefault, clickParent });
			}
			return undefined;
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
		let el = renderAny(data.value, { unwrap, forceDefault: true });

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
