'use strict';

module.exports = {
    postgresMd5PasswordHash,
    randomBytes,
    deriveKey,
    sha256,
    hmacSha256,
    md5
};

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf8');

export function randomBytes(length): ArrayBuffer {
    return crypto.getRandomValues(new Uint8Array(length));
}

async function md5(str: string): Promise<string> {
    const md5Raw = await globalThis.crypto.subtle.digest('md5', encoder.encode(str));
    return decoder.decode(md5Raw);
}

// See AuthenticationMD5Password at https://www.postgresql.org/docs/current/static/protocol-flow.html
async function postgresMd5PasswordHash(user, password, salt) {
    var inner = await md5(password + user);
    var outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
    return 'md5' + outer;
}

/**
 * Create a SHA-256 digest of the given data
 * @param {Buffer} data
 */
async function sha256(text) {
    return await subtleCrypto.digest('SHA-256', text);
}

/**
 * Sign the message with the given key
 * @param {ArrayBuffer} keyBuffer
 * @param {string} msg
 */
async function hmacSha256(keyBuffer, msg) {
    const key = await subtleCrypto.importKey('raw', keyBuffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return await subtleCrypto.sign('HMAC', key, textEncoder.encode(msg));
}

/**
 * Derive a key from the password and salt
 * @param {string} password
 * @param {Uint8Array} salt
 * @param {number} iterations
 */
async function deriveKey(password, salt, iterations) {
    const key = await subtleCrypto.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const params = { name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iterations };
    return await subtleCrypto.deriveBits(params, key, 32 * 8, ['deriveBits']);
}
