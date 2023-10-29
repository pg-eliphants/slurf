import testServer from './server-partial';

testServer(9999).catch((err) => console.log('Server shut down with error:', err));
