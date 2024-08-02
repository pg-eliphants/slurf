export class PromiseExtended<T = undefined> {
    private _isResolved: boolean;
    public promise: Promise<T>;
    private _reject: (value: T | PromiseLike<T>) => void;
    private _resolve: (value: T | PromiseLike<T>) => void;

    public forceResolve(value: T | PromiseLike<T>) {
        this._isResolved = true;
        this._resolve(value);
    }
    public forceReject(value: T | PromiseLike<T>) {
        this._isResolved = true;
        this._reject(value);
    }
    public get isResolved() {
        return this._isResolved;
    }
    constructor(resolveNow: boolean) {
        this.promise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        this._isResolved = !!resolveNow;
        if (resolveNow) {
            this.forceResolve(undefined as T);
        }
    }
}

export function createResolvePromiseExtended<T extends any>(resolveNow: boolean): PromiseExtended<T> {
    return new PromiseExtended<T>(resolveNow);
}
