// CommonJS like the rest of the backend (this file used to be ESM and only
// loaded thanks to Node 22's require(esm) support).
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Built on first use and reused: one client and model for the process.
let embeddingModel = null;
const getEmbeddingModel = apiKey => {
    if (!embeddingModel) {
        embeddingModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-embedding-001' });
    }
    return embeddingModel;
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
        const model = getEmbeddingModel(apiKey);

        const result = await model.embedContent(text);

        return result.embedding.values;
    } catch (error) {
        console.error('Embedding Generation Error:', error.message);
        return null;
    }
};

module.exports = { generateEmbedding };
