export type ProtocolStateSteadyState = 'query-in-transit' | 'idle';
export type ProtocolStateStartup = 'setup-connection-01-startup';
export type ProtocolStateInitial = 'none';

export type ProtocolStateAll = ProtocolStateSteadyState | ProtocolStateStartup | ProtocolStateInitial; // more to add

export type PGConfig = {
    user: string;
    database?: string;
    replication?: boolean | string;
    ssl?:
        | false
        | {
              ca: string;
          };
};

export type SetClientConfig = (config: PGConfig) => void;
export type GetClientConfig = (setConfig: SetClientConfig) => void;
