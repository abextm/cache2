import type { Request, Response } from "./reqres";
import { StatusWorkerMessageHandler } from "./status";

interface Resolver {
	resolve: (v: any) => void;
	reject: (v: any) => void;
}

type Port = Worker | MessagePort;

export class ServiceClient {
	private _port: Port;
	private _nextID = 1;
	private _requests: Map<number, Resolver> = new Map();
	private _statusListener?: StatusWorkerMessageHandler;

	private constructor(port: Port, name: string | undefined, filter: (v: MessageEvent) => boolean) {
		this._port = port;
		if (name) {
			this._statusListener = new StatusWorkerMessageHandler(name);
		}
		port.onmessage = ev => filter(ev) || this._handle(ev);
	}

	public static create<T>(
		port: Port,
		name: string | undefined = undefined,
		filter: (v: MessageEvent) => boolean = () => false,
	): T & ServiceClient {
		let sc = new ServiceClient(port, name, filter);
		let panic = () => {
			throw new Error();
		};
		return new Proxy(<T & ServiceClient> sc, {
			defineProperty: panic,
			deleteProperty: panic,
			get: (self, type) => {
				if (type in self) {
					return (<any> self)[type];
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

		this._statusListener?.stop();
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
			if (this._statusListener?.onMessage(ev)) {
				return;
			}
			console.log("bad message", ev);
			return;
		}
		let v = <Response> ev.data;
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
		this._port.postMessage(ev, <any> t);
	}
}
