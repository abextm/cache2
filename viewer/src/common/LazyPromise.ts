export class LazyPromise<T> implements PromiseLike<T> {
	private promise: Promise<T> | undefined;
	private fn: (() => Promise<T>) | undefined;
	public constructor(fn: () => Promise<T>) {
		this.fn = fn;
	}

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
	): Promise<TResult1 | TResult2> {
		if (!this.promise) {
			try {
				this.promise = this.fn!();
			} catch (e) {
				this.promise = Promise.reject(e);
			}
			this.fn = undefined;
		}
		return this.promise.then(onfulfilled, onrejected);
	}

	catch<TResult = never>(
		onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
	): Promise<T | TResult> {
		return this.then(undefined, onrejected);
	}

	finally(onfinally?: (() => void) | undefined | null): Promise<T> {
		const onFinally = (callback: () => any) => Promise.resolve(onfinally?.()).then(callback);
		return this.then(
			result => onFinally(() => result),
			reason => onFinally(() => Promise.reject(reason)),
		);
	}

	get [Symbol.toStringTag]() {
		return "LazyPromise";
	}

	asPromise(): Promise<T> {
		return this;
	}
}
