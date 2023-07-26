export default function byteaToBinary(input: string): Uint8Array {
    if (input?.[0] === '\\' && input?.[1] === 'x') {
        return binaryFromHexString(input);
    }
    return binaryFromEscapedString(input);
}

const hexDigits = '0123456789abcdef';

function binaryFromHexString(input: string): Uint8Array {
    const hexString = input.slice(2, input.length - ((input.length - 2) % 2));
    const rc = new Uint8Array(hexString.length >> 1);
    for (let i = 0; i < hexString.length; i += 2) {
        const v1 = hexDigits.indexOf(hexString[i]);
        const v2 = hexDigits.indexOf(hexString[i + 1]);
        if (v1 === -1) {
            return rc.slice(0, i << 1);
        }
        if (v2 === -1) {
            return rc.slice(0, i << 1);
        }
        rc[i >> 1] = (v1 << 4) | v2; // big endian
    }
    return rc;
}

function binaryFromEscapedString(input: string): Uint8Array {
    let output: string = '';
    let i = 0;
    while (i < input.length) {
        if (input[i] !== '\\') {
            output += input[i];
            ++i;
        } else {
            if (/[0-7]{3}/.test(input.slice(i + 1, i + 1 + 3))) {
                output += String.fromCharCode(parseInt(input.slice(i + 1, i + 1 + 3), 8));
                i += 4;
            } else {
                let backslashes = 1;
                while (i + backslashes < input.length && input[i + backslashes] === '\\') {
                    backslashes++;
                }
                for (let k = 0; k < Math.floor(backslashes >> 1); ++k) {
                    output += '\\';
                }
                i += Math.floor(backslashes >> 1) << 1;
            }
        }
    }
    // blit
    // do this in wasm!
    const rc = new Uint8Array(output.length);
    for (let i = 0; i < output.length; i++) {
        rc[i] = output[i].charCodeAt(0);
    }
    return rc;
}
