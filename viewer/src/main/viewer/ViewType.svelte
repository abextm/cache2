<script lang="ts">
	import { LookupType, uiType } from "../../common/Runner";

	export let name: LookupType;
	export let key: LookupType | undefined;
	export let index: number;
</script>

<div on:click|preventDefault={() => key = name}>
	<slot>
		{uiType(name)}
	</slot>
	<span class="viewer-id">{index}</span>
</div>

<style>
	div {
		cursor: pointer;
		padding-left: .25em;
	}
</style>