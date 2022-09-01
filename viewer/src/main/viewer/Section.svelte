<script lang="ts">
	export let name: string;
	export let index: number;
</script>

<div class="section">
	<div class="header">
		{name} <span class="viewer-id">{index}</span>
	</div>
	<div class="contents">
		<slot/>
	</div>
</div>

<style>
	.section {
		padding-left: .25em;
	}
	.contents {
		padding-left: .5em;
	}
</style>