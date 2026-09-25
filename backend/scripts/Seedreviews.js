const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../config/config.env'), quiet: true });

const Product = require('../models/product');
const User = require('../models/user');
const generateId = require('../utils/generateId');

const FIRST = ['Aarav', 'Diya', 'Vivaan', 'Ananya', 'Rohan', 'Isha', 'Kabir',
    'Meera', 'Arjun', 'Sara', 'Aditya', 'Nikita', 'Karan', 'Priya', 'Dev',
    'Riya', 'Om', 'Sanya', 'Yash', 'Tara', 'Neil', 'Kavya', 'Ishaan', 'Anaya'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta',
    'Malhotra', 'Kapoor', 'Singh', 'Chopra', 'Bose', 'Menon', 'Rao', 'Duhan'];

const COMMENTS = {
    high: [
        'Exceeded my expectations — worth every penny.',
        'Fantastic quality and quick delivery. Highly recommend.',
        'Exactly as described. Very happy with this purchase.',
        'Great value for money. Would buy again without hesitation.',
        'Beautifully made and works perfectly.',
        'Impressed by the build quality. Absolutely love it.',
        'One of the best purchases I have made this year.',
    ],
    mid: [
        'Decent product — does the job but nothing special.',
        'It is okay. Works as expected, though I hoped for a bit more.',
        'Average quality for the price. Not bad, not great.',
        'Fine overall, but the packaging could be better.',
    ],
    low: [
        'Not quite what I expected. Quality could be better.',
        'Stopped working properly after a short while. Disappointed.',
        'A little overpriced for what you actually get.',
        'Had a few issues with it — would not strongly recommend.',
    ],
};

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Realistic e-commerce skew toward positive ratings.
function weightedRating() {
    const r = Math.random();
    if (r < 0.45) return 5;
    if (r < 0.75) return 4;
    if (r < 0.9) return 3;
    if (r < 0.96) return 2;
    return 1;
}

function commentFor(rating) {
    if (rating >= 4) return pick(COMMENTS.high);
    if (rating === 3) return pick(COMMENTS.mid);
    return pick(COMMENTS.low);
}

// How many reviews a product gets — biased so many products exceed 6, to
// exercise the "show all" UI. ~15% get none.
function reviewCountForProduct() {
    const r = Math.random();
    if (r < 0.15) return 0;
    if (r < 0.4) return randInt(1, 5);
    return randInt(6, 15);
}

(async () => {
    try {
        await mongoose.connect(process.env.DB_HOSTED_URI);
        console.log('Connected to MongoDB');

        const users = await User.find().select('_id name').lean();
        if (!users.length) {
            console.error('❌ No users found. Create at least one user before seeding reviews.');
            process.exit(1);
        }

        const products = await Product.find().select('_id').lean();
        if (!products.length) {
            console.error('❌ No products found. Seed products first (npm run seed:products).');
            process.exit(1);
        }
        console.log(`Adding reviews to ${products.length} products…`);

        const ops = [];
        let productsWithReviews = 0;
        let productsOverSix = 0;
        let totalReviews = 0;

        for (const product of products) {
            const count = reviewCountForProduct();
            if (count === 0) {
                // Reset to no reviews (keeps re-runs idempotent).
                ops.push({
                    updateOne: {
                        filter: { _id: product._id },
                        update: { $set: { reviews: [], ratings: 0, numOfReviews: 0 } },
                    },
                });
                continue;
            }

            const reviews = Array.from({ length: count }, () => {
                const rating = weightedRating();
                const author = pick(users);
                return {
                    _id: generateId(),
                    user: author._id,
                    name: `${pick(FIRST)} ${pick(LAST)}`,
                    rating,
                    comment: commentFor(rating),
                };
            });

            const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

            ops.push({
                updateOne: {
                    filter: { _id: product._id },
                    update: {
                        $set: {
                            reviews,
                            numOfReviews: reviews.length,
                            ratings: Math.round(avg * 10) / 10,
                        },
                    },
                },
            });

            productsWithReviews += 1;
            if (count > 6) productsOverSix += 1;
            totalReviews += count;
        }

        // Apply in batches.
        const BATCH = 200;
        for (let i = 0; i < ops.length; i += BATCH) {
            await Product.bulkWrite(ops.slice(i, i + BATCH), { ordered: false });
            console.log(`Updated ${Math.min(i + BATCH, ops.length)}/${ops.length} products`);
        }

        console.log(
            `\n✅ Done. ${totalReviews} reviews across ${productsWithReviews} products; ` +
            `${productsOverSix} products now have more than 6 reviews.`
        );
        console.log('Next: run "npm run reindex" if you want ratings reflected in search.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error('Seed reviews failed:', e.message);
        process.exit(1);
    }
})();