<script lang="ts">
	import { LookupType, uiType } from "../../common/Runner";

	export let name: LookupType;
	export let key: LookupType | undefined;
</script>

<div on:click|preventDefault={() => key = name}>
	<slot>
		{uiType(name)}
	</slot>
</div>

<style>
	div {
		cursor: pointer;
		padding-left: .25em;
	}
</style>