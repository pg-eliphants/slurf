export type DeveloperInterfaceConnectionOptions = {
    // authentication
    user: string;
    password: string;
    port: number[]; // to support multiple host/ports
    host: string[]; // to support multiple host/ports
    database: string;
    encoding: string;
    pathname: string;
    // ssl part
    sslmode: 'disable' | 'prefer' | 'require' | 'verify-ca' | 'verify-full' | 'no-verify';
    sslcert: string; // filename of client certificate
    sslkey: string; // file location of the secret key (client cert)
    sslpassword: string; // if the client secret is protected by password
    sslrootcert: string; // file name will use it to verify the server certificate
    sslcrl: string; // ssl server revocation list
    // administrative
    application_name: string; // how your connection will show up in postgres log
    // connection management
    keepalives_idle: number;
    keepalives_interval: number;
    keepalives_count_lost: number;
    keepalives_initial_delay_millis: number;
    replication: 1 | true | 'on' | 'yes' | 'database' | false | 'off' | 'no' | 0;
    // stream
    stream: unknown; // what is this?
};

export type InternalConnectionOptions = {
    auth: {
        user: string;
        password: string;
    };
    tcp: {
        protocol: string;
        port: number[]; // to support multiple host/ports
        host: string[]; // to support multiple host/ports
        keepalives_idle: number;
        keepalives_interval: number;
        keepalives_count_lost: number;
        keepalives_initial_delay_millis: number;
    };
    unix_socket: {
        host: string; // pathname
        database: string; // from "db" query param
        client_encoding: string; // from "encoding" query param
    };
    ssl: {
        rejectUnauthorized: boolean;
        ca: string; // content of root certificate
        key: string; // client private key
        cert: string; // client public key
    };
    encoding: string;
    application_name: string;
    replication: 1 | true | 'on' | 'yes' | 'database' | false | 'off' | 'no' | 0;
};
