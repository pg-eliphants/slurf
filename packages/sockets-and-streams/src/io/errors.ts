export type ErrorTypes = {
    NO_INITIALIZER: 'e01';
    INITIALZE_FAIL: 'e02';
    NO_PROTOCOL_HANDLER: 'e03';
};

export type NotificationTypes = {
    INITIALIZER_DONE: 'n01';
    CONNECT_EVENT_HANDLED: 'n02';
};

export const ERR_IOMAN_NO_INTIALIZER: ErrorTypes['NO_INITIALIZER'] = 'e01';
export const ERR_IOMAN_INTIALIZE_FAIL: ErrorTypes['INITIALZE_FAIL'] = 'e02';
export const ERR_IOMAN_NO_PROTOCOL_HANDLER: ErrorTypes['NO_PROTOCOL_HANDLER'] = 'e03';

export const NFY_IOMAN_INITIAL_DONE: NotificationTypes['INITIALIZER_DONE'] = 'n01';
export const NFY_IOMAN_SOCKET_CONNECT_EVENT_HANDLED: NotificationTypes['CONNECT_EVENT_HANDLED'] = 'n02';
