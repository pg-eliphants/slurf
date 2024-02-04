// statistics & metrics

export type ActivityWait = 'network' | 'iom_code' | 'connect' | 'sslConnect' | 'finish' | 'end' | 'close' | 'drained';
export type ActivityCount = 'error' | 'idle' | 'end' | 'close';
export type PoolFirstResidence = Exclude<Pool, 'active' | 'terminal' | 'reservedEmpherical' | 'created'>;
export type Pool = 'vis' | 'reservedEmpherical' | 'reservedPermanent' | 'active' | 'idle' | 'terminal' | 'created';

// tooling
import type { List } from '../../src2/utils/list';
import { PromiseExtended } from './helpers';

export type reduceValueToBin = (value: number) => number;
// define the bin sizes
export type PoolTimeBins = {
    [index in Pool]: reduceValueToBin;
};

export type ActivityTimeBins = {
    [index in ActivityWait]: reduceValueToBin;
};

export type ActivityCountBins = {
    [index in ActivityCount]: number;
};

export type MetaSocketAttr<T> = {
    id: Number; // unique uuid for socket
    jitter: number; // random delay in ms when connecting
    pool: {
        createdFor: PoolFirstResidence;
        placementTime: number; // when the socket was placed into "pool"
        current: Pool;
        lastChecked: number;
    };
    time: {
        lastReadTS: number;
        lastWriteTS: number;
    };
    networkBytes: {
        bytesRead: number;
        bytesWritten: number;
    };
    backPressure: PromiseExtended<void>;
    idleCounts: number;
    timeout: number;
};

type HistogramResidentTimes = {
    [time: number]: number;
};

export type PoolWaitTimes = {
    [index in Pool]: HistogramResidentTimes;
};

export type ActivityWaitTimes = {
    [index in ActivityWait]: HistogramResidentTimes;
};

export type Pools = {
    [index in Pool]: List<SocketAttributes>;
};

export type ResidencyCount = {
    [index in Pool]: number;
};

export type SocketAttributes<T = any> = {
    socket: Socket | null;
    ioMeta: MetaSocketAttr<T>;
};

export interface AggregateError extends Error {
    errors: any[];
}

export interface AggregateErrorConstructor {
    new (errors: Iterable<any>, message?: string): AggregateError;
    (errors: Iterable<any>, message?: string): AggregateError;
    readonly prototype: AggregateError;
}

export type SendingStatus = 'ok' | 'backpressure' | 'closed' | 'only-read' | 'ok-but-backpressure';
