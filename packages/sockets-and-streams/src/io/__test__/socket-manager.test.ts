import { Socket, createConnection } from 'net';
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
import type { GetClientConfig, SetClientConfig } from '../../protocol/types';
import Encoder from '../../protocol/Encoder';

function test() {
    const spec: CreateSocketSpec = function (hints, setSocketCreator, allOptions) {
        setSocketCreator(createConnection);
        allOptions({ port: 5432, keepAlive: true, noDelay: true }, { timeout: 6000 });
    } as CreateSocketSpec;

    const jitter = new Jitter(() => Math.random(), 0, 0.01);
    const createBuffer = () => new Uint8Array(512);
    const now = (function () {
        let cnt = 1;
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
            user: 'postgres'
        });
    };
    const textEncoder = new TextEncoder();
    const encoder = new Encoder(memoryManager, textEncoder);
    //
    const protocolManager = new ProtocolManager(ioManager, encoder, getClientConfig);
    ioManager.createSocketForPool('idle');
    //ioManager.createSocketForPool('vis');
    //ioManager.createSocketForPool('idle');
}

test();
