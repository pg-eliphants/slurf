import { MessageState } from '../types';
import { MSG_NOT, MSG_IS, MSG_UNDECIDED, MSG_ERROR } from '../constants';
import { i32 } from '../helper';
import type ReadableByteStream from '../../../utils/ReadableByteStream';

type Ok = 'O';
type KerberosV5 = 'K';
type ClearTextPassword = 'Clr';
type MD5Password = 'MD5';
type GSSType = 'G';
type GSSContinue = 'GC';
type SSPIType = 'SSPI';
type SASLType = 'S';
type SASLContinue = 'SC';
type SASLFinal = 'SF';

type AuthenticationType =
    | Ok
    | KerberosV5
    | ClearTextPassword
    | MD5Password
    | GSSType
    | GSSContinue
    | SSPIType
    | SASLType
    | SASLContinue
    | SASLFinal;

const OK: Ok = 'O';
const KERBEROSV5: KerberosV5 = 'K';
const CLEARTEXTPASSWORD: ClearTextPassword = 'Clr';
const MD5PASSWORD: MD5Password = 'MD5';
const GSS: GSSType = 'G';
const GSSCONTINUE: GSSContinue = 'GC';
const SSPI: SSPIType = 'SSPI';
const SASL: SASLType = 'S';
const SASLCONTINUE: SASLContinue = 'SC';
const SASLFINAL: SASLFinal = 'SF';

export type AuthenticationOk = { type: Ok };
export type AuthenticationMD5Password = { type: MD5Password; salt: number };
export type AuthenticationGSSContinue = { type: GSSContinue; authData: Uint8Array };
export type AuthenticationSASL = { type: SASLType; mechanisms: string[] };
export type AuthenticationSASLContinue = { type: SASLContinue; saslData: Uint8Array };
export type AuthenticationSASLFinal = { type: SASLFinal; additional: Uint8Array };
export type AuthenticationKerberos = { type: KerberosV5 };
export type AuthenticationClearText = { type: ClearTextPassword };
export type AuthenticationGSS = { type: GSSType };
export type AuthenticationSSPI = { type: SSPIType };

export type Authentication =
    | AuthenticationOk
    | AuthenticationKerberos
    | AuthenticationClearText
    | AuthenticationMD5Password
    | AuthenticationGSS
    | AuthenticationGSSContinue
    | AuthenticationSSPI
    | AuthenticationSASL
    | AuthenticationSASLContinue
    | AuthenticationSASLFinal;

// type guards
export function isAuthOkMsg(u: any): u is AuthenticationOk {
    return u?.type === OK;
}

export function isAuthClearTextPassword(u: any): u is AuthenticationClearText {
    return u?.type === CLEARTEXTPASSWORD;
}

const dynLen = (bin: Uint8Array, start: number) => i32(bin, start + 1) + 1;

const mapFieldToAuthLen = {
    0: { t: OK, l: 9 }, // 0
    // no 1
    2: { t: KERBEROSV5, l: 9 },
    3: { t: CLEARTEXTPASSWORD, l: 9 },
    // no 4
    5: { t: MD5PASSWORD, l: 13 },
    // no 6
    7: { t: GSS, l: 9 },
    // 8 exist but in dyn len other list
    9: { t: SSPI, l: 9 }
};

const mapFieldToAuthDynLen = {
    8: { t: GSSCONTINUE, l: dynLen },
    10: { t: SASL, l: dynLen },
    11: { t: SASLCONTINUE, l: dynLen },
    12: { t: SASLFINAL, l: dynLen } //12
};

function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    // 'R' = 82 ascii
    if (bin[start] !== 82) {
        return MSG_NOT;
    }
    if (len < 9) {
        return MSG_UNDECIDED;
    }
    const field = i32(bin, start + 5);

    const msgLen: number | undefined = mapFieldToAuthDynLen[field]?.l(bin, start) || mapFieldToAuthLen[field]?.l;

    if (msgLen === undefined) {
        return MSG_ERROR;
    }

    if (len < msgLen) {
        return MSG_UNDECIDED;
    }

    if (msgLen === 9) {
        if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 8)) {
            return MSG_ERROR;
        }
    } else if (msgLen === 13) {
        if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 12)) {
            return MSG_ERROR;
        }
    }
    return MSG_IS;
}

// js objects

export function parse(ctx: ReadableByteStream, txtDecoder: TextDecoder): false | null | undefined | Authentication {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    if (matched === MSG_ERROR) {
        return null;
    }
    if (matched === MSG_NOT) {
        return false;
    }

    const len = buffer.byteLength - cursor;
    const field = i32(buffer, cursor + 5);
    const type: AuthenticationType = mapFieldToAuthLen[field]?.t || mapFieldToAuthDynLen[field]?.t;
    const msgLen: number = mapFieldToAuthDynLen[field]?.l(buffer, cursor) || mapFieldToAuthLen[field]?.l;

    // we can do this safely here since we have a copy of "cursor"
    // at the top of the function
    ctx.advanceCursor(msgLen);
    // IS_MSG ?
    /*
    9 bytes
    AuthenticationOk (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(0)
        Specifies that the authentication was successful.
    */
    if (type === OK) {
        return { type: OK } as AuthenticationOk; // AuthenticationOk
    }
    /*
    9 bytes
    AuthenticationKerberosV5 (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(2)
        Specifies that Kerberos V5 authentication is required.
    */
    if (type === KERBEROSV5) {
        return { type: KERBEROSV5 }; // AuthenticationKerberosV5
    }
    /*
    9 bytes
    AuthenticationCleartextPassword (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(3)
        Specifies that a clear-text password is required.
    */
    if (type === CLEARTEXTPASSWORD) {
        return { type: CLEARTEXTPASSWORD }; // AuthenticationCleartextPassword
    }
    /*
    13 bytes
    AuthenticationMD5Password (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(12)
        Length of message contents in bytes, including self.

        Int32(5)
        Specifies that an MD5-encrypted password is required.

        Byte4
        The salt to use when encrypting the password.
    */
    if (type === MD5PASSWORD) {
        const salt = i32(buffer, cursor + 9);
        return { type: MD5PASSWORD, salt }; // AuthenticationMD5Password
    }
    /*
    9 bytes
    AuthenticationGSS (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(7)
        Specifies that GSSAPI authentication is required.
    */
    if (type === GSS) {
        return { type: GSS }; // AuthenticationGSS
    }
    /*
    9 bytes + n bytes
    AuthenticationGSSContinue (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32
        Length of message contents in bytes, including self.

        Int32(8)
        Specifies that this message contains GSSAPI or SSPI data.

        Byten
        GSSAPI or SSPI authentication data.
    */
    if (type === GSSCONTINUE) {
        if (len < msgLen) {
            return undefined;
        }
        const authData = buffer.slice(cursor + 9, cursor + msgLen);
        return { type: GSSCONTINUE, authData };
    }
    /*
    9 bytes
    AuthenticationSSPI (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(9)
        Specifies that SSPI authentication is required.
    */
    if (type === SSPI) {
        return { type: SSPI };
    }
    /*
    9 bytes + n
    AuthenticationSASL (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32
        Length of message contents in bytes, including self.

        Int32(10)
        Specifies that SASL authentication is required.

        The message body is a list of SASL authentication mechanisms,
            in the server's order of preference. 
        A zero byte is required as terminator after the last authentication
            mechanism name. For each mechanism, there is the following:

        String
        Name of a SASL authentication mechanism.
    */
    if (type === SASL) {
        if (len < msgLen) {
            return undefined;
        }
        const mechanisms: string[] = [];
        for (let pos = cursor + 9; pos < len; ) {
            if (buffer[pos] === 0) {
                // dont need to advance cursor
                // that has alraedy been done
                return { type: SASL, mechanisms };
            }
            const idx = buffer.indexOf(0, pos);
            const value = txtDecoder.decode(buffer.slice(pos, idx));
            mechanisms.push(value);
            pos = idx + 1;
        }
        return null; // error happened!
    }
    /*
    9 bytes + n bytes
    AuthenticationSASLContinue (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32
        Length of message contents in bytes, including self.

        Int32(11)
        Specifies that this message contains a SASL challenge.

        Byten
        SASL data, specific to the SASL mechanism being used.
    */
    if (type === SASLCONTINUE) {
        if (len < msgLen) {
            return undefined;
        }
        const saslData = buffer.slice(cursor + 9, msgLen);
        // no need to advance cursor, that has already been done
        return { type: SASLCONTINUE, saslData };
    }
    /*
    9 bytes + n bytes
    AuthenticationSASLFinal (B) #
        Byte1('R')
        Identifies the message as an authentication request.

        Int32
        Length of message contents in bytes, including self.

        Int32(12)
        Specifies that SASL authentication has completed.

        Byten
        SASL outcome "additional data", specific to the SASL mechanism being used.
    */
    if (type === SASLFINAL) {
        if (len < msgLen) {
            return undefined;
        }
        const additional = buffer.slice(cursor + 9, msgLen);
        return { type: SASLFINAL, additional };
    }
    return null;
}
