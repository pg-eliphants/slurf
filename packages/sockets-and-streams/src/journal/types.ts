import { Notifications } from '../protocol/messages/back/types';

// after intialization you get the R4Q Response
// but there is still data that is not an ErrorResponse or a noticeResponse
export type AfterR4Q = {
    code: 0x10;
    //context: 'afterR';
    //data: Uint8Array | Notifications[] | [...Notifications[], Uint8Array];
    store: 128; // 128 = global
};

export type AllEvents = AfterR4Q;

export type ErrorEventMap = {
    [ErrorEvent in AllEvents as AllEvents['code']]: ErrorEvent;
};

export type ErrorEventCodeType = keyof ErrorEventMap;
export type ErrorEventStore<T extends ErrorEventCodeType> = AllEvents['store'];

export function createEvent<
    TName extends ErrorEventCodeType,
    //  TData extends ErrorEventData<TName>,
    TStore extends ErrorEventStore<TName>
>(code: TName, /*data: TData,*/ store: TStore): AllEvents {
    return { code, /*data,*/ store };
}
