export type NoticeAndErrorFields =
    | 'S'
    | 'V'
    | 'C'
    | 'M'
    | 'D'
    | 'H'
    | 'P'
    | 'p'
    | 'q'
    | 'W'
    | 's'
    | 't'
    | 'c'
    | 'd'
    | 'n'
    | 'F'
    | 'L'
    | 'R';

export type ErrorAndNotices = {
    [p in NoticeAndErrorFields]: string;
};

export type PGErrorResponse = {
    type: 'pg.E';
    pl: ErrorAndNotices;
};

export type PGNoticeResponse = {
    type: 'pg.N';
    pl: ErrorAndNotices;
};
