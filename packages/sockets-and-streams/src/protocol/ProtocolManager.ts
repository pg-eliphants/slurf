import SocketIOManager from '../io/SocketIOManager';
import { SocketAttributes, PGSSLConfig } from '../io/types';
import { GetClientConfig, PGConfig, SetClientConfig } from './types';
import { normalizePGConfig, validatePGConnectionParams } from './helpers';
import { List } from '../utils/list';

export default class ProtocolManager {
    constructor(
        private readonly socketIOManager: SocketIOManager,
        private readonly getClientConfig: GetClientConfig
    ) {
        this.socketIOManager.setProtocolManager(this);
    }

    public binDump(item: Exclude<List<SocketAttributes>, null>, data: Uint8Array): boolean {
        return false;
    }

    public requestConnectionParams(): { errors: Error[] } | { config: Required<PGConfig> } {
        let config: PGConfig | undefined;
        const setClientConfig: SetClientConfig = ($config: PGConfig) => {
            config = $config;
        };
        this.getClientConfig(setClientConfig);
        const result = validatePGConnectionParams(config);
        if (result === true) {
            const configFinal = normalizePGConfig(config!);
            return { config: configFinal };
        }
        return { errors: result.errors };
    }

    public parseSQL(text: string) {}
}
