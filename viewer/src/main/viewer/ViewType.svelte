<script lang="ts">
	import { LookupType, uiType } from "../../common/Runner";

	export let name: LookupType;
	export let index: number;
</script>

<a href="#/viewer/{name}/">
	<slot>
		{uiType(name)}
	</slot>
	<span class="viewer-id">{index}</span>
</a>

<style>
	a {
		display: block;

		text-decoration-line: none;
		color: inherit;
		padding-left: .25em;
	}
</style>