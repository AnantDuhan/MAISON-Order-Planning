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

const connectDB = () => {
    mongoose
        .connect(process.env.DB_HOSTED_URI, {
            // Cap the pool so that N API instances don't collectively exhaust
            // the cluster's connection limit. Each instance gets up to
            // maxPoolSize sockets; tune DB_MAX_POOL_SIZE per instance count.
            maxPoolSize: Number(process.env.DB_MAX_POOL_SIZE) || 10,
            minPoolSize: Number(process.env.DB_MIN_POOL_SIZE) || 0,
            // Fail fast instead of hanging when the primary is unreachable.
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        })
        .then(data => {
            console.log(
                `🚀 MongoDB connected with server: ${data.connection.host}`
            );
            seedDefaultBanner();
        });
}

module.exports = connectDB;
