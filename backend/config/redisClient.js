import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL 
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

const connectRedis = async () => {
    try {
        await redisClient.connect();
        console.log('🐘 Redis client connected successfully!');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
};

connectRedis();

export default redisClient;