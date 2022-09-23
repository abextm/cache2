<script lang="ts">
	import { LookupType, uiType } from "../../common/Runner";
  import { lookupUI } from "./ObjectRenderer";

	export let ctor: Awaited<ReturnType<typeof lookupUI>>;
	export let type: LookupType;
</script>

{uiType(type)}
{#if ctor}
	<svelte:component this={ctor} context="tooltip" />
{:else}
	Invalid
{/if}