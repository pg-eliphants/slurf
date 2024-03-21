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
import Query from './actors/query';

const socketConnectOptions = () => ({
    port: 5432,
    keepAlive: true,
    noDelay: true
});

const sslOptions: ReturnType<CreateSSLSocketSpec>['sslOptions'] = () => ({
    ca: readFileSync(resolve('ca.crt'), 'utf8')
});

const sslOptionsFalse: ReturnType<CreateSSLSocketSpec>['sslOptions'] = () => false;

const extraOpt = () => ({
    timeout: 6e3 // 6s
});

const socketFactory = () => (options: NetConnectOpts) => net.createConnection(options);
const socketSSLFactory: ReturnType<CreateSSLSocketSpec>['socketSSLFactory'] = () => (options: SSLConfig) =>
    tsl.connect(options);

const clientConfig: ClientConfig = (forPool) => {
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
    sslOptions: sslOptions
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

superVisor
    .addConnection('idle')
    .then((query: Query) => {
        console.log('socket created?: %o!', query.constructor.name);
        query.parseSQL('foobar', 'select $1::int4 as hello, $2::int8 as world');
        query.flush();
        query.describe('foobar', 's'); // returns param-description and row-description
        query.flush();
        const _1 = new Uint8Array([0, 0, 0, 4]);
        const _2 = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
        query.bind('foobar', 'foobar', [1, 1], [_1, _2], [1, 1]);
        query.flush();
        query.describe('foobar', 'p'); // only returns row-description
        query.flush();
        query.describe('foobar', 's'); // only returns row-description
        query.flush();
        query.terminate();
        //query.execute('foobar', 0);
        //query.describe('foobar', 'p');
        //query.sync();
        //query.execute('foobar', 1);
        //query.close('p', 'foobar');
        //query.sync();
        //_1[0] = 1;
        //query.bind('foobar', 'foobar', [1], [_1], [0, 1]);
        //query.execute('foobar', 5);
        //query.close('p', 'foobar');
        //_1[0] = 0;
        //_1[3] = 0;
        //query.bind('foobar', 'foobar', [1], [_1], [0, 1]);
        //query.execute('foobar', 0);
        //const _1 = new Uint8Array(4);
        //_1[3] = 5;
        //query.bind('foorbar', 'foobar', [1], [_1], 0);
        //query.sync();
        // query.simpleQuery('SELECT * from auth.user where id > 4');
    })
    .catch((err) => console.log('socket creation fail:', err));
