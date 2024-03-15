import type { Authentication } from './Authentication';
import type { BackendKeyData } from './BackEndKeyData';
import type { NegotiateProtocolResult } from './NegotiateProtocol';
import type { ReadyForQueryResponse } from './ReadyForQuery';
import { PGErrorResponse, PGNoticeResponse } from './ErrorAndNoticeResponse/types';

export type AuthenticationToken = {
    type: 82;
    token: Authentication;
};

export type BackEndKeyDataToken = {
    type: 75;
    token: BackendKeyData;
};

export type ReadyForQueryToken = {
    type: 90;
    token: ReadyForQueryResponse;
};

export type ErrorResponseToken = {
    type: 69;
    token: PGErrorResponse;
};

export type NoticeResponseToken = {
    type: 78;
    token: PGNoticeResponse;
};

export type NegotiateProtocolToken = {
    type: 118;
    token: NegotiateProtocolResult;
};

export type Tokens =
    | AuthenticationToken
    | BackEndKeyDataToken
    | ReadyForQueryToken
    | ErrorResponseToken
    | NoticeResponseToken
    | NegotiateProtocolToken;

type TagToTokenMap = {
    [Token in Tokens as Token['type']]: Token;
};

export type TagType = keyof TagToTokenMap;
type TokenOfTypeMap<T extends TagType> = TagToTokenMap[T];
type SliceToken<T> = T extends { token: infer P } ? P : never;

export type TagToTokenGeneratorMap<
    TType extends TagType = TagType,
    TTokenMap = TokenOfTypeMap<TType>,
    TToken = SliceToken<TTokenMap>
> = {
    [index in TType]: () => TToken;
};

export type MessageState = 'undec' | 'is' | 'error' | 'not';
