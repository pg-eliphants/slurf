import { Server, Socket } from 'net';
import type { ServerOpts } from 'net';

export default function createTestServer(port = 0): Promise<Server | Error> {
    const serverOptions: ServerOpts = {
        allowHalfOpen: false,
        noDelay: true,
        keepAlive: true
    };

    const server = new Server(serverOptions);
    server.on('connection', (socket: Socket) => {
        console.log('/server/connection: new connected to from:', socket.address());
        socket.setEncoding('utf8');
        const interval = setInterval(() => {
            console.log('writing data/');
            const rc = socket.write(new Uint8Array(64), (err) => {
                if (err) {
                    console.log('writing data/Error writing data  %o', err);
                    return;
                }
                console.log('writing data/data written');
            });
            console.log('writing data/backpressure: %s', rc);
        }, 12e3);
        //clearInterval(interval);
        socket.on('drain', () => {
            console.log('/drain');
        });
        socket.on('end', (...args: unknown[]) => {
            clearInterval(interval);
            console.log('/end with arguments, [%o]', args);
            console.log('/end/readableEnded', socket.readableEnded);
            console.log('/end/writableEnded', socket.writableEnded);
            console.log('/end/writableFinished', socket.writableFinished);
            console.log('/end/readyState', socket.readyState);
        });
        socket.on('finish', () => {
            clearInterval(interval);
            console.log('/finnish/readableEnded', socket.readableEnded);
            console.log('/finnish/writableEnded', socket.writableEnded);
            console.log('/finnish/writableFinished', socket.writableFinished);
            console.log('/finnish/readyState', socket.readyState);
        });
        socket.on('data', (data: string) => {
            console.log('/data, read ended?', socket.readableEnded);
            console.log('/data, write ended?', socket.writableEnded);
            console.log('/data, type of data object received: [%s]', data.constructor?.name);
            console.log('/data, received: [%o]', data);
            socket.write('reply: ' + data, (err) => {
                if (err) {
                    console.log('write(), resulted in err:[%o]', err);
                    return;
                }
                console.log('write() successfull');
            });
        });
        socket.on('close', (hadError) => {
            clearInterval(interval);
            console.log('/close socket.errorred = %o', socket.errored);
            console.log('/close hadError:[%s]', hadError);
            console.log('/close/readableEnded', socket.readableEnded);
            console.log('/close/writableEnded', socket.writableEnded);
            console.log('/close/writableFinished', socket.writableFinished);
            console.log('/close/readyState', socket.readyState);
        });
        socket.on('connect', () => {
            // this event will never be fires coz socket is already connected
            console.log('/connect received');
            console.log('/connect/readableEnded', socket.readableEnded);
            console.log('/connect/writableEnded', socket.writableEnded);
            console.log('/connect/writableFinished', socket.writableFinished);
            console.log('/connect/readyState', socket.readyState);
        });
        socket.on('error', (err) => {
            clearInterval(interval);
            // this event will never be fires coz socket is already connected
            console.log('/error  %o', err);
            console.log('/error/readableEnded', socket.readableEnded);
            console.log('/error/writableEnded', socket.writableEnded);
            console.log('/error/writableFinished', socket.writableFinished);
            console.log('/error/readyState', socket.readyState);
        });
    });

    server.on('close', () => {
        console.log('server/close');
    });
    server.on('error', (err: Error) => {
        console.log('server/error: [%o]', err);
    });
    return new Promise((resolve, reject) => {
        server.listen(port, () => {
            console.log('server is listening on:', server.address());
            resolve(server);
        });
    });
}
