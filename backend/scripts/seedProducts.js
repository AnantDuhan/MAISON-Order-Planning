const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../config/config.env') });

const Product = require('../models/product');
const User = require('../models/user');
const generateId = require('../utils/generateId');

// ---- config (override via env) --------------------------------------------
const TOTAL = Number(process.env.SEED_COUNT) || 1000;
const MULTI_IMAGE_RATIO = 0.7; // 70% of products get multiple images
const CLEAR_EXISTING = process.env.CLEAR_EXISTING === 'true';
const ADMIN_USER_ID = process.env.SEED_USER_ID; // optional; otherwise auto-pick

// ---- word pools for varied names/descriptions -----------------------------
const BRANDS = ['Aura', 'Nova', 'Zephyr', 'Apex', 'Lumen', 'Terra', 'Vertex',
    'Onyx', 'Sol', 'Vibe', 'Pulse', 'Halo', 'Forge', 'Drift', 'Quill', 'Meridian',
    'Atlas', 'Cove', 'Ember', 'Frost'];
const TIERS = ['Pro', 'Max', 'Ultra', 'Lite', 'Plus', 'Elite', 'Air', 'Neo',
    'Prime', 'Core', ''];

const CATALOG = {
    Electronics: {
        nouns: ['Wireless Earbuds', 'Smartwatch', 'Bluetooth Speaker', 'Laptop',
            'Gaming Mouse', 'Mechanical Keyboard', 'Power Bank', 'Headphones',
            'Webcam', 'Smart TV', 'Tablet', 'Drone', 'Action Camera', 'Monitor',
            'Router', 'Soundbar', 'Fitness Band', 'Charging Dock'],
        price: [999, 99999],
        blurbs: [
            'Crystal-clear audio and long battery life for all-day use.',
            'Sleek design meets powerful performance and fast connectivity.',
            'Built for creators and gamers who demand responsiveness.',
            'Smart features, effortless pairing, and a premium finish.'],
    },
    Apparel: {
        nouns: ['Denim Jacket', 'Cotton T-Shirt', 'Hoodie', 'Chinos',
            'Running Shoes', 'Maxi Dress', 'Leather Belt', 'Wool Sweater',
            'Polo Shirt', 'Joggers', 'Bomber Jacket', 'Linen Shirt', 'Sneakers',
            'Cargo Pants', 'Knit Cardigan'],
        price: [399, 7999],
        blurbs: [
            'Premium fabric with a comfortable, modern fit.',
            'Timeless style that pairs with everything in your wardrobe.',
            'Breathable, durable, and made for everyday wear.',
            'Effortless comfort with a clean, contemporary silhouette.'],
    },
    'Home & Kitchen': {
        nouns: ['Espresso Machine', 'Air Fryer', 'Robot Vacuum', 'Cookware Set',
            'Blender', 'Table Lamp', 'Bed Sheet Set', 'Ceramic Mug Set',
            'Stand Mixer', 'Electric Kettle', 'Knife Set', 'Storage Rack',
            'Diffuser', 'Toaster', 'Cast Iron Pan'],
        price: [499, 49999],
        blurbs: [
            'Upgrade your kitchen with reliable, everyday performance.',
            'Thoughtfully designed to make home life simpler.',
            'Durable materials built to last for years.',
            'A modern essential for the well-equipped home.'],
    },
    Beauty: {
        nouns: ['Vitamin C Serum', 'Matte Lipstick', 'Face Moisturizer',
            'Hair Dryer', 'Cleansing Balm', 'Sunscreen SPF 50', 'Eye Cream',
            'Beard Trimmer', 'Face Mask Set', 'Nail Care Kit'],
        price: [149, 4999],
        blurbs: [
            'Nourishing formula for healthy, radiant results.',
            'Dermatologist-tested and gentle on all skin types.',
            'A daily-ritual essential with visible benefits.',
            'Clean ingredients, professional-grade performance.'],
    },
    Sports: {
        nouns: ['Yoga Mat', 'Dumbbell Set', 'Running Shorts', 'Water Bottle',
            'Tennis Racket', 'Resistance Bands', 'Cricket Bat', 'Football',
            'Cycling Gloves', 'Gym Bag', 'Jump Rope', 'Foam Roller'],
        price: [199, 12999],
        blurbs: [
            'Engineered for performance and built to endure.',
            'Lightweight, grippy, and ready for your next session.',
            'The dependable choice for training and competition.',
            'Comfort and durability for every workout.'],
    },
    Books: {
        nouns: ['Hardcover Novel', 'Cookbook', 'Self-Help Guide',
            'Science Anthology', 'Children\u2019s Picture Book', 'Business Handbook',
            'Poetry Collection', 'History Volume', 'Travel Guide', 'Art Book'],
        price: [149, 2999],
        blurbs: [
            'A captivating read you won\u2019t want to put down.',
            'Beautifully written and thoughtfully produced.',
            'An essential addition to any bookshelf.',
            'Insightful, engaging, and highly rated by readers.'],
    },
};

const CATEGORIES = Object.keys(CATALOG);

// ---- helpers ---------------------------------------------------------------
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const roundPrice = n => Math.max(99, Math.round(n / 10) * 10 - 1); // e.g. 2499

// Stable numeric seed from a string so images don't change between runs.
function seedNum(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
}

// Turn a product noun into LoremFlickr keyword tags, e.g.
// "Wireless Earbuds" -> "wireless,earbuds".
function toKeyword(noun) {
    return noun
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, ',');
}

function buildImages(id, keyword) {
    // 70% multiple images (2-4), 30% single image.
    const count = Math.random() < MULTI_IMAGE_RATIO ? randInt(2, 4) : 1;
    const base = seedNum(id);
    return Array.from({ length: count }, (_, i) => ({
        _id: generateId(),
        // LoremFlickr returns a real photo matching the keyword(s); `lock`
        // keeps the image stable across runs and varies it per image index.
        url: `https://loremflickr.com/600/600/${keyword}?lock=${base + i}`,
    }));
}

function buildProduct(userId, usedIds) {
    let id = generateId();
    while (usedIds.has(id)) id = generateId();
    usedIds.add(id);

    const category = pick(CATEGORIES);
    const cat = CATALOG[category];
    const brand = pick(BRANDS);
    const tier = pick(TIERS);
    const noun = pick(cat.nouns);
    const name = [brand, tier, noun].filter(Boolean).join(' ');

    const [minP, maxP] = cat.price;
    const price = roundPrice(randInt(minP, maxP));

    // ~5% out of stock so the in-stock filter is testable.
    const Stock = Math.random() < 0.05 ? 0 : randInt(5, 2000);

    // ~30% unrated; the rest 3.0–5.0.
    const ratings = Math.random() < 0.3 ? 0 : Math.round(randInt(30, 50)) / 10;

    return {
        _id: id,
        name,
        description: `${name}. ${pick(cat.blurbs)}`,
        price,
        category,
        Stock,
        ratings,
        numOfReviews: ratings ? randInt(1, 250) : 0,
        images: buildImages(id, toKeyword(noun)),
        user: userId,
        createdAt: new Date(Date.now() - randInt(0, 365) * 24 * 60 * 60 * 1000),
    };
}

// ---- run -------------------------------------------------------------------
(async () => {
    try {
        await mongoose.connect(process.env.DB_HOSTED_URI);
        console.log('Connected to MongoDB');

        // A product needs an owner (User ref). Use SEED_USER_ID if given,
        // otherwise the first admin, otherwise any user.
        let userId = ADMIN_USER_ID;
        if (!userId) {
            const admin =
                (await User.findOne({ role: 'admin' }).select('_id')) ||
                (await User.findOne().select('_id'));
            if (!admin) {
                console.error(
                    '\u274c No users found. Create at least one user (ideally an admin) ' +
                    'before seeding, or pass SEED_USER_ID=<userId>.'
                );
                process.exit(1);
            }
            userId = admin._id;
        }
        console.log(`Attributing products to user: ${userId}`);

        if (CLEAR_EXISTING) {
            const { deletedCount } = await Product.deleteMany({});
            console.log(`Cleared ${deletedCount} existing products`);
        }

        const usedIds = new Set();
        const products = Array.from({ length: TOTAL }, () =>
            buildProduct(userId, usedIds)
        );

        const multi = products.filter(p => p.images.length > 1).length;
        console.log(
            `Generated ${products.length} products — ${multi} with multiple images ` +
            `(${Math.round((multi / products.length) * 100)}%)`
        );

        // Insert in batches so a single large insert doesn't strain the connection.
        const BATCH = 200;
        let inserted = 0;
        for (let i = 0; i < products.length; i += BATCH) {
            const chunk = products.slice(i, i + BATCH);
            await Product.insertMany(chunk, { ordered: false });
            inserted += chunk.length;
            console.log(`Inserted ${inserted}/${products.length}`);
        }

        console.log(`\u2705 Done. Inserted ${inserted} products.`);
        console.log('Next: run "npm run reindex" to load them into Elasticsearch.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error('Seed failed:', e.message);
        process.exit(1);
    }
})();