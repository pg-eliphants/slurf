import {
    SocketAttributes,
    PoolWaitTimes,
    SendingStatus,
    PoolFirstResidence,
    CreateSLLConnection,
    PGSSLConfig,
    CreateSocketConnection,
    SocketConnectOpts,
    SocketOtherOptions
} from './types';

import { List } from '../utils/list';

export default interface ISocketIOManager<T = any> {
    handleBackPressure(attr: SocketAttributes): Promise<void>;
    send<T>(attributes: SocketAttributes<T>, bin: Uint8Array): SendingStatus;
    getPoolWaitTimes(): PoolWaitTimes;
    createSocketForPool(forPool: PoolFirstResidence): Promise<void>;
    getSLLSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              createSSLConnection: CreateSLLConnection;
              conOpt: PGSSLConfig;
          }
        | { errors: Error[] }
        | false;
    getSocketClassAndOptions(forPool: PoolFirstResidence):
        | {
              createConnection: CreateSocketConnection;
              conOpt: SocketConnectOpts;
              extraOpt: SocketOtherOptions;
          }
        | { errors: Error[] };
    upgradeToSSL(item: Exclude<List<SocketAttributes>, null>);
    setEnableTimeout(item: SocketAttributes): void;
}
