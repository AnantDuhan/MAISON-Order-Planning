const IORedis = require('ioredis');
const dotenv = require('dotenv');

dotenv.config({ path: './backend/config/config.env' });

// BullMQ requires ioredis (not node-redis) and maxRetriesPerRequest: null on a
// TCP endpoint (Upstash rediss://). Keep this connection dedicated to the queue.
const connection = new IORedis(process.env.REDIS_UPSTASH_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

connection.on('error', err => console.error('Queue Redis error:', err.message));

module.exports = connection;
