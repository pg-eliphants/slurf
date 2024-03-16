import type { Socket } from 'net';
import {
    PoolFirstResidence,
    Pool,
    ActivityTimeToBins,
    ActivityWait,
    ActivityWaitTimes,
    SSLConfig,
    CreateSLLConnection
} from '../supervisor/types';
import { PromiseExtended } from '../../utils/PromiseExtended';
import type { SocketControlMsgs, UpgradeToSSL, Write, WriteThrottle } from './messages';
import Enqueue from '../Enqueue';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { Item } from '../../utils/list';
import { isAggregateError } from './helpers';
import { CREATEPOOL, SETPOOL } from '../supervisor/constants';
import { SocketOtherOptions } from '../supervisor/types';
import { BootControlMsgs } from '../boot/messages';
import { END_CONNECTION, LOOKUPERROR, NETCLOSE, NETWORKERR, SESSION_INFO_END, SSL } from '../constants';
import { SET_ACTOR, WRITE, WRITE_THROTTLE } from './constants';
import ReadableByteStream from '../../utils/ReadableByteStream';
import { AUTH_START } from '../auth/constants';
import { AuthenticationControlMsgs } from '../auth/messages';
import dump from 'buffer-hexdump';
// SocketControlMsgs is what this Actor can receive in messages
export default class SocketActor implements Enqueue<SocketControlMsgs> {
    // pools
    private current: Pool;
    private poolPlacementTime: number;

    // timestamps
    private lastReadTS: number;
    private lastWriteTS: number;

    // flux metrics
    private bytesRead: number;
    private bytesWritten: number;
    private readonly activityWaits: ActivityWaitTimes = {
        network: {},
        iom_code: {},
        connect: {},
        sslConnect: {},
        finish: {},
        end: {},
        close: {},
        drained: {}
    };
    private readonly activityEvents = {
        error: 0,
        idle: 0,
        end: 0,
        close: 0,
        zeroData: 0,
        readDdataWhilePaused: 0,
        writeDataWhilePaused: 0,
        lookup: 0,
        needDraining: 0
    };

    // transmission cache
    private backPressure: PromiseExtended<void>;
    private readonly receivedBytes: ReadableByteStream;

    private markTime() {
        const prev = this.lastReadTS;
        this.lastReadTS = this.now();
        return { begin: prev, end: this.lastReadTS };
    }

    private updateActivityWaitTimes(activity: ActivityWait, start: number, stop: number) {
        const delay = stop - start;
        const bin = this.reduceTimeToActivityBins[activity](delay);
        this.activityWaits[activity][bin] = (this.activityWaits[activity][bin] ?? 0) + 1;
        return bin;
    }
    private updateNetworkStats(activity: ActivityWait = 'network') {
        const { begin, end } = this.markTime();
        this.bytesRead = this.socket.bytesRead;
        this.bytesWritten = this.socket.bytesWritten;
        this.updateActivityWaitTimes(activity, begin, end);
    }

    private init(o: SocketOtherOptions) {
        const { socket } = this;
        socket.on('finish', () => {
            this.updateNetworkStats('finish');
        });
        const { timeout } = o;
        if (timeout) {
            this.socket.setTimeout(timeout);
            this.socket.on('timeout', () => {
                const pool = this.current;
                if (pool === 'idle') {
                    // idling sockets are idle so ofc they will get timeouts
                    // this will only happen once after they are put in "idle" pool
                    // as we do not call socket.setTimeout(...)
                    this.activityEvents.idle = 0;
                    return;
                }
                this.socket.setTimeout(timeout);
                this.activityEvents.idle++;
                // todo: send timeout event to counterparty
                // todo: send timeout event to supervisor
            });
        }
        socket.on('end', () => {
            this.updateNetworkStats('end');
            this.activityEvents.end++;
            this.supervisor.enqueue({ type: END_CONNECTION, socketActor: this });
        });
        socket.on('drain', () => {
            this.backPressure.forceResolve();
            this.updateNetworkStats('drained');
            //
            let left: number;
            this.receivedBytes.shrink();
            while ((left = this.receivedBytes.bytesLeft())) {
                // 4096 to safely write
                const chunkSizeToWrite = Math.min(this.WRITE_CHUNK_SIZE, left);
                // claim bytes
                this.receivedBytes.advanceCursor(chunkSizeToWrite);
                const data = this.receivedBytes.getProcessed();
                const rc = socket.write(data);
                if (!rc) {
                    this.backPressure = new PromiseExtended(false);
                    return; // abort wait for next 'drain' event
                }
            }
        });
        socket.on('data', (buf: Uint8Array) => {
            this.updateNetworkStats('network');
            console.log(dump(buf));
            if (buf.byteLength === 0) {
                this.activityEvents.zeroData++;
                return;
            }
            if (socket.isPaused()) {
                this.activityEvents.readDdataWhilePaused++;
            }
            this.downStreamActor.enqueue({ type: 'data', pl: buf });
            this.updateNetworkStats('iom_code');
        });
        this.socket.on('error', (err: Error & NodeJS.ErrnoException) => {
            this.activityEvents.error++;
            const error = err.syscall
                ? [`syscall: ${err.syscall}, name: ${err.name}, code: ${err.code!}`]
                : isAggregateError(err)
                ? Array.from(err.errors).map((err: Error) => String(err))
                : [err.message];
            this.supervisor.enqueue({
                type: NETWORKERR,
                socketActor: this,
                pl: error
            });
        });
        //
        this.socket.on('close', (hadError) => {
            this.activityEvents.close++;
            this.updateNetworkStats('close');
            this.downStreamActor.enqueue({ type: NETCLOSE });
            this.supervisor.enqueue({
                type: NETCLOSE,
                socketActor: this,
                wsa: this.wsa(),
                currentPool: this.current,
                poolPlacementTime: this.poolPlacementTime,
                finalPool: this.createdFor
            });
            this.socket.removeAllListeners();
        });
        this.socket.once('connect', async () => {
            this.updateNetworkStats('connect');
            this.downStreamActor.enqueue({ type: 'connect' });
            this.updateNetworkStats('iom_code');
        });
        this.socket.on('lookup', (err, address, family, host) => {
            this.activityEvents.lookup++;
            if (err) {
                this.supervisor.enqueue({
                    type: LOOKUPERROR,
                    address,
                    family,
                    host,
                    err,
                    socketActor: this,
                    wsa: this.wsa(),
                    currentPool: this.current,
                    poolPlacementTime: this.poolPlacementTime,
                    finalPool: this.createdFor
                });
            }
        });
    }

    private handleWrite(msg: Write): boolean {
        // if isPaused, this is an internal error, should not happen
        if (this.socket.isPaused()) {
            console.log('error, handleWrite, trying to send data while socket is paused');
            this.activityEvents.writeDataWhilePaused++;
            return false;
        }
        if (this.socket.writableNeedDrain) {
            if (!this.receivedBytes.enqueue(msg.data)) {
                console.log('error, handleWrite, backpressure + cache full');
                return false; // backpressure + cache is full, so can't cache it
            }
            return true; // backpressure 'drain' event will take care of it
        }
        const rc = this.socket.write(msg.data);
        if (!rc) {
            this.backPressure = new PromiseExtended(false);
        }
        return true;
    }

    private async handleWriteThrotteld(msg: WriteThrottle): Promise<boolean> {
        // if isPaused, this is an internal error, should not happen
        if (this.socket.isPaused()) {
            console.log('error-0, handleWriteSafe, trying to send data while socket is paused');
            this.activityEvents.writeDataWhilePaused++;
            return false;
        }
        if (this.socket.writableNeedDrain) {
            if (!this.receivedBytes.enqueue(msg.data)) {
                console.log('error-1, handleWriteSafe, backpressure + cache full');
                return false; // backpressure + cache is full, so can't cache it
            }
            await this.backPressure; // explicitly wait for drain event
            return true; // backpressure 'drain' event will take care of it
        }

        // 'drain' handler is in the process of draining the cache?
        if (this.receivedBytes.bytesLeft()) {
            if (!this.receivedBytes.enqueue(msg.data)) {
                console.log('error-2, handleWriteSafe, backpressure + cache full');
                return false; // backpressure and cache is also full, so can't cache it
            }
            // todo: mark this with an event counter (not blocked through "drain" but still data is cached)
            return true;
        }
        const rc = this.socket.write(msg.data);
        if (!rc) {
            this.backPressure = new PromiseExtended(false);
        }
        return true;
    }

    private upgradeToSSL(msg: UpgradeToSSL) {
        const ssl = msg.sslSpec();
        const options: SSLConfig = ssl.sslOptions() as SSLConfig;
        const factory: CreateSLLConnection = ssl.socketSSLFactory() as CreateSLLConnection;
        this.socket.removeAllListeners();
        options.socket = this.socket;
        const sslSocket = factory(options);
        this.socket = sslSocket;
        sslSocket.on('secureConnect', async () => {
            this.updateNetworkStats('sslConnect');
            this.downStreamActor.enqueue({ type: AUTH_START });
        });
        this.init(this.extraOptions);
    }

    public enqueue(msg: SocketControlMsgs) {
        if (msg.type === SETPOOL) {
            const { pool, placementTime } = msg;
            this.current = pool;
            this.poolPlacementTime = placementTime;
            return true;
        }
        if (msg.type === WRITE) {
            return this.handleWrite(msg);
        }
        if (msg.type === WRITE_THROTTLE) {
            return this.handleWriteThrotteld(msg);
        }
        if (msg.type === SSL) {
            return this.upgradeToSSL(msg);
        }
        if (msg.type === SET_ACTOR) {
            this.downStreamActor = msg.pl;
            return;
        }
        if (msg.type === END_CONNECTION) {
            this.socket.end();
            return;
        }
        if (msg.type === SESSION_INFO_END) {
            // resend to supervisor with added pool info
            this.supervisor.enqueue({
                ...msg,
                wsa: this.wsa(),
                currentPool: this.current,
                poolPlacementTime: this.poolPlacementTime,
                socketActor: this,
                finalPool: this.createdFor
            });
            return;
        }
    }

    constructor(
        // SocketLifeCycleMsgs is what i can send to counterparties including the supervisor
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly reduceTimeToActivityBins: ActivityTimeToBins,
        private socket: Socket,
        private readonly now: () => number,
        private readonly wsa: () => Item<SocketActor>,
        private readonly jitter: number,
        private readonly extraOptions: SocketOtherOptions,
        private readonly id: number,
        private readonly createdFor: PoolFirstResidence,
        private downStreamActor: Enqueue<BootControlMsgs | AuthenticationControlMsgs>,
        private readonly WRITE_CHUNK_SIZE = 4096,
        private readonly LOCAL_CACHE_SIZE = 4096
    ) {
        const currentTS = now();
        this.current = CREATEPOOL;
        this.lastReadTS = currentTS;
        this.lastWriteTS = currentTS;
        this.poolPlacementTime = currentTS;
        this.receivedBytes = new ReadableByteStream(LOCAL_CACHE_SIZE);
        this.init(extraOptions);
    }
}
