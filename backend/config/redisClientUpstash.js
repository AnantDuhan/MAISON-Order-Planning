const dotenv = require("dotenv");

dotenv.config({ path: './backend/config/config.env' });

let redis;

if (process.env.REDIS_URL) {
  const { createClient } = require('redis');
  const client = createClient({ url: process.env.REDIS_URL });
  const ready = client.connect().then(() => {
    console.info('Redis connected');
    return client;
  });

  client.on('error', (error) => {
    console.error('Redis client error:', error.message);
  });

  redis = {
    get: (...args) => ready.then((connectedClient) => connectedClient.get(...args)),
    set: (...args) => ready.then((connectedClient) => connectedClient.set(...args)),
    del: (...args) => ready.then((connectedClient) => connectedClient.del(...args)),
  };
} else {
  const { Redis } = require("@upstash/redis");
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.info("Upstash Redis initialized");
}

module.exports = redis;