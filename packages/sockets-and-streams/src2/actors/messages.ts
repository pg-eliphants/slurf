// socket lifecycle messages
// network lifecycle messges
// network lifecycle messges

import { BackendKeyData } from '../messages/fromBackend/BackEndKeyData';
import { ParameterStatus } from '../messages/fromBackend/ParameterStatus';
import { ReadyForQueryResponse } from '../messages/fromBackend/ReadyForQuery';
import ReadableByteStream from '../utils/ReadableByteStream';

export type NetworkData = {
    type: 'data';
    pl: Uint8Array;
};

export type NetworkTimeOut = {
    type: 'net-timeout';
    ts: number;
};

export type NetworkClose = {
    type: 'net-close';
};

export type NetworkError = {
    type: 'net-error';
    pl: string[];
};

//  Although the connect happens in the supervisor
//      the socket has the callback for 'lookup' message
export type LookUpError = {
    type: 'net-lookup-error';
    address: string;
    family: string | number;
    host: string;
    err: Error;
};

export type NetworkEnded = {
    type: 'net-ended';
};

type NetworkFinnish = {
    type: 'net-finnish';
};

type NetworkConnect = {
    type: 'net-connect';
};

type NetworkResume = {
    type: 'net-resume';
};

// END socket lifecycle messages
// END socket lifecycle messages
// END socket lifecycle messages

export type UpgradeToSSL = {
    type: 'ssl';
};

export type EndConnection = {
    type: 'end';
};

export type SessionInfoExchangeEnd = {
    type: 'session-info-exchnage-end';
    r4q: ReadyForQueryResponse;
    paramStatus: ParameterStatus[];
    backendKey: BackendKeyData;
    readable: ReadableByteStream;
};
