import Encoder from '../../utils/Encoder';
import { PGConfig } from '../supervisor/types';

export function createSSLRequest(encoder: Encoder) {
    return encoder.init('64')?.nextMessage()?.i32(80877103)?.setLength().getMessage();
}
