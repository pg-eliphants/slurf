import { PGConfig } from '../../types';
export default function createStartupMessage(config: Required<PGConfig>): Uint8Array | undefined {
    const bin = this.encoder
        .init('128')
        .nextMessage()
        ?.i32(196608)
        ?.cstr('user')
        ?.cstr(config.user)
        ?.cstr('database')
        ?.cstr(config.database)
        //?.cstr('replication')
        //?.cstr(String(config.replication))
        // todo: you can add more options here, check out "client connect options" we need to loop over all posibilities
        ?.cstr('')
        ?.setLength()
        ?.getMessage();
    return bin;
}
