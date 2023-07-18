import type { ErrorMessage, Request, Response } from "./reqres";
import "./status";

class Return {
	constructor(readonly v: any, readonly transfer: Transferable[]) {
	}
}

export class ServiceServer<T extends object> {
	constructor(private port: MessagePort | DedicatedWorkerGlobalScope, private handler: T) {
		port.onmessage = (ev: MessageEvent) => this.handle(ev);
	}

	public static return<T>(v: T, transferables: Transferable[]): T {
		throw new Return(v, transferables);
	}

	private async handle(ev: MessageEvent) {
		if (!("id" in ev.data)) {
			console.log("bad message", ev);
			return;
		}
		let v = <Request> ev.data;

		if (v.type == "newPort") {
			let p = <MessagePort> v.args[0];
			new ServiceServer<T>(p, this.handler);
			return;
		}

		try {
			if (v.type in this.handler) {
				let value = await (<any> this.handler)[v.type](...v.args);
				this.post({
					id: v.id,
					value,
				});
			}
		} catch (err: any) {
			if (err instanceof Return) {
				this.post({
					id: v.id,
					value: err.v,
				}, err.transfer);
				return;
			}
			console.debug(err);
			let msg: ErrorMessage = {
				name: err?.name || Object.getPrototypeOf(err)?.constructor?.name || typeof err,
				message: err.message || JSON.stringify(err),
				stack: err.stack || "",
			};

			this.post({
				id: v.id,
				error: msg,
			});
		}
	}

	private post(ev: Response, trans: Transferable[] = []) {
		this.port.postMessage(ev, trans);
	}
}
