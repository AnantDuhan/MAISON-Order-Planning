const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.resolve(__dirname, "../config/config.env")
});

let redis;

// Checked and connected with the SAME variable (previously it checked
// REDIS_URL but connected to REDIS_UPSTASH_URL).
if (process.env.REDIS_URL) {
  const { createClient } = require('redis');
  const client = createClient({ url: process.env.REDIS_URL });
  const ready = client.connect().then(() => {
    console.info('Redis connected');
    return client;
  });
  // Callers get the rejection through their own .then(); this just stops a
  // failed boot-time connect from surfacing as an unhandled rejection.
  ready.catch(error => console.error('Redis connect failed:', error.message));

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