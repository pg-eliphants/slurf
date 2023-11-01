import { Socket, createConnection } from 'net';
import SocketIOManager from '../SocketIOManager';
import Jitter from '../Jitter';
import type {
    CreateSocketSpec,
    CreateSocketSpecHints,
    SocketConnectOpts,
    SocketOtherOptions,
    PoolTimeBins
} from '../types';

function test() {
    const spec: CreateSocketSpec = function (hints, setSocketCreator, allOptions) {
        setSocketCreator(createConnection);
        allOptions({ port: 9999, keepAlive: true, noDelay: true }, { timeout: 6000 });
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
    ioManager.createSocketForPool('idle');
    //ioManager.createSocketForPool('vis');
    //ioManager.createSocketForPool('idle');
}

test();
