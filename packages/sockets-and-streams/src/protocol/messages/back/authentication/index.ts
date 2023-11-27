import { MessageState } from '../../types';
import { MSG_IS, MSG_NOT, MSG_UNDECIDED, MSG_ERROR } from '../../constants';
import { AUTH_CLASS } from '../constants/index';

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

export type Authentication = 
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
export const GSSCONTINUE: Authentication = 'GC';
export const SSPI: SSPIType = 'SSPI';
export const SASL: SASLType = 'S';
export const SASLCONTINUE: SASLContinue = 'SC';
export const SASLFINAL: SASLFinal = 'SF';

export function matcherLength() {
    return 9; // number of bytes
}

export function messageLength(bin: Uint8Array, start: number): false | number {
    const field = bin[start + 5];
    switch(field){
        case 0:
        case 2:
        case 3:
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
            const len = (bin[start + 1] << 24) + (bin[start + 2] << 16) + (bin[start +  3] << 8) + bin[start + 4];
            return len + 1;
    }
    return false;
}

export function match(bin: Uint8Array, start: number): MessageState {
    if (bin[start] !== AUTH_CLASS){
        return MSG_NOT;
    }
    const len = bin.length - start;
    if (len < matcherLength()){
        return MSG_UNDECIDED;
    }
    const msgLen = messageLength(bin, start);
    if (msgLen === false){
        return MSG_ERROR;
    }
    if (len < msgLen) {
        return MSG_UNDECIDED;
    }
    if (msgLen === 9){
        if (!(bin[start + 1] === 0 && bin[start + 2] === 0 && bin[start + 3]=== 0 && bin[start + 4] === 8)){
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
]

export function isType(bin: Uint8Array, start: number): null | Authentication {
    const field = bin[start + 5];
    const type = mapFieldToType[field]
    return type ?? null;
}

// js objects
export type AuthenticationMD5Password = { type: MD5Password,  salt: number };
export type AuthenticationGSSContinue = { type: GSSContinue, auth_data: Uint8Array };
export type AuthenticationSASL = { type: SASLType, mechanisms: string[] };
export type AuthenticationSASLContinue = { type: SASLContinue, saslData: Uint8Array };
export type AuthenticationSASLFinal = { type: SASLFinal, additional: Uint8Array  };


export function parse(bin: Uint8Array, start: number): undefined | AuthenticationMD5Password /*| AuthenticationGSSContinue | AuthenticationSASL | AuthenticationSASLContinue|AuthenticationSASLFinal*/ {
    const type = isType(bin, start);
    if (type === MD5PASSWORD){
        const salt = (bin[start + 9] << 24) + (bin[start + 10] << 16) + (bin[start + 11] << 8) + bin[start + 12];
        return { type: MD5PASSWORD, salt };
    }
}