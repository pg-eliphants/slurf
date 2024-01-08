import type { Pool, PGSSLConfig, AggregateError, SocketAttributes } from './types';
import type { List } from '../utils/list';
export function isAggregateError(err: unknown): err is AggregateError {
    return (err as AggregateError)?.errors !== undefined;
}
export function validatePGSSLConfig(config?: PGSSLConfig): { errors: Error[] } | boolean {
    const errors: Error[] = [];
    if (config === undefined) {
        return false;
    }
    if (!config?.ca) {
        errors.push(new Error('no ssl.ca set'));
        return { errors };
    }

    if (typeof config.ca !== 'string' || config.ca.length === 0) {
        errors.push(new Error('ssl.ca must be a non-empty string'));
    }
    return errors.length ? { errors } : true;
}

export class PromiseExtended extends Promise<undefined> {
    public resolve: (value: undefined | PromiseLike<undefined>) => void;
    public reject: (value: undefined | PromiseLike<undefined>) => void;
    constructor(resolveNow: boolean) {
        super((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
        if (resolveNow) {
            this.resolve(undefined);
        }
    }
}

export function createResolvePromiseExtended(resolveNow: boolean): PromiseExtended {
    return new PromiseExtended(resolveNow);
}

export function isInPools(item: Exclude<List<SocketAttributes>, null>, ...pools: Pool[]): boolean {
    const current = item.value.ioMeta.pool.current;
    return pools.includes(current);
}
