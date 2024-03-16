//guards

import SuperVisor from './';
import {
    ActivityTimeToBins,
    ClientConfig,
    CreateSSLSocketSpec,
    CreateSocketSpec,
    PGConfig,
    SSLConfig,
    PoolTimeBins,
    SSLFallback
} from './types';
import { defaultActivityTimeReducer } from '../helpers';
import Encoder from '../../utils/Encoder';
import Enqueue from '../Enqueue';
import {
    BufferStuffingAttack,
    ErrorResponse,
    MangledData,
    NoticeResponse,
    PasswordMissing,
    SVNegotiateProtocolVersion
} from './messages';
import { AUTH_PW_MISSING, BUFFER_STUFFING_ATTACK, MANGELD_DATA, NEGOTIATE_PROTOCOL, OOD_AUTH } from './constants';
import { PG_ERROR } from '../../messages/fromBackend/ErrorAndNoticeResponse/constants';

const defaultSSLFallback = (config: PGConfig) => {
    return false;
};

export type SuperVisorConfig = {
    sslFallback?: SSLFallback;
    clientConfig: ClientConfig;
    createSocketSpec: CreateSocketSpec;
    createSSLSocketSpec: CreateSSLSocketSpec;
    now?: () => number;
    reducePoolTimeBins?: PoolTimeBins;
    reduceActivityWaitTime2Bins?: ActivityTimeToBins;
    encoder: Encoder;
    decoder?: TextDecoder;
};

export function createDefaultSuperVisor({
    sslFallback = defaultSSLFallback,
    clientConfig,
    createSocketSpec,
    createSSLSocketSpec,
    now = Date.now,
    decoder = new TextDecoder(),
    reducePoolTimeBins = {
        vis: defaultActivityTimeReducer,
        reservedEmpherical: defaultActivityTimeReducer,
        reservedPermanent: defaultActivityTimeReducer,
        active: defaultActivityTimeReducer,
        idle: defaultActivityTimeReducer,
        terminal: defaultActivityTimeReducer,
        created: defaultActivityTimeReducer
    },
    reduceActivityWaitTime2Bins = {
        network: defaultActivityTimeReducer,
        iom_code: defaultActivityTimeReducer,
        connect: defaultActivityTimeReducer,
        sslConnect: defaultActivityTimeReducer,
        finish: defaultActivityTimeReducer,
        end: defaultActivityTimeReducer,
        close: defaultActivityTimeReducer,
        drained: defaultActivityTimeReducer
    },
    encoder
}: SuperVisorConfig): SuperVisor {
    return new SuperVisor(
        sslFallback,
        clientConfig,
        createSocketSpec,
        createSSLSocketSpec,
        now,
        reducePoolTimeBins,
        reduceActivityWaitTime2Bins,
        encoder,
        decoder
    );
}

export function getRandomDelayInMs(min = 0, max = 1000, random = Math.random) {
    return min + random() * (max - min);
}

function validatePGSSLConfig(config: SSLConfig): Error[] | true {
    const errors: Error[] = [];
    if (!config.ca) {
        errors.push(new Error('no ssl.ca set'));
    }

    if (typeof config.ca !== 'string' || config.ca.length === 0) {
        errors.push(new Error('ssl.ca must be a non-empty string'));
    }
    return errors.length ? errors : true;
}

export function getSLLSocketClassAndOptions(createSSLSocketSpec: CreateSSLSocketSpec): boolean | Error[] {
    const errors: Error[] = [];
    let ssl = true;
    // validate ssl
    const sslSpec = createSSLSocketSpec();
    const sslOptions = sslSpec.sslOptions();
    if (sslOptions === false) {
        // ssl not possible
        ssl = false;
    } else {
        const sslFactory = sslSpec.socketSSLFactory();
        if (typeof sslFactory !== 'function') {
            errors.push(new Error('SSL options specified, but createSSLConnection function not set'));
            ssl = false;
        }
        const result = validatePGSSLConfig(sslOptions);
        if (result !== true) {
            errors.push(...result);
            ssl = false;
        }
    }
    if (errors.length) {
        return errors;
    }
    return ssl;
}

export function validatePGConnectionParams(config: PGConfig): Error[] | true {
    const errors: Error[] = [];
    if (!config.user) {
        errors.push(new Error('no config.user, must be provided at a minimum'));
    }

    if (typeof config.user !== 'string' || config.user.length === 0) {
        errors.push(new Error('config.user must be a non-empty string'));
    }
    return errors.length ? errors : true;
}

export function normalizePGConfig(options: PGConfig): Required<PGConfig> {
    const { user, database, replication, password } = options;
    const rc: Required<PGConfig> = {
        user,
        ...(database ? { database } : { database: user }),
        ...(replication ? { replication } : { replication: false }),
        ...(password ? { password } : { password: () => '' })
    };
    return rc;
}

export function getSackBySocketActor<T>(wm: WeakMap<Enqueue<T>, unknown[]>, sa: Enqueue<T>): unknown[] {
    const rc = wm.get(sa) || [];
    wm.set(sa, rc);
    return rc;
}

export function addToStore<T>(wm: WeakMap<Enqueue<T>, unknown[]>, sa: Enqueue<T>, item: unknown) {
    const sack = getSackBySocketActor(wm, sa);
    sack.push(item);
}

export function getStore<T>(wm: WeakMap<Enqueue<T>, unknown[]>, sa: Enqueue<T>): unknown[] {
    return wm.get(sa) || [];
}

export function isInformationalMessage(
    u: any
): u is
    | BufferStuffingAttack
    | MangledData
    | SVNegotiateProtocolVersion
    | PasswordMissing
    | ErrorResponse
    | NoticeResponse {
    return (
        u?.type === BUFFER_STUFFING_ATTACK ||
        u?.type === MANGELD_DATA ||
        u?.type === NEGOTIATE_PROTOCOL ||
        u?.type === AUTH_PW_MISSING ||
        u?.type === OOD_AUTH ||
        u?.type === PG_ERROR
    );
}
