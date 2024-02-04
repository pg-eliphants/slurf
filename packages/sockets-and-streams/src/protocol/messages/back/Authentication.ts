import { MessageState } from './types';
import { MSG_IS, MSG_UNDECIDED, MSG_ERROR } from './constants';
import { i32 } from './helper';
import ReadableByteStream from '../../../io/ReadableByteStream';

export type Ok = 'O';
export type KerberosV5 = 'K';
export type ClearTextPassword = 'Clr';
export type MD5Password = 'MD5';
export type GSSType = 'G';
export type GSSContinue = 'GC';
export type SSPIType = 'SSPI';
export type SASLType = 'S';
export type SASLContinue = 'SC';
export type SASLFinal = 'SF';

export type AuthenticationType =
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

export const OK: Ok = 'O';
export const KERBEROSV5: KerberosV5 = 'K';
export const CLEARTEXTPASSWORD: ClearTextPassword = 'Clr';
export const MD5PASSWORD: MD5Password = 'MD5';
export const GSS: GSSType = 'G';
export const GSSCONTINUE: GSSContinue = 'GC';
export const SSPI: SSPIType = 'SSPI';
export const SASL: SASLType = 'S';
export const SASLCONTINUE: SASLContinue = 'SC';
export const SASLFINAL: SASLFinal = 'SF';
//      0             4   5   6 7  8    9
// || [ R] [00 00 00 ..] [00 00 00 ff] byteN
export function matcherLength() {
    return 9; // number of bytes
}

export function messageLength(bin: Uint8Array, start: number): null | number {
    const field = bin[start + 8];
    switch (field) {
        case 0:
        // no 1
        case 2:
        case 3:
        // no 4
        // no 6
        case 7:
        case 9:
            return 9;
        case 5:
            return 10;
        case 8:
        case 10:
        case 11:
        case 12:
            // calculate
            const len = i32(bin, start + 1);
            return len + 1;
    }
    return null;
}

export function match(bin: Uint8Array, start: number): MessageState {
    const len = bin.length - start;
    if (len < 9) {
        return MSG_UNDECIDED;
    }
    const msgLen = messageLength(bin, start);
    if (msgLen === null) {
        return MSG_ERROR;
    }
    if (len < msgLen) {
        return MSG_UNDECIDED;
    }
    if (msgLen === 9) {
        if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 8)) {
            return MSG_ERROR;
        }
    } else if (msgLen === 10) {
        if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3] === 0 && bin[start + 4] === 9)) {
            return MSG_ERROR;
        }
    }
    return MSG_IS;
}

const mapFieldToType = [
    OK, // 0
    undefined, //1
    KERBEROSV5,
    CLEARTEXTPASSWORD,
    undefined, // 4
    MD5PASSWORD,
    undefined, // 6
    GSS,
    GSSCONTINUE,
    SSPI,
    SASL, //10
    SASLCONTINUE,
    SASLFINAL //12
];

export function isType(bin: Uint8Array, start: number): null | AuthenticationType {
    const field = bin[start + 8];
    const type = mapFieldToType[field];
    return type ?? null;
}

// js objects
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

export function parse(ctx: ReadableByteStream, txtDecoder: TextDecoder): null | undefined | Authentication {
    const { buffer, cursor } = ctx;
    const matched = match(buffer, cursor);
    const len = buffer.byteLength - cursor;
    if (matched === MSG_UNDECIDED) {
        return undefined;
    }
    if (matched === MSG_ERROR) {
        return null;
    }
    // if isType() is not null then messageLength() must return not null either
    // the int8 value at bin[cursor + 8] (i32 value at bin[cursor + 5]) and int8 at bin[cursor + 0] deteremine
    const type = isType(buffer, cursor);
    if (type === null) {
        //
        return null;
    }
    const msgLen = messageLength(buffer, cursor);
    if (msgLen === null) {
        return null;
    }
    // we can do this safely here since we have a copy of "cursor"
    // at the top of the function
    ctx.advanceCursor(msgLen);
    // IS_MSG
    /*
    AuthenticationOk (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(0)
        Specifies that the authentication was successful.
    */
    if (type === OK) {
        return { type: OK }; // authentication ok
    }
    /*
    AuthenticationKerberosV5 (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(2)
        Specifies that Kerberos V5 authentication is required.
    */
    if (type === KERBEROSV5) {
        return { type: KERBEROSV5 }; // authentication ok
    }
    /*
    AuthenticationCleartextPassword (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(3)
        Specifies that a clear-text password is required.
    */
    if (type === CLEARTEXTPASSWORD) {
        return { type: CLEARTEXTPASSWORD }; // authentication ok
    }
    /*
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
        return { type: MD5PASSWORD, salt };
    }
    /*
    AuthenticationGSS (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32(8)
        Length of message contents in bytes, including self.

        Int32(7)
        Specifies that GSSAPI authentication is required.
    */
    if (type === GSS) {
        return { type: GSS };
    }
    /*
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
    AuthenticationSASL (B) 
        Byte1('R')
        Identifies the message as an authentication request.

        Int32
        Length of message contents in bytes, including self.

        Int32(10)
        Specifies that SASL authentication is required.

        The message body is a list of SASL authentication mechanisms, in the server's order of preference. A zero byte is required as terminator after the last authentication mechanism name. For each mechanism, there is the following:

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
