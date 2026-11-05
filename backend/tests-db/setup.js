/**
 * Real-database tests: a throwaway MongoDB, real Mongoose models and indexes.
 *
 * The unit tests in tests/ stub Mongoose, so they can't see what only the
 * database enforces: unique and partial indexes, query operators, atomic
 * updates. These tests do.
 *
 * Where the database comes from:
 *   TEST_MONGODB_URI set  → that server (CI uses a MongoDB service container)
 *   otherwise             → mongodb-memory-server starts one (the first run
 *                           downloads a MongoDB binary, ~100 MB, then caches it)
 * Each test file gets its own database, dropped afterwards.
 *
 *   npm run test:db
 */
require('../tests/helpers'); // test env vars (JWT secret, FRONTEND_URL)
const mongoose = require('mongoose');

// No Redis in tests: the cache is a no-op, every read a miss.
const cache = require('../utils/cache');
cache.getJSON = async () => null;
cache.setJSON = async () => {};
cache.del = async () => {};
cache.claimOnce = async () => true;

let memoryServer = null;

const startDb = async () => {
    let uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
        const { MongoMemoryServer } = require('mongodb-memory-server-core');
        memoryServer = await MongoMemoryServer.create();
        uri = memoryServer.getUri();
    }
    const dbName = `maison_test_${process.pid}_${Date.now()}`;
    await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
    // Build every registered model's indexes before any test relies on them.
    await mongoose.syncIndexes();
};

const stopDb = async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    }
    if (memoryServer) await memoryServer.stop();
};

/** Empty every collection (indexes stay). */
const clearDb = async () => {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map(c => c.deleteMany({})));
};

// ---- Factories --------------------------------------------------------------------

let seq = 0;
const nextId = prefix => `${prefix}${String(++seq).padStart(6, '0')}`;

const DAY = 24 * 60 * 60 * 1000;

const orderDoc = (overrides = {}) => ({
    _id: nextId('o'),
    shippingInfo: { address: '1 Street', city: 'Coimbatore', state: 'TN', country: 'IN', pinCode: 641035, phoneNumber: 9876543210 },
    orderItems: [{ name: 'Lamp', price: 400, quantity: 1, images: [{ url: 'https://img/lamp.jpg' }], product: 'p-lamp' }],
    user: 'u1',
    paymentInfo: { id: nextId('cf_'), status: 'PAID', provider: 'cashfree' },
    paidAt: new Date(),
    itemsPrice: 400,
    shippingPrice: 150,
    totalPrice: 550,
    orderStatus: 'Processing',
    ...overrides,
});

const productDoc = (overrides = {}) => ({
    _id: nextId('p'),
    name: 'Lamp',
    description: 'A lamp',
    price: 400,
    user: 'admin1',
    category: 'Accessories',
    Stock: 5,
    ...overrides,
});

module.exports = { startDb, stopDb, clearDb, orderDoc, productDoc, nextId, DAY };
