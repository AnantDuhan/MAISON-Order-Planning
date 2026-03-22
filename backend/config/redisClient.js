const { createClient } = require('redis');

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