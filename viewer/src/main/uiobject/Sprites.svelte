<svelte:options immutable={true} />
<script lang="ts">
	import { Sprites } from "@abextm/cache2";
  import { onDestroy } from "svelte";
  import { Action } from "svelte/action";
  import { Runner } from "../../common/Runner";

	export let sprites: Sprites[];
	export let runner: Runner;

	let observer = new IntersectionObserver(obs => {
		for (let ob of obs) {
			if (ob.isIntersecting) {
				let el = ob.target as HTMLElement;
				observer.unobserve(el);

				let id = ~~el.dataset.id!;
				runner.spriteImageData(id).then(datas => {
					el.querySelectorAll(".placeholder").forEach(ple => {
						let canvas = ple as HTMLCanvasElement;
						let index = ~~canvas.dataset.index!;
						let data = datas[index];
						canvas.width = data.width;
						canvas.height = data.height;
						canvas.getContext("2d")!.putImageData(data, 0, 0);
					});
				});
			}
		}
	});
	let observe: Action = el => {
		observer.observe(el);
		return {
			destroy() {
				observer.unobserve(el);
			}
		}
	};

	onDestroy(() => observer.disconnect());

	function toggle(ev: MouseEvent) {
		let target = ev.target as HTMLCanvasElement;
		let mul = target.classList.toggle("expanded")
			? 4
			: 1 / 4;

		target.style.width = (parseInt(target.style.width) * mul) + "px";
		target.style.height = (parseInt(target.style.height) * mul) + "px";
	}
</script>

{#each sprites as sprite}
	<div class="sprite" use:observe data-id={sprite.id}>
		{sprite.id} ({sprite.width} x {sprite.height})
		<div>
			{#each sprite.sprites as index}
				<canvas
					class="placeholder"
					data-index={index.index}
					style:width={sprite.width + "px"}
					style:height={sprite.height + "px"}
					title={`index ${index.index}, pixels=${index.pixelsWidth}x${index.pixelsHeight}, offset=${index.offsetX},${index.offsetY}, encodingFlags=${index.encodingFlags}`}
					on:click={toggle}
					></canvas>
			{/each}
		</div>
	</div>
{/each}

<style>
	canvas {
		padding: 2px;
		image-rendering: pixelated;
	}
</style>