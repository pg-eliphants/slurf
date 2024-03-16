import { NetworkData } from '../messages';

export type QueryStart = {
    type: 'query-start';
};

export type QueryControlMsgs = NetworkData | QueryStart;
