import { BackendKeyData } from '../../messages/fromBackend/BackEndKeyData';
import { ParameterStatus } from '../../messages/fromBackend/ParameterStatus';
import { ReadyForQueryResponse } from '../../messages/fromBackend/ReadyForQuery';
import Encoder from '../../utils/Encoder';
import Enqueue from '../Enqueue';
import { SocketControlMsgs } from '../socket/messages';
import { SuperVisorControlMsgs } from '../supervisor/messages';
import { QueryControlMsgs } from './messages';

export default class Query implements Enqueue<QueryControlMsgs> {
    constructor(
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder,
        private readonly parameterStatus: ParameterStatus[],
        private readonly backendKey: BackendKeyData,
        private readonly initialR4Q: ReadyForQueryResponse
    ) {}
    public enqueue(data: QueryControlMsgs) {}
}
