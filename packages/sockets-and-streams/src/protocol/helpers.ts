import type { PGConfig, PGSSLConfig } from './types';

export function normalizePGConfig(options: PGConfig): Required<PGConfig> {
    const { user, database, replication } = options;
    const rc: Required<PGConfig> = {
        user,
        ...(database ? { database } : { database: user }),
        ...(replication ? { replication } : { replication: false })
    };
    return rc;
}

export function validatePGConnectionParams(config?: PGConfig): { errors: Error[] } | true {
    const errors: Error[] = [];
    if (config === undefined) {
        errors.push(new Error('no configuration was provided upon request'));
        return { errors };
    }
    if (!config?.user) {
        errors.push(new Error('no config.user, must be provided at a minimum'));
    }

    if (typeof config.user !== 'string' || config.user.length === 0) {
        errors.push(new Error('config.user must be a non-empty string'));
    }
    return errors.length ? { errors } : true;
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
