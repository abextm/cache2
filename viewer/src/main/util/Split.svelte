<script lang="ts">
	export let vertical = false;
	export let primary: 1 | 2 = 1;
	export let size = 75;

	let root: HTMLDivElement;

	function move(ev: MouseEvent) {
		if ((ev.buttons & 1) == 0) {
			mouseUp();
			return;
		}
		ev.preventDefault();

		let splitCoord = vertical ? ev.clientY : ev.clientX;
		let rootBounds = root.getBoundingClientRect();
		let rootStart = vertical ? rootBounds.top : rootBounds.left;
		let rootEnd = vertical ? rootBounds.bottom : rootBounds.right;

		let coord = (splitCoord - rootStart) / (rootEnd - rootStart);
		coord = Math.min(Math.max(coord, 0), 1);

		size = coord * 100;
	}

	function mouseDown(ev: MouseEvent) {
		document.body.addEventListener("mousemove", move);
		document.body.addEventListener("mouseup", mouseUp);
		ev.preventDefault();
	}

	function mouseUp(_ev?: MouseEvent) {
		document.body.removeEventListener("mousemove", move);
		document.body.removeEventListener("mouseup", mouseUp);
	}

	function click(ev: MouseEvent) {
		ev.preventDefault();
		if (ev.button == 0 && ev.ctrlKey) {
			vertical = !vertical;
		}
	}
</script>

<style lang="scss">
	.split {
		display: inline-grid;
		width: 100%;
		height: 100%;
		& > :global(:not(.divider)) {
			overflow: auto;
			min-height: 0;
			min-width: 0;
		}
	}
	.divider {
		background-color: #8888;
		&:hover {
			opacity: 70%;
		}
		.vertical & {
			cursor: ns-resize;
		}
		.horizontal & {
			cursor: ew-resize;
		}
	}
</style>

<div bind:this={root}
	class="split" class:vertical class:horizontal={!vertical}
	style="grid-template-{vertical?"rows":"columns"}: {primary==1?size+"%":"1fr"} 4px {primary==2?size+"%":"1fr"}">
	<slot name="1"></slot>
	<div class="divider" on:click={click} on:mousedown={mouseDown}></div>
	<slot name="2"></slot>
</div>