import { AggregateError } from './types';

export function isAggregateError(err: unknown): err is AggregateError {
    return (err as AggregateError)?.errors !== undefined;
}
