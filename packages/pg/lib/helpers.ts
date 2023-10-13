export const encoder = new TextEncoder();
export const decoder = new TextDecoder('utf8');

export type BINVIEW_LINE = {
    address: string;
    hex: [string, string];
    human: [string, string];
};

const MAX_BUFFER = 8192;
const MAX_BYTES_PER_LINE = 8;
const LINES_PER_PAGE = 8;

const MAX_BYTES_PER_LINE_LN2 = Math.trunc(Math.log2(MAX_BYTES_PER_LINE));
const LINES_PER_PAGE_LN2 = Math.trunc(Math.log2(LINES_PER_PAGE));

function getHexAddress(offset: number) {
    offset = offset & 0xffff;
    return offset.toString(16);
}

function get4HexBytes(dv: DataView, cursor: number) {
    const rc = ['', '', '', ''];
    for (let i = 0; i < 4 && cursor + i < dv.byteLength; i++) {
        rc[i] = dv.getUint8(cursor + i).toString(16);
    }
    return rc.join(' ');
}

function getHumanChars(dv: DataView, cursor: number) {
    const rc = ['', '', '', ''];
    for (let i = 0; i < 4 && cursor + i < dv.byteLength; i++) {
        const v = dv.getUint8(cursor + i);
        rc[i] = v >= 32 && v <= 127 ? String.fromCharCode(v) : '.';
    }
    return rc.join('');
}

export function viewBin(dv: Uint8Array, pageIndex = 0, linesPerPageLN2 = LINES_PER_PAGE_LN2): BINVIEW_LINE[] {
    // only show 8192 bytes max,
    // 8192 bytes is 8192-> 4096 -> 2048 -> 1024 lines made up of 8 bytes

    const dv_protected = new DataView(dv.buffer, 0, MAX_BUFFER);
    const len = dv_protected.buffer.byteLength;
    const pages = len << (MAX_BYTES_PER_LINE_LN2 + linesPerPageLN2);
    // clamp pageIndex
    const index = Math.min(Math.max(0, pageIndex), pages - 1);
    // page props
    const byteOffsetPage = index * pages;
    // this could contain remnants
    const nrBytesThisPage = Math.min(1 << (MAX_BYTES_PER_LINE_LN2 + linesPerPageLN2), len - byteOffsetPage);
    // recalculate the lines in this page in case of remnants
    const nrLinesThisPage = Math.ceil(nrBytesThisPage / (1 << MAX_BYTES_PER_LINE_LN2));
    // we can pre-allocate now

    // last row might need special treatment
    const rc = Array.from<BINVIEW_LINE>({ length: nrLinesThisPage });
    for (let line = 0, cursor = byteOffsetPage; line < nrLinesThisPage - 1; line++, cursor += MAX_BYTES_PER_LINE) {
        rc[line] = {
            address: getHexAddress(cursor),
            hex: [get4HexBytes(dv_protected, cursor), get4HexBytes(dv_protected, cursor + 4)],
            human: [getHumanChars(dv_protected, cursor), getHumanChars(dv_protected, cursor + 4)]
        };
    }
    return rc;
}
