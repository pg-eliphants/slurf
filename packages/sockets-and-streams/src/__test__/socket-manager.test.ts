import { Socket, createConnection } from 'net';
import SocketIOManager from '../SocketIOManager';
import Jitter from '../Jitter';
import type { CreateSocketSpec, CreateSocketSpecHints, SocketConnectOpts, SocketOtherOptions } from '../types';

function test() {
    const spec: CreateSocketSpec = function (hints, _createConnection, allOptions) {
        _createConnection(createConnection);
        allOptions({ port: 9999, keepAlive: true, noDelay: true }, { timeout: 1000 });
    } as CreateSocketSpec;

    const jitter = new Jitter(() => Math.random(), 0, 0.01);
    const createBuffer = () => new Uint8Array(128);
    const now = (function () {
        let cnt = 1;
        return function () {
            return cnt++;
        };
    })();
    const ioManager = new SocketIOManager(spec, jitter, createBuffer, now);
    ioManager.createSocketForPool('idle');
    //ioManager.createSocketForPool('idle');
    //ioManager.createSocketForPool('idle');
}

test();
