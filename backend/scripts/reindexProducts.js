const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './backend/config/config.env' });

const { bulkReindex } = require('../services/searchService');

(async () => {
    try {
        await mongoose.connect(process.env.DB_HOSTED_URI);
        console.log('Connected to MongoDB');
        const result = await bulkReindex();
        console.log(`✅ Reindexed ${result.indexed} products into Elasticsearch`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error('Reindex failed:', e.message);
        process.exit(1);
    }
})();
