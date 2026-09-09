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
        .connect(process.env.DB_HOSTED_URI)
        .then(data => {
            console.log(
                `🚀 MongoDB connected with server: ${data.connection.host}`
            );
            seedDefaultBanner();
        });
}

module.exports = connectDB;
