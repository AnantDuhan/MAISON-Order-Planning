const mongoose = require('mongoose');
const dotenv = require("dotenv");
const Banner = require('../models/banner');
const generateId = require('../utils/generateId');

async function seedDefaultBanner() {
    try {
        const count = await Banner.countDocuments();
        if (count > 0) return;

        await Banner.create({
            _id: generateId(),
            title: 'Summer Sale',
            subtitle: 'Up to 50% Off',
            description: 'Discover the latest arrivals.',
            buttonText: 'Shop Now',
            image: { url: null },
            active: true,
            order: 0
        });
        console.log('🏷️  Seeded a default homepage banner (edit/replace via the admin banner endpoints).');
    } catch (error) {
        console.error('Banner seed skipped:', error.message);
    }
}

const MAX_RETRIES = Number(process.env.DB_CONNECT_RETRIES) || 5;
const RETRY_BASE_MS = 2000;

// Connect with bounded exponential backoff. A transient Atlas blip (or a
// not-yet-active IP whitelist change) no longer hard-crashes the process on
// the first failure — it retries, then exits with a clear message only after
// exhausting retries. Once the initial connection succeeds, the driver's own
// auto-reconnect handles later drops.
async function connectWithRetry(attempt = 1) {
    try {
        const data = await mongoose.connect(process.env.DB_HOSTED_URI, {
            maxPoolSize: Number(process.env.DB_MAX_POOL_SIZE) || 10,
            minPoolSize: Number(process.env.DB_MIN_POOL_SIZE) || 0,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`🚀 MongoDB connected with server: ${data.connection.host}`);
        seedDefaultBanner();
    } catch (err) {
        console.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
        if (attempt >= MAX_RETRIES) {
            console.error(
                '❌ Could not connect to MongoDB after maximum retries. ' +
                'Check DB_HOSTED_URI and that your IP is whitelisted in Atlas ' +
                '(Network Access). Exiting.'
            );
            process.exit(1);
        }
        const delay = RETRY_BASE_MS * 2 ** (attempt - 1); // 2s, 4s, 8s, 16s, ...
        console.log(`Retrying MongoDB connection in ${delay / 1000}s...`);
        setTimeout(() => connectWithRetry(attempt + 1), delay);
    }
}

const connectDB = () => {
    connectWithRetry();

    // Visibility into the driver's own reconnection lifecycle after first connect.
    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected — driver will attempt to reconnect.');
    });
    mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected.');
    });
    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
    });
};

module.exports = connectDB;