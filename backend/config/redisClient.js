const { createClient } = require('redis');
const dotenv = require("dotenv");

dotenv.config({ path: './backend/config/config.env' });

const redisClient = createClient({
    url: process.env.REDIS_HOSTED_URL 
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const redisClientPromise = redisClient.connect()
    .then(() => {
        console.log('🐘 Redis client connected successfully!');
        return redisClient;
    })
    .catch((err) => {
        console.error('Failed to connect to Redis:', err);
        throw err;
    });

module.exports = redisClientPromise;