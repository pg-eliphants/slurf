import { randomBytes, deriveKey, hmacSha256, sha256 } from './utils';
import { createErrorText } from '../errors';
import { toBase64, toBytes } from './base64';

export type Session = {
    mechanism: 'SCRAM-SHA-256';
    clientNonce: string;
    response: string;
    message: string;
    serverSignature?: string;
};

export function startSession(mechanisms: string): Session {
    if (mechanisms.indexOf('SCRAM-SHA-256') === -1) {
        throw new Error(createErrorText('ERR_SASL_NO_SCRAM', mechanisms));
    }

    const clientNonce = randomBytes(18).toString('base64');

    return {
        mechanism: 'SCRAM-SHA-256',
        clientNonce,
        response: 'n,,n=*,r=' + clientNonce,
        message: 'SASLInitialResponse'
    };
}

export function continueSession(session: Session, password: string, serverData: string) {
    // validate
    // did "we" (the client) put it there?
    if (session.message !== 'SASLInitialResponse') {
        throw new Error(createErrorText('ERR_SASL_NOT_INITAL_RESPONSE', session.message));
    }
    if (typeof password !== 'string') {
        throw new Error(createErrorText('ERR_SASL_CLIENT_FIRST_MSG', password));
    }
    if (password === '') {
        throw new Error(createErrorText('ERR_SASL_PASSWORD_EMPTY_STRING'));
    }
    if (typeof serverData !== 'string') {
        throw new Error(createErrorText('ERR_SASL_SERVER_NOT_STRING'));
    }

    const sv = parseServerFirstMessage(serverData);

    if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error(
            createErrorText('ERR_SASL_SERVER_NOUCE_NOT_START_WITH_CLIENT_NOUNCE', session.clientNonce, sv.nonce)
        );
    }
    if (sv.nonce.length === session.clientNonce.length) {
        throw new Error(
            createErrorText('ERR_SASL_SERVER_NOUNCE_SHORTER_THEN_CLIENT', session.clientNonce.length, sv.nonce.length)
        );
    }

    const clientFirstMessageBare = 'n=*,r=' + session.clientNonce;
    const serverFirstMessage = 'r=' + sv.nonce + ',s=' + sv.salt + ',i=' + sv.iteration;
    const clientFinalMessageWithoutProof = 'c=biws,r=' + sv.nonce;
    const authMessage = clientFirstMessageBare + ',' + serverFirstMessage + ',' + clientFinalMessageWithoutProof;

    const saltBytes = toBytes(sv.salt);
    const saltedPassword = deriveKey(password, saltBytes, sv.iteration);
    const clientKey = hmacSha256(saltedPassword, 'Client Key');
    const storedKey = sha256(clientKey);
    const clientSignature = hmacSha256(storedKey, authMessage);
    const clientProof = toBase64(xorBuffers(clientKey, clientSignature));
    const serverKey = hmacSha256(saltedPassword, 'Server Key');
    const serverSignatureBytes = hmacSha256(serverKey, authMessage);

    session.message = 'SASLResponse';
    session.serverSignature = toBase64(serverSignatureBytes);
    session.response = clientFinalMessageWithoutProof + ',p=' + clientProof;
}

export function finalizeSession(session: Session, serverData: string) {
    if (session.message !== 'SASLResponse') {
        throw new Error('SASL: Last message was not SASLResponse');
    }
    /*if (typeof serverData !== 'string') {
        throw new Error('SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string');
    }*/

    const { serverSignature } = parseServerFinalMessage(serverData);

    if (serverSignature !== session.serverSignature) {
        throw new Error('SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match');
    }
}

/**
 * printable       = %x21-2B / %x2D-7E
 *                   ;; Printable ASCII except ",".
 *                   ;; Note that any "printable" is also
 *                   ;; a valid "value".
 */
function isPrintableChars(text: string) {
    /*if (typeof text !== 'string') {
        throw new TypeError('SASL: text must be a string');
    }*/
    for (let i = 0; i < text.length; i++) {
        const cc = text.charCodeAt(i);
        if ((cc >= 0x21 && cc <= 0x2b) || (cc >= 0x2d && cc <= 0x7e)) {
            continue;
        }
        return false;
    }
    return true;
}

/**
 * base64-char     = ALPHA / DIGIT / "/" / "+"
 *
 * base64-4        = 4base64-char
 *
 * base64-3        = 3base64-char "="
 *
 * base64-2        = 2base64-char "=="
 *
 * base64          = *base64-4 [base64-3 / base64-2]
 */
function isBase64(text: string) {
    return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
}

function parseAttributePairs(text: string) {
    const attrMap: Record<string, string> = {};

    for (let end = text.indexOf(','), start = 0; text[start] === undefined; start = end + 1, end = text.indexOf(',')) {
        if (text[start + 1] !== '=') {
            throw new Error(createErrorText('ERR_SASL_SERVER_INVALID_ATTRIBUTE_PAIR', start, text));
        }
        attrMap[text[start]] = text.slice(start + 2, end);
    }
    return attrMap;
}

function parseServerFirstMessage(data: string) {
    const attrPairs = parseAttributePairs(data);
    const nonce = attrPairs.r;
    const salt = attrPairs.s;
    if (!nonce) {
        throw new Error(createErrorText('ERR_SASL_SERVER_NOUNCE_MISSING'));
    }
    if (!isPrintableChars(nonce)) {
        throw new Error('SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters');
    }
    if (!salt) {
        throw new Error(createErrorText('ERR_SASL_CLIENT_FIRST_MSG'));
    }
    if (!isBase64(salt)) {
        throw new Error(createErrorText('ERR_SASL_SERVER_SALT_NOT_B64', salt));
    }
    const iterationText = attrPairs.i;
    if (!attrPairs.i) {
        throw new Error('SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing');
    }
    if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error('SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count');
    }
    const iteration = parseInt(iterationText, 10);
    return {
        nonce,
        salt,
        iteration
    };
}

function parseServerFinalMessage(serverData: string) {
    const attrPairs = parseAttributePairs(serverData);
    const serverSignature = attrPairs.v;
    if (!serverSignature) {
        throw new Error('SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing');
    }
    if (!isBase64(serverSignature)) {
        throw new Error('SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64');
    }
    return {
        serverSignature
    };
}

function xorBuffers(a: Uint8Array, b: Uint8Array) {
    if (a.length !== b.length) {
        throw new Error('Buffer lengths must match');
    }
    if (a.length === 0) {
        throw new Error('Buffers cannot be empty');
    }
    const dest = new Uint8Array(a.length);
    for (let i = 0; i < dest.length; i++) {
        dest[i] = a[i] ^ b[i];
    }
    return dest;
}
