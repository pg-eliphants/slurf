import { createDefaultSuperVisor } from './actors/supervisor/helper';
import {
    CreateSocketSpecHints,
    CreateSocketSpec,
    SSLConfig,
    CreateSSLSocketSpec,
    ClientConfig,
    PGConfig
} from './actors/supervisor/types';
import net, { NetConnectOpts } from 'node:net';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tsl from 'node:tls';
import MemoryManager from './utils/MemoryManager';
import Encoder from './utils/Encoder';

const socketConnectOptions = () => ({
    port: 5432,
    keepAlive: true,
    noDelay: true
});

const sslOptions: ReturnType<CreateSSLSocketSpec>['sslOptions'] = () => ({
    ca: readFileSync(resolve('ca.crt'), 'utf8')
});

const extraOpt = () => ({
    timeout: 6e3 // 6s
});

const socketFactory = () => (options: NetConnectOpts) => net.createConnection(options);
const socketSSLFactory: ReturnType<CreateSSLSocketSpec>['socketSSLFactory'] = () => (options: SSLConfig) =>
    tsl.connect(options);

const clientConfig: ClientConfig = () => {
    const rc: PGConfig = {
        user: 'role_ssl_passwd',
        database: 'auth_db',
        password: () => 'role_ssl_passwd'
    };
    return rc;
};
const createSocketSpec: CreateSocketSpec = (hints: CreateSocketSpecHints) => ({
    socketConnectOptions,
    extraOpt,
    socketFactory
});

const createSSLSocketSpec: CreateSSLSocketSpec = () => ({
    socketSSLFactory,
    sslOptions
});

const decoder = new TextDecoder();
const textEncoder = new TextEncoder();
const memoryManager = new MemoryManager();
const encoder = new Encoder(memoryManager, textEncoder);

const superVisor = createDefaultSuperVisor({
    clientConfig,
    createSocketSpec,
    createSSLSocketSpec,
    encoder,
    decoder
});

superVisor.addConnection('idle').then((done) => {
    console.log('socket created?: %o!', done);
});
