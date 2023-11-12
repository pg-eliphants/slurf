import { createConnection } from 'net';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import SocketIOManager from '../SocketIOManager';
import ProtocolManager from '../../protocol/ProtocolManager';
import Jitter from '../Jitter';
import type {
    CreateSocketSpec,
    CreateSocketSpecHints,
    SocketConnectOpts,
    SocketOtherOptions,
    PoolTimeBins
} from '../types';
import MemoryManager from '../../utils/MemoryManager';
import type {
    GetClientConfig,
    GetSSLConfig,
    PGConfig,
    SetClientConfig,
    SetSSLConfig,
    SSLFallback
} from '../../protocol/types';
import Encoder from '../../protocol/Encoder';
import Decoder from '../../protocol/Decoder';

function test() {
    const spec: CreateSocketSpec = function (hints, setSocketCreator, allOptions) {
        setSocketCreator(createConnection);
        allOptions({ port: 5432, keepAlive: true, noDelay: true }, { timeout: 6000 });
    } as CreateSocketSpec;

    const jitter = new Jitter(() => Math.random(), 0, 0.01);
    const createBuffer = () => new Uint8Array(512);
    const now = (function () {
        // let cnt = 1;
        return function () {
            return Date.now(); //cnt++;
        };
    })();
    const activityTimeReducer = (delay: number) => {
        const bin = Math.trunc(Math.sqrt(Math.max(delay, 0)));
        return bin;
    };
    const reduceTimeToActivityBins = {
        network: activityTimeReducer,
        iom_code: activityTimeReducer
    };
    const reduceTimeToPoolBins: PoolTimeBins = {
        vis: activityTimeReducer,
        reservedEmpherical: activityTimeReducer,
        reservedPermanent: activityTimeReducer,
        active: activityTimeReducer,
        idle: activityTimeReducer,
        terminal: activityTimeReducer,
        created: activityTimeReducer
    };
    const ioManager = new SocketIOManager(
        spec,
        jitter,
        createBuffer,
        now,
        reduceTimeToPoolBins,
        reduceTimeToActivityBins
    );
    const memoryManager = new MemoryManager();
    //
    const getClientConfig: GetClientConfig = (setClientConfig: SetClientConfig) => {
        setClientConfig({
            user: 'role_ssl_nopasswd',
            database: 'auth_db'
        });
    };

    const getSSLConfig: GetSSLConfig = (setConfig: SetSSLConfig) => {
        setConfig({
            ca: readFileSync(resolve(__dirname, './ca.crt'), 'utf8')
        });
    };

    const sslFallback: SSLFallback = (params: Required<PGConfig>) => false;
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    const encoder = new Encoder(memoryManager, textEncoder);
    const decoder = new Decoder(textDecoder);
    //

    const protocolManager = new ProtocolManager(
        ioManager,
        encoder,
        decoder,
        getClientConfig,
        getSSLConfig,
        sslFallback
    );
    ioManager.createSocketForPool('idle');
}

test();
