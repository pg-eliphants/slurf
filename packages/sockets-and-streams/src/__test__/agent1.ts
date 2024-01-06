/**
 * > sockets-and-streams@1.0.0 devclient
> tsx ./src/agent1.ts --connect-port=59599

server is listening on: { address: '::', family: 'IPv6', port: 52710 }
connecting to counterparty
port found: --connect-port=59599
/lookup: [[ null, '::1', 6, 'localhost', [length]: 4 ]]
/lookup: [[ null, '127.0.0.1', 4, 'localhost', [length]: 4 ]]
/connect received
callback/socket.connect()
/ready: [[ [length]: 0 ]]
/timeout: [[ [length]: 0 ]]
:readableEnded false
:writableEnded false
:writableFinished false
:errored null
:readyState open
:closed false
end event + data sent
:readableEnded false
:writableEnded true
:writableFinished false
:errored null
:readyState readOnly
:closed false
/finish [[ [length]: 0 ]]
readableEnded false
writableEnded true
writableFinished true
/readable start, to read:[21]
/data, socket timeout is: 3000
/data, ended? false
/data, received type [string], data:['reply: cending socket']
/readable -> read() -> [reply: cending socket]
/readable null received
/readable end
/readable start, to read:[0]
/readable null received
/readable end
/end [[ [length]: 0 ]]
readableEnded true
writableEnded true
writableFinished true
/close: hadError: [false]
 */

import { Socket } from 'net';
import type { TcpNetConnectOpts } from 'net';
import testServer from './server-partial';

const portOption = '--connect-port=';

function getPort() {
    const port = process.argv.slice(2).find((opt) => opt.toLocaleLowerCase().startsWith(portOption));
    console.log(port ? `port found: ${port}` : `no port given on cmd line option ${portOption}`);
    return port ? parseInt(port.slice(portOption.length)) : NaN;
}
function createTcpNetConnectOpts(): TcpNetConnectOpts | undefined {
    const port = getPort();
    if (isNaN(port)) {
        return undefined;
    }
    return { port };
}

/*
    - fd <number> If specified, wrap around an existing socket with the given file descriptor, otherwise a new socket will be created.
    - allowHalfOpen <boolean> If set to false, then the socket will automatically end the writable side when the readable side ends. See net.createServer() and the 'end' event for details. Default: false.
    - readable <boolean> Allow reads on the socket when an fd is passed, otherwise ignored. Default: false.
    - writable <boolean> Allow writes on the socket when an fd is passed, otherwise ignored. Default: false.
    - signal <AbortSignal> An Abort signal that may be used to destroy the socket.
*/

function isAggregateError(err: unknown): err is AggregateError {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (err as AggregateError)?.errors !== undefined;
}

async function connectToCounterParty(options: TcpNetConnectOpts) {
    console.log('connecting to counterparty');
    const socket = new Socket();
    socket.setEncoding('utf8');
    socket.setNoDelay(true);
    socket.setKeepAlive(true);

    // finish event indicates that after this side "end()" pun the steam
    // and all pending data has been received by counterparty
    // at the very least it's "readyState" is marked as 'read-only'
    // only when a close event is emitted can we safely say there will be no more data transmitted over the socket
    // 1. end() -> writableEnded=true, writableFinished=false
    // 2. pending write data flushed -> writableFinished=true
    // by definition do not keep writing data after you have ended the stream yourself ofc
    socket.on('finish', (...args: unknown[]) => {
        console.log('/finish [%o]', args);
        console.log('/finish/readableEnded', socket.readableEnded);
        console.log('/finish/writableEnded', socket.writableEnded);
        console.log('/finish/writableFinished', socket.writableFinished);
        console.log('/finish/readyState', socket.readyState);
    });

    /* stream.Readable events ex socket */
    // emitted when resume() is called and readableFlowing !== true
    // hence it is switching to "flowing mode"
    socket.on('resume', (...args: unknown[]) => {
        console.log('/resume [%o]', args);
    });

    // 'pause' event is emitted if stream.Readable.pause() is called AND "readableFlowing" is "true" or "null"
    // stream.Readable.resume() will put the stream into a flowing state (emtting events).
    socket.on('pause', (...args: unknown[]) => {
        console.log('/pause [%o]', args);
    });
    // stream has readable information
    // if 'readable' is registered
    //    if 'data' is also registerd
    //         then readable will  get data via .read(), aswell as emitted via 'data'
    //  'readable' emitted before 'data' or 'end'
    //
    /*
    /readable start
    /data, socket timeout is: 3000
    /data, ended? false
    /data, received type [string], data:['reply: ending socket']
    /readable -> read() -> [reply: ending socket]
    /readable null received
    /readable end
    /readable start
    /readable null received
    /readable end
    */
    // disabled, we are not going to use 'readable' event
    /*
    socket.on('readable', () => {
        console.log('/readable start, to read:[%s]', socket.readableLength);
        let data: string | undefined | null;
        do {
            data = socket.read() as string;
            if (data === null) {
                console.log('/readable null received');
                continue;
            }
            console.log('/readable -> read() -> [%s]', data);
        } while (data);
        console.log('/readable end');
    });
    */
    /* socket events (read and writable) */
    // Emitted when the other end of the socket signals the end of transmission,
    // (independent of the fact, this side of the connection called "end()")
    socket.on('end', () => {
        console.log('/end');
        console.log('/end/readableEnded', socket.readableEnded);
        console.log('/end/writableEnded', socket.writableEnded);
        console.log('/end/writableFinished', socket.writableFinished);
        console.log('/end/readyState', socket.readyState);
    });
    socket.on('drain', () => {
        console.log('/drain');
    });
    socket.on('data', (thunk: string) => {
        console.log('/data/0/, socket timeout is:', socket.timeout);
        console.log('/data/readableEnded:', socket.readableEnded);
        console.log('/data/writableEnded:', socket.writableEnded);
        console.log('/data/writableFinished:', socket.writableFinished);
        console.log('/data/received type [%s], data:[%o]', typeof thunk, thunk);
    });
    socket.on('error', (err: Error & NodeJS.ErrnoException) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        if (err.syscall) {
            console.log('/error occurred [%o]:', { syscall: err.syscall, name: err.name, code: err.code });
            return;
        }
        if (isAggregateError(err)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            const prunedErrors = Array.from(err.errors).map((err: Error) => ({
                message: err.message
            }));
            console.log('/error occurred [%o]:', prunedErrors);
        }
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
        console.log('callback/socket.connect()');
        setTimeout(() => {
            console.log('/setTimeout');
            console.log('/setTimeout/socket.writableEnded', socket.writableEnded); // this can be false when ECONNRESET
            console.log('/setTimeout/readableEnded', socket.readableEnded); // this can be false when ECONNRESET
            console.log('/setTimeout/writableEnded', socket.writableEnded); // this can be false when ECONNRESET
            console.log('/setTimeout/writableFinished', socket.writableFinished); // this can be false when ECONNRESET
            console.log('/setTimeout/errored', socket.errored);
            console.log('/setTimeout/readyState', socket.readyState);
            console.log('/setTimeout/closed', socket.closed);

            if (socket.closed) {
                console.log('/setTimeout/further action suspended');
                return;
            }

            socket.end('this message was transmitted with socket.end(...)');
            console.log('%s/setTimeout/[socket.end(..) called%s', '\u001b[31m', '\u001b[0m');
            console.log('/setTimeout/readableEnded', socket.readableEnded);
            console.log('/setTimeout/writableEnded', socket.writableEnded);
            console.log('/setTimeout/writableFinished', socket.writableFinished);
            console.log('/setTimeout/errored', socket.errored);
            console.log('/setTimeout/readyState', socket.readyState);
            console.log('/setTimeout/closed', socket.closed);
            //
        }, 5e3);
    });
}

testServer()
    .then((/*server*/) => {
        const options = createTcpNetConnectOpts();
        if (options) {
            connectToCounterParty(options);
        }
    })
    .catch((err) => {
        console.log('something bad happened', err);
    });
