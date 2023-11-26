import type { PGConfig } from './types';

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
