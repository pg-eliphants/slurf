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
import createParseMessage from '../../messages/toBackend/Parse';
import { WRITE, WRITE_THROTTLE } from '../socket/constants';
import createSimpleQueryMessage from '../../messages/toBackend/Query';
import createSyncMessage from '../../messages/toBackend/Sync';

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

    async parseSQL(sql: string, name: string, ...iods: number[]){
        if (name) {
            if (name.length > 63){
                return null; // name is bigger then 63
            }
        }
        const result = createParseMessage(this.encoder, sql, name, ...iods);
        if (result === null){
            return false; // out of memory
        }
        await this.socketActor.enqueue({type: WRITE, data: result});
    }

     async simpleQuery(sql: string){
        const result = createSimpleQueryMessage(this.encoder, sql);
        if (result === null){
            return false; // out of memory
        }
        await this.socketActor.enqueue({type: WRITE, data: result});
    }

    async sync(){
        const result = createSyncMessage(this.encoder);
        if (!result) {
            return false;
        }
        await this.socketActor.enqueue({type: WRITE, data: result});
    }
}
