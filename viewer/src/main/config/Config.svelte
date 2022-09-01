<script lang="ts">
	import { darkMode } from "../../common/db";
	import { mdiWeatherNight, mdiBrightness7 } from "@mdi/js";
	import MDIToggleButton from "../util/MDIToggleButton.svelte";
	import CacheSelector from "./CacheSelector.svelte";
</script>

<div class="tab-padded">
	Light/Dark mode: <MDIToggleButton
		on={mdiWeatherNight}
		off={mdiBrightness7}
		altOn="Switch to light mode"
		altOff="Switch to dark mode"
		offOpacity={1}
		bind:checked={$darkMode}/><br>

	<CacheSelector/>
</div>