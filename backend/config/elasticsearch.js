const { Client } = require('@elastic/elasticsearch');

// Configured entirely via env:
//   Local dev:     ELASTICSEARCH_NODE=http://localhost:9200   (no auth)
//   Elastic Cloud: ELASTICSEARCH_NODE=https://...  + ELASTICSEARCH_API_KEY
//   Basic auth:    ELASTICSEARCH_USERNAME / ELASTICSEARCH_PASSWORD
const node = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';

const options = { node, requestTimeout: 5000, maxRetries: 2 };

if (process.env.ELASTICSEARCH_API_KEY) {
    options.auth = { apiKey: process.env.ELASTICSEARCH_API_KEY };
} else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
    options.auth = {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
    };
}

const esClient = new Client(options);

module.exports = esClient;
