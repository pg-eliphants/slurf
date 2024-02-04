import { PromiseExtended } from '../../src/io/helpers';
import { List, insertAfter, toArr } from './list';

export default class Pipe<T> {
    private begin: List<T>;
    private end: List<T>;
    private promise: PromiseExtended<void>;
    constructor() {
        this.begin = this.end = null;
        this.promise = new PromiseExtended(false);
    }
    public enqueue(item: T) {
        if (this.begin === null) {
            this.begin = { value: item };
        } else if (this.end === null) {
            const inserted = insertAfter(this.begin, { value: item });
            this.end = inserted;
        } else {
            this.end = insertAfter(this.end, { value: item });
        }
        if (this.promise.isResolved === false) {
            this.promise.forceResolve();
        }
    }
    public async dequeue(): Promise<T[] | undefined> {
        await this.promise.promise;
        this.promise = new PromiseExtended(false);
        if (this.begin) {
            const arr = toArr(this.begin);
            this.begin = null;
            this.end = null;
            return arr;
        }
        return undefined;
    }

    public async hasDeQueued(): Promise<void> {
        await this.promise;
        return;
    }
}
