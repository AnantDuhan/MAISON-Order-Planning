// Product embeddings, on the same Google Gen AI SDK as services/aiService.js.
const { GoogleGenAI } = require('@google/genai');

const EMBEDDING_MODEL = 'gemini-embedding-001';

// Built on first use and reused: one client for the process.
let client = null;
const getClient = apiKey => {
    if (!client) client = new GoogleGenAI({ apiKey });
    return client;
};

const generateEmbedding = async (text) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('GEMINI_API_KEY is not configured; skipping embedding generation.');
        return null;
    }
    if (typeof text !== 'string' || !text.trim()) {
        return null;
    }

    try {
        const response = await getClient(apiKey).models.embedContent({
            model: EMBEDDING_MODEL,
            contents: text,
        });
        return response.embeddings?.[0]?.values || null;
    } catch (error) {
        console.error('Embedding Generation Error:', error.message);
        return null;
    }
};

module.exports = { generateEmbedding, _resetClient: () => { client = null; } };
