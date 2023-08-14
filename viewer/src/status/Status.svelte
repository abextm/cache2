<script lang="ts">
  import { windowIdentifier } from "./internal";
  import { StatusChannelMessage } from "./status";

	let status: string | undefined;
	{
		let statuses: {
			owner: string,
			text: string,
		}[] = [];

		let workers = new Map<string, any>();

		function workerDied(owner: string) {
			statuses.filter(v => v.owner !== owner);
			status = statuses.at(-1)?.text;
		}

		new BroadcastChannel(`status-${windowIdentifier}`).addEventListener("message", (ev: MessageEvent<StatusChannelMessage>) => {
			if (ev.data.type === "add") {
				statuses.push(ev.data);
				if (ev.data.isWorkerReadyChange) {
					// worker is starting, no way to tell if it worked
					workers.set(ev.data.owner, setTimeout(() => workerDied(ev.data.owner), 10_000));
				}
			} else if (ev.data.type === "remove") {
				let index = statuses.findIndex(s => s.owner === ev.data.owner && s.text === ev.data.text);
				if (index === -1) {
					console.warn("unknown status remove", ev);
					return;
				}
				statuses.splice(index, 1);
				if (ev.data.isWorkerReadyChange) {
					clearTimeout(workers.get(ev.data.owner));
					workers.delete(ev.data.owner);
					navigator.locks.request(`worker-running-${ev.data.owner}`, () => {})
						.then(() => workerDied(ev.data.owner));
				}
			}
			status = statuses.at(-1)?.text;
		});
	}
</script>

<span class="status">
	{#if status}
		<div class="spinner"></div>
		{status}
	{/if}
</span>

<style lang="scss">
	.spinner {
		position: relative;
		display: inline-grid;
		place-items: center;
		width: 1em;
		padding-bottom: .5em;
	}
	.spinner::before, .spinner::after {
		content: '';
		box-sizing: border-box;
		position: absolute;
		width: .4em;
		height: .4em;
		background-color: var(--color-inactive);
		animation: spinner 2s cubic-bezier(0, 0, 0.24, 1.21) infinite;
		top: 50%;
		left: 50%;
	}
	.spinner::after {
		animation-delay: -1s;
	}

	@keyframes spinner {
		0%, 100% {
			transform: none;
		}
		25% {
			transform: translateX(-120%);
		}
		50% {
			transform: translateX(-120%) translateY(-120%);
		}
		75% {
			transform: translateY(-120%);
		}
	}

	.status {
		margin-left: auto;
		flex-shrink: 10;
		padding: 0 4px;
		font-size: 90%;
		line-height: 2em;
		font-variant-caps: all-small-caps;
		color: var(--color-inactive);
	}
</style>