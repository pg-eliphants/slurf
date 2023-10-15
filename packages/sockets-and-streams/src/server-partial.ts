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
        console.log('new connected to from:', socket.address());
        socket.setEncoding('utf8');
        socket.on('drain', () => {
            console.log('/drain');
        });
        socket.on('end', (...args: unknown[]) => {
            console.log('/end with arguments, [%o]', args);
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
            console.log('/close hadError:[%s]', hadError);
        });
        socket.on('connect', () => {
            console.log('/connect received');
        });
    });

    server.on('close', () => {
        console.log('server shut down');
    });
    return new Promise((resolve, reject) => {
        server.listen(port, () => {
            console.log('server is listening on:', server.address());
            resolve(server);
        });
        server.on('error', (err: Error) => {
            reject(err);
            server.close();
        });
    });
}
