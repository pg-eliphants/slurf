import { PGConfig } from '../../actors/supervisor/types';
import Encoder from '../../utils/Encoder';

export function createStartupMessage(config: Required<PGConfig>, encoder: Encoder): Uint8Array | undefined {
    const bin = encoder
        .init('128')
        .nextMessage()
        ?.i16(3)
        ?.i16(7)
        ?.cstr('user')
        ?.cstr(config.user)
        ?.cstr('database')
        ?.cstr(config.database)
        ?.cstr('replication')
        ?.cstr(String(config.replication))
        // todo: you can add more options here, check out "client connect options" we need to loop over all posibilities
        ?.cstr('')
        ?.setLength()
        ?.getMessage();
    return bin;
}
