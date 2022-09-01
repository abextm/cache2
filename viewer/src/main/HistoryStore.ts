import { isEqual } from "lodash";
import { Writable, writable } from "svelte/store";

interface State {
	tab: "viewer" | "editor" | "config";
	viewerKey: string | undefined;
	viewerFilter: string;
}

let ourState: State = {
	...history.state,
	...urlToState(window.location.hash),
};
let stores: [Writable<any>, keyof State][] = [];

export function historyStore<K extends keyof State>(
	key: K,
	default0?: State[K],
	mode: "push" | "replace" = "push",
): Writable<State[K]> {
	let getVal = () => ourState && (key in ourState) ? ourState[key] : default0;
	let s = writable(getVal());
	s.subscribe(v => {
		ourState[key] = v;
		if (history.state && isEqual(ourState[key], history.state[key])) {
			return;
		}
		let url = stateToURL(ourState);
		if (mode === "push" && url !== window.location.hash) {
			history.pushState(ourState, "", url);
		} else {
			history.replaceState(ourState, "", url);
		}
	});
	stores.push([s, key]);
	return s;
}

function stateToURL(state: State): string | undefined {
	if (!state.tab) {
		return undefined;
	}
	let s = "#/" + state.tab;
	if (state.tab === "viewer" && state.viewerKey) {
		s += "/" + state.viewerKey + "/" + encodeURIComponent(state.viewerFilter);
	}
	return s;
}

function urlToState(hash: string): Partial<State> {
	hash = hash.replace(/^[^#]*#?\/?/, "");
	let parts = hash.split("/");
	let newState: Partial<State> = {};
	newState.tab = parts[0] as any;
	if (newState.tab === "viewer") {
		newState.viewerKey = parts[1];
		newState.viewerFilter = parts[2];
	} else if (newState.tab === "editor" || newState.tab === "config") {
		// no further parsing
	} else {
		return {};
	}
	return newState;
}

window.addEventListener("popstate", ev => {
	ourState = {
		...ourState,
		...history.state,
		...urlToState(window.location.hash),
	};

	for (let [store, key] of stores) {
		store.set(ourState[key]);
	}
});
