import { List } from '../utils/list';
import Encoder from '../protocol/Encoder';
import { SocketAttributes, CreateSLLConnection, PGSSLConfig } from '../io/types';
import { PGConfig, SetSSLFallback } from '../protocol/types';
import type { ISocketIOManager } from '../io/SocketIOManager';
import ProtocolManager from '../protocol/ProtocolManager';
import { SEND_NOT_OK } from '../io/constants';
import type { GetSLLFallbackSpec } from './types';

export type SocketAttributeAuxMetadata = {
    sslRequestSent: boolean;
    startupSent: boolean;
    upgradedToSll: boolean;
};

export default class Initializer {
    constructor(
        private readonly encoder: Encoder,
        private readonly socketIoManager: ISocketIOManager<SocketAttributeAuxMetadata>,
        private readonly protocol: ProtocolManager,
        private readonly getSSLFallback: GetSLLFallbackSpec
    ) {}

    private createStartupMessage(config: Required<PGConfig>): Uint8Array | undefined {
        const bin = this.encoder
            .init('128')
            ?.i32(196608)
            ?.cstr('user')
            ?.cstr(config.user)
            ?.cstr('database')
            ?.cstr(config.database)
            //?.cstr('replication')
            //?.cstr(String(config.replication))
            // you can add more options here, check out "client connect options"
            ?.cstr('')
            ?.getWithLenght();
        return bin;
    }

    private approveNonSSLConnection() {
        const r = this.protocol.requestConnectionParams();
        if ('errors' in r) {
            // log errors
            return false;
        }
        let setFallbackFn: SetSSLFallback | undefined;
        const getFallBack = (_setFallbackFn: SetSSLFallback) => {
            setFallbackFn = _setFallbackFn;
        };
        this.getSSLFallback(getFallBack);
        if (!setFallbackFn) {
            return false;
        }
        return setFallbackFn(r.config);
    }

    private sendStartupMessage(socket: SocketAttributes<SocketAttributeAuxMetadata>): boolean {
        const r = this.protocol.requestConnectionParams();
        if ('errors' in r) {
            // TODO
            // log errors
            // return false -> end socket, remove from pool etc
            return false;
        }
        const bin = this.createStartupMessage(r.config);
        if (!bin) {
            //TODO handle this error
            // return false -> end socket, remove from pool etc
            return false;
        }
        if (this.socketIoManager.send(socket, bin) === SEND_NOT_OK) {
            // TODO: msg not sent
            // log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        // all ok
        socket.ioMeta.aux.startupSent = true;
        return true;
    }

    // this is called on a "connect" event
    public startupAfterConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): boolean {
        // request ssl params from ioManager
        socket.ioMeta.aux = { sslRequestSent: false, startupSent: false, upgradedToSll: false };
        const r = this.socketIoManager.getSLLSocketClassAndOptions(socket.ioMeta.pool.createdFor);
        // no ssl, use normal connection
        if (r === false) {
            return this.sendStartupMessage(socket);
        }
        if ('errors' in r) {
            //     // we want to use ssl but misconfigured,
            //     // log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        // we have ssl use it
        const bin = this.encoder.init('64')?.i32(80877103)?.getWithLenght();
        if (!bin) {
            //TODO handle this error
            // return false -> end socket, remove from pool etc
            return false;
        }
        if (this.socketIoManager.send(socket, bin) === SEND_NOT_OK) {
            //TODO handle this error
            // return false -> end socket, remove from pool etc
            return false;
        }
        socket.ioMeta.aux.sslRequestSent = true;
        return true;
    }

    public startupAfterSSLConnect(socket: SocketAttributes<SocketAttributeAuxMetadata>): boolean {
        socket.ioMeta.aux.upgradedToSll = true;
        return this.sendStartupMessage(socket);
    }

    public handleData(
        item: Exclude<List<SocketAttributes<SocketAttributeAuxMetadata>>, null>,
        data: Uint8Array
    ): boolean {
        if (item.value.ioMeta.pool.current !== 'created') {
            // todo:
            // log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        const { startupSent, sslRequestSent, upgradedToSll } = item.value.ioMeta.aux;
        if (!startupSent && !sslRequestSent) {
            console.log('the server is sending us an error');
            // todo: prolly the server is sending us an error of some sort, abort
            // todo log errors
            // return false -> end socket, remove from pool etc
            return false;
        }
        const len = data.byteLength;
        if (sslRequestSent && !upgradedToSll) {
            // 78 = 'N'
            if (data[0] === 78 && len === 1) {
                console.log('server not configured for ssl');
                // pg-server not have ssl configured
                // request to continue
                if (this.approveNonSSLConnection() === false) {
                    // TODO: abort close the connection, callback to ioManager
                    // return false -> end socket, remove from pool etc
                    return false;
                }
                return this.sendStartupMessage(item.value);
            }
            //'S' = 83, ok to upgrade to SSL
            else if (data[0] === 83 && len === 1) {
                return this.socketIoManager.upgradeToSSL(item);
            } else if (data[0] !== 69) {
                // 'E' = 69
                // this is possibly a buffer-stuffing attack (CVE-2021-23222).
                // https://www.postgresql.org/support/security/CVE-2021-23222/
                // TODO: log error
                // return false -> end socket, remove from pool etc
                return false;
            }
            // at this point a legal Error Response was given,
            // TODO parse ErrorResponse, log error
            // return false -> end socket, remove from pool etc
            return false;
        }
        if (startupSent) {
            // handle further authentication related responses from server
            // - E
            // - various R
            console.log('HERE WE ARE');
            return true;
        }
        // forbidden state
        // todo: log errors
        // return false -> end socket, remove from pool etc
        return false;
    }
}
