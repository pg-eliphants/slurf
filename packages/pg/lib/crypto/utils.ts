import nodeCrypto from 'node:crypto';

const encoder = new TextEncoder();

const randomBytes = nodeCrypto.randomBytes;
const md5TextAsBytes = encoder.encode('md5');

export function md5(strData: string, asHex = true) {
    const hash = nodeCrypto.createHash('md5');
    hash.update(strData, 'utf-8');
    return asHex ? hash.digest('hex') : new Uint8Array(hash.digest());
}

// See AuthenticationMD5Password at https://www.postgresql.org/docs/current/static/protocol-flow.html
export function postgresMd5PasswordHash(user: string, password: string, salt: Uint8Array) {
    const inner = md5(password + user, false) as Uint8Array;
    // salt is 4 bytes
    // md5 is a 3 byte string
    const outer = new Uint8Array(inner.length + 4 + 3);
    outer.set(md5TextAsBytes, 0); // set first 3 bytes to literal "md5"
    outer.set(inner, 4);
    outer.set(salt, inner.length);
    return outer;
}

export function sha256(text: Uint8Array): Uint8Array {
    return nodeCrypto.createHash('sha256').update(text).digest();
}

export function hmacSha256(key: Uint8Array, msg: string): Uint8Array {
    return nodeCrypto.createHmac('sha256', key).update(msg).digest();
}

export function deriveKey(password: string, salt: Uint8Array, iterations: number): Uint8Array {
    return nodeCrypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
}

export { randomBytes };
