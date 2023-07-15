<script lang="ts">
	export let tab: string;
	export let key: string;
</script>
<span
	class:selected={key && tab===key}
	on:click|preventDefault={() => tab=key}>
	<slot></slot>
</span>
<style lang="scss">
	span {
		display: inline-block;
		cursor: pointer;
		padding: 3px 8px;
	}
	span:not(.selected) {
		background-color: #8885;
		color: var(--color-inactive);
	}
	span.selected {
		background-color: var(--background);
	}
</style>