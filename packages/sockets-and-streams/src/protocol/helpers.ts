import type { PGConfig } from './types';

export function normalizePGConfig(options: PGConfig): Required<PGConfig> {
    const { user, database, replication, ssl } = options;
    const rc: Required<PGConfig> = {
        user,
        ...(database ? { database } : { database: user }),
        ...(replication ? { replication } : { replication: false }),
        ...(ssl && Object.keys(ssl).length ? { ssl } : { ssl: false })
    };
    return rc;
}
