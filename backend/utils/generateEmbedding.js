// CommonJS like the rest of the backend (this file used to be ESM and only
// loaded thanks to Node 22's require(esm) support).
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({
            model: 'gemini-embedding-001'
        });

        const result = await model.embedContent(text);

        return result.embedding.values;
    } catch (error) {
        console.error('Embedding Generation Error:', error.message);
        return null;
    }
};

module.exports = { generateEmbedding };
