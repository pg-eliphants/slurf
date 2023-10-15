import testServer from './server-partial';

testServer(59599).catch((err) => console.log('Server shut down with error:', err));
