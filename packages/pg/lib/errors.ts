export const errors = {
    ERR_SASL_INVALID_ATTRIBUTE: 'SASL: Invalid attribute pair entry at position, ? of string ?',
    ERR_SASL_NO_SCRAM: 'SASL: Only mechanism SCRAM-SHA-256 is currently supported, the current machanisms are: ?',
    ERR_SASL_NOT_INITAL_RESPONSE: 'SASL: Last message was not SASLInitialResponse: ?',
    ERR_SASL_CLIENT_FIRST_MSG: 'SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string: ?',
    ERR_SASL_PASSWORD_EMPTY_STRING: 'SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string',
    ERR_SASL_SERVER_NOT_STRING: 'SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string',
    ERR_SASL_SERVER_INVALID_ATTRIBUTE_PAIR: 'SASL: Invalid attribute pair entry at position: ?, full text: ?',
    ERR_SASL_SERVER_NOUNCE_MISSING: 'SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing',
    ERR_SASL_SERVER_SALT_MISSING: 'SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing',
    ERR_SASL_SERVER_SALT_NOT_B64: 'SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64, salt= ?',
    ERR_SASL_SERVER_NOUCE_NOT_START_WITH_CLIENT_NOUNCE:
        'SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce: client=?, server=?',
    ERR_SASL_SERVER_NOUNCE_SHORTER_THEN_CLIENT:
        'SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short, client length=?, server.length=?'
};

const restTypes = ['bigint', 'number', 'string'];

function stringify(a: unknown): string {
    if (a === null) {
        return 'null';
    }
    if (a === undefined) {
        return 'undefined';
    }
    if (Array.isArray(a)) {
        return a.map(stringify).join(',');
    }
    if (String(a).startsWith('class') || String(a.constructor).startsWith('class')) {
        return String(a);
    }
    if (restTypes.indexOf(typeof a) >= 0) {
        return String(a);
    }
    if (typeof a === 'object') {
        return JSON.stringify(a);
    }
    return String(a);
}
export function createErrorText(code: keyof typeof errors, ...args: unknown[]): string {
    const template = errors[code];
    let i = 0;
    return template.replace(/[^\?](\?)/, () => {
        const rc = stringify(args[i]);
        i++;
        return rc;
    });
}
