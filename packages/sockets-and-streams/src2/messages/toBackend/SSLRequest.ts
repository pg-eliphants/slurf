import Encoder from '../../utils/Encoder';

export default function createSSLRequest(encoder: Encoder) {
    return encoder.init(64)?.nextMessage()?.i32(80877103)?.setLength().getMessage();
}
