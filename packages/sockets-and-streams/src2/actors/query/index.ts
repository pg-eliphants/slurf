import { SelectedMessages } from '../../messages/fromBackend/types';
import Encoder from '../../utils/Encoder';
import Enqueue from '../Enqueue';
import { DATA, END_CONNECTION, MANGELD_DATA, QID } from '../constants';
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
import Lexer from '../../utils/Lexer';
import ReadableByteStream from '../../utils/ReadableByteStream';
import { sendToSuperVisor } from '../helpers';
import { isInformationalToken } from './helpers';
import {
    BindCompleteTag,
    CloseCompleteTag,
    CommandCompleteTag,
    DataRowTag,
    EmptyQueryResponseTag,
    ErrorResponseTag,
    NoDataTag,
    NoticeResponseTag,
    ParameterDescriptionTag,
    ParameterStatusTag,
    ParsecompleteTag,
    PortalSuspendTag,
    ReadyForQueryTag,
    RowDescriptionTag
} from '../../messages/fromBackend/constants';
import createDescribeMessage, { DescribeType } from '../../messages/toBackend/Describe';
import createBindMessage, { formatTypes } from '../../messages/toBackend/Bind';
import { parseArgs } from 'util';

export default class Query implements Enqueue<QueryControlMsgs> {
    private lexer: Lexer<
        | ErrorResponseTag
        | NoticeResponseTag
        //
        | ParameterStatusTag
        | ReadyForQueryTag
        | NoDataTag
        | ParsecompleteTag
        | PortalSuspendTag
        | ParameterStatusTag
        | BindCompleteTag
        | CloseCompleteTag
        | CommandCompleteTag
        | DataRowTag
        | ParameterDescriptionTag
        | RowDescriptionTag
        | EmptyQueryResponseTag
    >;
    constructor(
        private readonly receivedBytes: ReadableByteStream,
        private readonly supervisor: Enqueue<SuperVisorControlMsgs>,
        private readonly socketActor: Enqueue<SocketControlMsgs>,
        private readonly encoder: Encoder,
        private readonly decoder: TextDecoder,
        // messages collected from the auth actor, session info actor
        private readonly infoTokens: (
            | SelectedMessages
            | NegotiateProtocolVersion
            | EndConnection
            | NetworkError
            | BufferStuffingAttack
            | MangledData
            | PasswordMissing
        )[]
    ) {
        this.lexer = new Lexer(
            receivedBytes,
            () => false,
            [90, 69, 78, 83, 50, 110, 49, 51, 67, 68, 115, 116, 84, 73],
            (readable, tokens) => {
                sendToSuperVisor(this.supervisor, this.socketActor, tokens, isInformationalToken);
                this.supervisor.enqueue({ type: MANGELD_DATA, pl: receivedBytes, socketActor });
            },
            (eol, readable, tokens, last) => {
                console.log(tokens[last]);
                return;
            },
            // outOfDomain
            (readable, tokens) => {
                // information token is local function
                sendToSuperVisor(this.supervisor, this.socketActor, tokens, isInformationalToken);
                this.socketActor.enqueue({ type: END_CONNECTION });
            },
            decoder
        );
    }
    public enqueue(msg: QueryControlMsgs) {
        if (msg.type === DATA) {
            this.receivedBytes.enqueue(msg.pl);
            this.lexer.handleData();
            return;
        }
        if (msg.type === QUERY_START) {
            this.socketActor.enqueue({ type: QID });
            return;
        }
    }

    async parseSQL(sql: string, name: string, ...iods: number[]) {
        if (name) {
            if (name.length > 63) {
                return null; // name is bigger then 63
            }
        }
        const result = createParseMessage(this.encoder, sql, name, ...iods);
        if (result === null) {
            return false; // out of memory
        }
        this.socketActor.enqueue({ type: WRITE, data: result });
    }

    async simpleQuery(sql: string) {
        const result = createSimpleQueryMessage(this.encoder, sql);
        if (result === null) {
            return false; // out of memory
        }
        await this.socketActor.enqueue({ type: WRITE_THROTTLE, data: result });
    }

    async sync() {
        const result = createSyncMessage(this.encoder);
        if (!result) {
            return false;
        }
        this.socketActor.enqueue({ type: WRITE, data: result });
    }

    async describe(name: string, type: DescribeType) {
        const result = createDescribeMessage(this.encoder, type, name);
        if (!result) {
            return false;
        }
        this.socketActor.enqueue({ type: WRITE, data: result });
    }

    async bind(
        name: string,
        portal: string,
        parameterFormat: formatTypes,
        parameterValues: Uint8Array[],
        resultFormat: formatTypes
    ) {
        const result = createBindMessage(this.encoder, portal, name, parameterFormat, parameterValues, resultFormat);
        if (!result) {
            return false;
        }
        this.socketActor.enqueue({ type: WRITE, data: result });
    }
}
