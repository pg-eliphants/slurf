import { ErrorAndNotices, PGErrorResponse, PGNoticeResponse } from './types';

export const noticeAndErrorTemplate: ErrorAndNotices = {
    S: '',
    V: '',
    C: '',
    M: '',
    D: '',
    H: '',
    P: '',
    p: '',
    q: '',
    W: '',
    s: '',
    t: '',
    c: '',
    d: '',
    n: '',
    F: '',
    L: '',
    R: ''
};

export const PG_ERROR: PGErrorResponse['type'] = 'pg.E';
export const PG_NOTICE: PGNoticeResponse['type'] = 'pg.N';
