import { SelectedMessages } from '../../messages/fromBackend/types';
import Encoder from '../../utils/Encoder';
import Enqueue from '../Enqueue';
import { QID } from '../constants';
import {
    BufferStuffingAttack,
    EndConnection,
    MangledData,
    NegotiateProtocolVersion,
    NetworkError,
    PasswordMissing
} from '../messages';
import { SocketControlMsgs } from '../socket/messages';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { QUERY_START } from './constants';
import { QueryControlMsgs } from './messages';

export default class Query implements Enqueue<QueryControlMsgs> {
    constructor(
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder,
        private readonly infoTokens: (
            | SelectedMessages
            | NegotiateProtocolVersion
            | EndConnection
            | NetworkError
            | BufferStuffingAttack
            | MangledData
            | PasswordMissing
        )[]
    ) {}
    public enqueue(msg: QueryControlMsgs) {
        if (msg.type === QUERY_START) {
            this.socketActor.enqueue({ type: QID })
            // what to do here
            // 
            console.log('query-start', this.infoTokens);
            return;
        }
    }
}
