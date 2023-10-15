import { Socket } from 'net';
import type { TcpNetConnectOpts } from 'net';
import testServer from './server-partial';

const portOption = '--connect-port=';

function getPort() {
    const port = process.argv.slice(2).find((opt) => opt.toLocaleLowerCase().startsWith(portOption));
    console.log('port found:', port);
    return port ? parseInt(port.slice(portOption.length)) : NaN;
}

/*
    - fd <number> If specified, wrap around an existing socket with the given file descriptor, otherwise a new socket will be created.
    - allowHalfOpen <boolean> If set to false, then the socket will automatically end the writable side when the readable side ends. See net.createServer() and the 'end' event for details. Default: false.
    - readable <boolean> Allow reads on the socket when an fd is passed, otherwise ignored. Default: false.
    - writable <boolean> Allow writes on the socket when an fd is passed, otherwise ignored. Default: false.
    - signal <AbortSignal> An Abort signal that may be used to destroy the socket.
*/

function createTcpNetConnectOpts(): TcpNetConnectOpts | undefined {
    const port = getPort();
    if (isNaN(port)) {
        return undefined;
    }
    return { port };
}

async function connectToCounterParty() {
    console.log('connecting to counterparty');
    const options = createTcpNetConnectOpts();
    if (!options) {
        return;
    }
    const socket = new Socket();
    socket.setEncoding('utf8');
    socket.setNoDelay(true);
    socket.setKeepAlive(true);
    /* reabable events ex socket */
    socket.on('pause', (...args: unknown[]) => {
        console.log('/end [%o]', args);
    });
    /* socket events */
    // Emitted when the other end of the socket signals the end of transmission,
    // (independent of the fact, this side of the connection called "end()")
    socket.on('end', (...args: unknown[]) => {
        console.log('/end [%o]', args);
    });
    socket.on('drain', () => {
        console.log('/drain');
    });
    socket.on('data', (thunk: string) => {
        console.log('/data, socket timeout is:', socket.timeout);
        console.log('/data, ended?', socket.readableEnded);
        console.log('/data, received type [%s], data:[%o]', typeof thunk, thunk);
    });
    socket.on('error', (err: AggregateError) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        const prunedErrors = Array.from(err.errors).map((err: Error) => ({
            message: err.message
        }));
        console.log('/error occurred [%o]:', prunedErrors);
    });
    // timeout has no arguments
    // timeout due to idle does not depend on "keep alive"
    socket.on('timeout', (...args: unknown[]) => {
        console.log('/timeout: [%o]', args);
        // // setting the timeout will re-trigger the timeout again
        // socket.setTimeout(3000);
    });
    socket.on('close', (hadError) => {
        console.log('/close: hadError: [%s]', hadError);
    });
    // there is no argument for "connect" callback
    socket.on('connect', () => {
        console.log('/connect received');
    });
    socket.on('ready', (...args: unknown[]) => {
        console.log('/ready: [%o]', args);
    });
    socket.on('lookup', (...args: unknown[]) => {
        console.log('/lookup: [%o]', args);
    });
    socket.connect(options, () => {
        socket.setTimeout(3000);
        console.log('/socket.connect(): socket connected');
        setTimeout(() => {
            socket.end('ending socket');
            console.log('end event + data sent');
        }, 10e3);
    });
}

testServer()
    .then((/*server*/) => {
        return connectToCounterParty();
    })
    .catch((err) => {
        console.log('something bad happened', err);
    });
