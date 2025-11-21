import { Worker2 } from "../status/";
import type { Request, Response } from "./reqres";

interface Resolver {
	resolve: (v: any) => void;
	reject: (v: any) => void;
}

let isFirefox = navigator.userAgent.indexOf("Gecko") !== -1;
export const ServiceClientClosedError = isFirefox
	// due to FireFox bug 1642147, we cannot prevent these messages
	// from going to the console, so try to make them as small as possible
	// by not extending Error - and therefore not getting a stack trace
	? class ServiceClientClosedError extends Object {
		message = "Ignore this unhandled rejection - Service client closed";
	}
	: class ServiceClientClosedError extends Error {
		constructor() {
			super("Service client closed");
		}
	};
self.addEventListener("unhandledrejection", ev => {
	if (ev.reason instanceof ServiceClientClosedError) {
		ev.preventDefault();
	}
});

type Port = Worker | MessagePort;

export class ServiceClient {
	private _port: Port;
	private _nextID = 1;
	private _requests: Map<number, Resolver> = new Map();

	private constructor(port: Port, filter: (v: MessageEvent) => boolean) {
		this._port = port;
		port.onmessage = ev => filter(ev) || this._handle(ev);
		if (port instanceof Worker2) {
			port.exited.then(v => this.rejectAll());
		}
	}

	public static create<T>(
		port: Port,
		filter: (v: MessageEvent) => boolean = () => false,
	): T & ServiceClient {
		let sc = new ServiceClient(port, filter);
		let panic = () => {
			throw new Error();
		};
		return new Proxy(sc as T & ServiceClient, {
			defineProperty: panic,
			deleteProperty: panic,
			get: (self, type) => {
				if (type in self) {
					return (self as any)[type];
				}
				if (typeof type === "string") {
					return (...args: any[]) => sc._request(type, args);
				}
			},
			isExtensible: _ => false,
			set: panic,
		});
	}

	public close() {
		if ("terminate" in this._port) {
			this._port.terminate();
		} else if ("close" in this._port) {
			this._port.close();
		}

		this.rejectAll();
	}

	private rejectAll() {
		for (let { reject } of this._requests.values()) {
			reject(new ServiceClientClosedError());
		}
	}

	public readonly then: never = undefined!;

	public newPort(): MessagePort {
		let c = new MessageChannel();
		this._post({ type: "newPort", id: -1, args: [c.port1] }, [c.port1]);
		return c.port2;
	}

	private _request(type: string, args: any[]) {
		const id = this._nextID++;
		const p = new Promise((resolve, reject) => this._requests.set(id, { resolve, reject }));
		this._post({
			id,
			type,
			args,
		}, args.filter(a => a instanceof MessagePort));
		return p;
	}

	private async _handle(ev: MessageEvent) {
		if (!("id" in ev.data)) {
			console.log("bad message", ev);
			return;
		}
		let v = ev.data as Response;
		let h = this._requests.get(v.id);
		if (!h) {
			console.log("duplicate response", v);
			return;
		}
		this._requests.delete(v.id);
		if ("error" in v) {
			h.reject(v.error); // TODO: is this correct?
		} else {
			h.resolve(v.value);
		}
	}

	private _post(ev: Request, t?: Transferable[]) {
		if (this._port instanceof Worker2 && !this._port.isRunning) {
			this._port.ready.then(_ => this._port.postMessage(ev, t as any));
		} else {
			this._port.postMessage(ev, t as any);
		}
	}
}
