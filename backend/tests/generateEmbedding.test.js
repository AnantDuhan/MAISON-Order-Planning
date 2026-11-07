const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Stand-in for the Google Gen AI SDK, loaded before generateEmbedding.
let calls;
let reply;
require.cache[require.resolve('@google/genai')] = {
    exports: {
        GoogleGenAI: class {
            constructor(options) {
                this.models = {
                    embedContent: async params => {
                        calls.push({ apiKey: options.apiKey, ...params });
                        if (reply instanceof Error) throw reply;
                        return reply;
                    },
                };
            }
        },
    },
};
const { generateEmbedding, _resetClient } = require('../utils/generateEmbedding');

beforeEach(() => {
    calls = [];
    reply = { embeddings: [{ values: [0.1, 0.2, 0.3] }] };
    process.env.GEMINI_API_KEY = 'key';
    _resetClient();
});

test('returns the vector from the Gen AI SDK, using gemini-embedding-001', async () => {
    assert.deepEqual(await generateEmbedding('Linen shirt'), [0.1, 0.2, 0.3]);
    assert.deepEqual(calls, [{ apiKey: 'key', model: 'gemini-embedding-001', contents: 'Linen shirt' }]);
});

test('no key, empty text or an API error give null instead of throwing', async () => {
    assert.equal(await generateEmbedding('   '), null);
    reply = new Error('quota');
    assert.equal(await generateEmbedding('Lamp'), null);
    delete process.env.GEMINI_API_KEY;
    assert.equal(await generateEmbedding('Lamp'), null);
    assert.equal(calls.length, 1);
});
