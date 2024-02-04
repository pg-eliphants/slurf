import type { AggregateError } from './types';

export function isAggregateError(err: unknown): err is AggregateError {
    return (err as AggregateError)?.errors !== undefined;
}

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

export function createResolvePromiseExtended(resolveNow: boolean): PromiseExtended<void> {
    return new PromiseExtended<void>(resolveNow);
}
