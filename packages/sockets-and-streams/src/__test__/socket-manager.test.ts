import { createConnection } from 'net';
import { connect as tslConnect } from 'node:tls';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import SocketIOManager from '../io/SocketIOManager';
import ProtocolManager from '../protocol/ProtocolManager';
import Jitter from '../io/Jitter';
import type {
    CreateSSLSocketSpec,
    CreateSocketSpec,
    CreateSocketSpecHints,
    SocketConnectOpts,
    SocketOtherOptions,
    PoolTimeBins,
    ActivityTimeBins
} from '../io/types';
import MemoryManager from '../utils/MemoryManager';
import type { GetClientConfig, GetSLLFallbackSpec, PGConfig, SetClientConfig } from '../protocol/types';
import Encoder from '../protocol/Encoder';
import Initializer from '../initializer/Initializer';

function test() {
    const spec: CreateSocketSpec = function (hints, setSocketCreator, allOptions) {
        setSocketCreator(createConnection);
        allOptions(
            {
                port: 5432,
                keepAlive: true,
                noDelay: true
            },
            { timeout: 6000 }
        );
    } as CreateSocketSpec;

    const sslSpec: CreateSSLSocketSpec = function (hints, setSocketCreator, setSSLOptions) {
        setSocketCreator(tslConnect);
        setSSLOptions({
            ca: readFileSync(resolve(__dirname, './ca.crt'), 'utf8')
        });
    };

    const jitter = new Jitter(() => Math.random(), 0, 0.01);
    const now = (function () {
        // let cnt = 1;
        return function () {
            return Date.now(); //cnt++;
        };
    })();
    const activityTimeReducer = (delay: number) => {
        const bin = delay; //Math.trunc(Math.sqrt(Math.max(delay, 0)));
        return bin;
    };
    const reduceTimeToActivityBins: ActivityTimeBins = {
        network: activityTimeReducer,
        iom_code: activityTimeReducer,
        connect: activityTimeReducer,
        sslConnect: activityTimeReducer
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
    const ioManager = new SocketIOManager(spec, sslSpec, jitter, now, reduceTimeToPoolBins, reduceTimeToActivityBins);
    const memoryManager = new MemoryManager();
    //
    const getClientConfig: GetClientConfig = (setClientConfig: SetClientConfig) => {
        setClientConfig({
            user: 'role_ssl_passwd',
            database: 'auth_db'
        });
    };
    const protocolManager = new ProtocolManager(ioManager, getClientConfig);

    const getSSLFallback: GetSLLFallbackSpec = (setConfig) => {
        setConfig((config: PGConfig) => {
            return false;
        });
    };

    const textEncoder = new TextEncoder();
    const encoder = new Encoder(memoryManager, textEncoder);
    //
    const initializer = new Initializer(encoder, ioManager, protocolManager, getSSLFallback);
    ioManager.setInitializer(initializer);
    ioManager.createSocketForPool('idle');
}

test();

/*
(ubuntu linux stats, 16G memory Dell laptop)

Bloody fast less for "tsl.creatConnection" and "initial connect"
if we have max 10 ms roundtrip for short queries that is sequentially 100 queries per second,
but this is if all request are serialized (which they are not ofc).

after data received and processes:[{
  network: { '1': 1, '2': 1 },
  iom_code: { '0': 1, '1': 2, '24': 1 },
  connect: { '15': 1 },
  sslConnect: { '8': 1 }
}]
*/
