<script lang="ts">
	import { LookupType, uiType } from "../../common/Runner";
	import { UIData } from "../../common/uiobject";
	import JSObject from "./JSObject.svelte";

	export let value: UIData | undefined;
	export let type: LookupType;
</script>

{uiType(type)}
{#if value}
	<JSObject {value} expanded/>
{:else}
	Invalid
{/if}