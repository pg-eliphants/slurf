import type { PGSSLConfig } from './types';
import type { AggregateError } from './types';
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
