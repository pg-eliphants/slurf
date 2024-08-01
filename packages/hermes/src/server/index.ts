'use strict';

import * as bodyParser from 'body-parser';
import * as  express from 'express';
import * as session from 'express-session';
import * as path from 'path';

import { registerAuth } from '~lib/registerAuth';
import { SystemInfo } from '~system';

import {
    AdaptorPostgreSQL as Adaptor
} from '~adaptors/postgres';

import {
    // AdaptorMock as Adaptor
} from '~adaptors/mock';

import { Logger } from '~lib/logger';

const logger = Logger.getLogger();

import {
    IHermesStoreProperties
} from '~hermes-props';

import { HermesStore } from '~lib/HermesStore';

/* init */
/* init */

SystemInfo.createSystemInfo({ maxErrors: 5000, maxWarnings: 5000 });

const app = express();

app.use(
    bodyParser.json({
        /*type: 'application/*+json',*/
        inflate: true,
        limit: '100kb',
        strict: true,
        verify: (req, buf, encoding) => {
            req;
            buf;
            encoding;
        }
    })
);

app.use(
    bodyParser.urlencoded({
        extended: true,
        inflate: true,
        limit: '100kb',
        parameterLimit: 1000,
        type: 'application/x-www-form-urlencoded',
        verify: (req, buf, encoding) => {
            req;
            buf;
            encoding;
        }
    })
);

app.use(
    bodyParser.text({
        defaultCharset: 'utf-8',
        inflate: true,
        limit: '100kb',
        type: 'text/html',
        verify: (req, buf, encoding) => {
            req;
            buf;
            encoding;
        }
    })
);

app.use(bodyParser.raw({
    inflate: true,
    limit: '100kb',
    type: 'application/vnd.custom-type'
}));

const adaptor = new Adaptor({
    url: 'postgresql://bookbarter:bookbarter@jacob-bogers.com:443/bookbarter?sslmode=allow'
});

const props: IHermesStoreProperties = {
    adaptor,
    defaultCookieOptionsName: 'default_cookie'
};


const hermesStore = new HermesStore(props);
hermesStore.once('connect', () => {

    logger.info('store is initialized');

    init();

    app.listen(8080, () => {
        logger.warn('app is listening on 8080');
    });

});

function init() {

    app.use(session({
        cookie: hermesStore.getDefaultCookieOptions(),
        name: 'hermes.id',
        resave: false,
        rolling: false,
        saveUninitialized: false,
        secret: 'the fox jumps over the lazy dog',
        store: hermesStore,
        unset: 'destroy'

    }));

    /* fake middleware */
    registerAuth({ graphQL_url: '/graphql' }, app);
    app.use('/', express.static(path.resolve('dist/client')));


    app.get(/.*/, (req, res) => {
       req;
       res.set({'Content-Type': 'text/html'});
       res.sendFile(path.resolve('dist/client/index.html'));
    });

}

process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});

process.on('SIGINT', () => {
    logger.warn('Caught [SIGINT] interrupt signal');
    adaptor.shutDown()
        .then(() => process.emit('exit', 0))
        .catch(() => process.emit('exit', 1));
});
