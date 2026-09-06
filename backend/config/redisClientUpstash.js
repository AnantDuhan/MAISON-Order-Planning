const { Redis } = require("@upstash/redis");
const dotenv = require("dotenv");

dotenv.config({ path: './backend/config/config.env' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

console.info("🐘 Upstash Redis initialized");

module.exports = redis;