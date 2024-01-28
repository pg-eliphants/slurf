import { expect, it, describe } from 'vitest';
import createParseMessage from '../Parse';
import Encoder from '../../../Encoder';
import MemoryManager from '../../../../utils/MemoryManager';

describe('Parse', ()=> {
    it('create parse message with preparse name and some attributes', () => {
        const memManeger = new MemoryManager(); // ride the defaults
        const encoder = new Encoder(memManeger, new TextEncoder());
        const decoder = new TextDecoder();
        const bin = createParseMessage(
            encoder,
            'select oid::oid from pg_type where typname = $1::text',
            'findOIDByType',
            25,
        );
        expect(bin).toEqual(new Uint8Array([
            80,   0,   0,   0,  80, 102, 105, 110, 100,  79,  73,  68,
            66, 121,  84, 121, 112, 101,   0, 115, 101, 108, 101,  99,
           116,  32, 111, 105, 100,  58,  58, 111, 105, 100,  32, 102,
           114, 111, 109,  32, 112, 103,  95, 116, 121, 112, 101,  32,
           119, 104, 101, 114, 101,  32, 116, 121, 112, 110,  97, 109,
           101,  32,  61,  32,  36,  49,  58,  58, 116, 101, 120, 116,
             0,   0,   0,   0,   1,   0,   0,   0,  25
         ]));
    });
});
