import { createClient } from 'redis';

// Create a new Redis client instance
const redisClient = createClient({
    url: process.env.REDIS_URL,
});

// Event listener for successful connection
redisClient.on('ready', () => {
    console.log('Redis client connected successfully! 🐘');
});

// Event listener for connection errors
redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// Function to connect the client
const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};

// Connect and export
connectRedis();

export default redisClient;