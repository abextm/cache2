import { createPopper, Options } from "@popperjs/core";

export type TooltipFactory = (target: HTMLElement) => { $destroy(): void; };

function changeFocus(ev: FocusEvent | MouseEvent): void {
	let hev = new Event("hoverchange", {
		bubbles: true,
		cancelable: true,
		composed: true,
	});
	if (ev.target?.dispatchEvent(hev)) {
		looseFocus();
	}
}

let hovered: EventTarget | undefined;
function looseFocus() {
	if (hovered) {
		let v = hovered;
		hovered = undefined;
		v.dispatchEvent(new Event("hoverend"));
	}
}

function hoverChange(ev: Event) {
	ev.stopPropagation();
	ev.preventDefault();
	if (hovered === ev.currentTarget) {
		return;
	}
	looseFocus();
	hovered = ev.currentTarget!;
	document.body.addEventListener("focusout", looseFocus);
	ev.currentTarget?.dispatchEvent(new Event("hoverstart"));
}

document.body.addEventListener("mouseover", changeFocus);
document.body.addEventListener("focusin", changeFocus);

export function hoverListener(
	el: HTMLElement,
	enter: (ev: Event) => void,
	exit: (ev: Event) => void,
): void {
	el.addEventListener("hoverstart", enter as any);
	el.addEventListener("hoverend", exit as any);
	el.addEventListener("hoverchange", hoverChange);
}

let activeTooltipElement: HTMLElement | undefined;
let destroy: (() => void) | undefined;
let tooltip: HTMLDivElement = document.createElement("div");
tooltip.classList.add("tooltip");
tooltip.style.display = "none";

export function addTooltip<T extends HTMLElement>(el: T, fac: TooltipFactory, options?: Partial<Options>): T {
	return addTooltipAsync(el, () => Promise.resolve(fac), options);
}

export function addTooltipAsync<T extends HTMLElement>(
	el: T,
	afac: () => Promise<TooltipFactory | undefined>,
	options?: Partial<Options>,
): T {
	hoverListener(el, async ev => {
		ev.stopPropagation();
		ev.preventDefault();

		destroy?.();

		if (!tooltip.parentElement) {
			document.body.appendChild(tooltip);
		}

		activeTooltipElement = el;
		let fac = await afac();
		if (!fac || activeTooltipElement !== el) {
			return;
		}
		let dtor = fac(tooltip);

		let popper = createPopper(el, tooltip, options);
		tooltip.style.display = "block";

		destroy = () => {
			if (activeTooltipElement !== el) {
				return;
			}
			activeTooltipElement = undefined;
			destroy = undefined;
			tooltip.style.display = "none";

			popper.destroy();

			dtor?.$destroy?.();

			for (; tooltip.lastChild; tooltip.removeChild(tooltip.lastChild));
		};
	}, ev => {
		ev.stopPropagation();
		ev.preventDefault();

		if (activeTooltipElement !== el) {
			return;
		}
		destroy?.();
	});

	return el;
}
