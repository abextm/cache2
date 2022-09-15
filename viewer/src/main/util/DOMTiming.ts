type cb = () => void;

let read: cb[] = [];
let write: cb[] = [];

let isScheduled = 0;

function flush(cbs: cb[]) {
	for (let cb: cb; cb = cbs.shift()!;) {
		try {
			cb();
		} catch (e) {
			console.error(e);
		}
	}
}

function enqueue(cbs: cb[], scheduleLevel: number, cb?: () => void): Promise<void> | void {
	let out: Promise<void> | undefined;
	if (!cb) {
		out = new Promise(ok => cb = ok);
	}

	cbs.push(cb!);
	if (isScheduled < scheduleLevel) {
		isScheduled = 2;
		requestAnimationFrame(() => {
			flush(read);
			isScheduled = 1;
			flush(write);
			if (isScheduled === 1) {
				isScheduled = 0;
			}
		});
	}

	return out;
}

export function measure(cb: () => void): void;
export function measure(): Promise<void>;
export function measure(cb?: () => void): Promise<void> | void {
	return enqueue(read, 2, cb);
}

export function mutate(cb: () => void): void;
export function mutate(): Promise<void>;
export function mutate(cb?: () => void): Promise<void> | void {
	return enqueue(write, 1, cb);
}
