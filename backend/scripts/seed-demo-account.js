const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../config/config.env'), quiet: true });

const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');
const Return = require('../models/return');
const Refund = require('../models/refund');
const PlusMembership = require('../models/plusMembership');

const generateId = require('../utils/generateId');

// ============================================================
// CONFIGURATION
// ============================================================

const DEMO_EMAIL = 'demo@maisonorderplanning.in';

const TARGET_ORDERS = 126;
const TARGET_RETURNS = 9;
const TARGET_REFUNDS = 5;
const TARGET_MEMBERSHIPS = 52;

const TARGET_REVENUE = 284750;

const TARGET_ACTIVE_MEMBERS = 46;
const TARGET_EXPIRED_MEMBERS = 6;

// ============================================================
// HELPERS
// ============================================================

const cloneImages = (images = []) =>
    images.map(image => {
        const imageData = image?.toObject
            ? image.toObject()
            : { ...image };

        return {
            ...imageData,
            _id: new mongoose.Types.ObjectId()
        };
    });

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const addMonths = (date, months) => {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
};

const roundMoney = value =>
    Math.round((value + Number.EPSILON) * 100) / 100;

// ============================================================
// DEMO ORDER CONFIGURATION
// ============================================================

const ORDER_STATUS_DISTRIBUTION = [
    {
        status: 'Delivered',
        count: 74
    },
    {
        status: 'Shipped',
        count: 27
    },
    {
        status: 'Processing',
        count: 18
    },
    {
        status: 'Cancelled',
        count: 7
    }
];

// ============================================================
// DEMO ANALYTICS TARGETS
// ============================================================

const REVENUE_SERIES = [
    {
        period: '2026-01',
        revenue: 32400,
        orders: 14
    },
    {
        period: '2026-02',
        revenue: 38750,
        orders: 17
    },
    {
        period: '2026-03',
        revenue: 42100,
        orders: 19
    },
    {
        period: '2026-04',
        revenue: 46750,
        orders: 21
    },
    {
        period: '2026-05',
        revenue: 52950,
        orders: 25
    },
    {
        period: '2026-06',
        revenue: 71800,
        orders: 30
    }
];

// ============================================================
// CREATE DEMO USER
// ============================================================

const getOrCreateDemoUser = async () => {
    let demoUser = await User.findOne({
        email: DEMO_EMAIL
    });

    if (demoUser) {
        console.log(`✓ Demo account already exists: ${demoUser._id}`);

        // Make sure the existing account is still correctly configured.
        let changed = false;

        if (!demoUser.isDemo) {
            demoUser.isDemo = true;
            changed = true;
        }

        if (demoUser.role !== 'admin') {
            demoUser.role = 'admin';
            changed = true;
        }

        if (!demoUser.isEmailVerified) {
            demoUser.isEmailVerified = true;
            changed = true;
        }

        if (changed) {
            await demoUser.save();
            console.log('✓ Demo account configuration repaired');
        }

        return demoUser;
    }

    const demoPassword = process.env.DEMO_PASSWORD;

    if (!demoPassword) {
        throw new Error(
            'DEMO_PASSWORD is missing from environment configuration.'
        );
    }

    demoUser = await User.create({
        _id: generateId(),
        name: 'Demo Admin',
        email: DEMO_EMAIL,
        password: demoPassword,
        whatsappNumber: 9999999999,
        avatar:
            'https://res.cloudinary.com/dx6vf0z1v/image/upload/v1704103055/default_avatar_dzycpq.png',
        isEmailVerified: true,
        isDemo: true,
        role: 'admin',

        addresses: [
            {
                _id: generateId(),
                label: 'Home',
                address: '123 Innovation Street, Whitefield',
                city: 'Bangalore',
                state: 'Karnataka',
                country: 'India',
                pinCode: 560066,
                phoneNumber: 9999999999
            },
            {
                _id: generateId(),
                label: 'Office',
                address: '456 Tech Plaza, Indiranagar',
                city: 'Bangalore',
                state: 'Karnataka',
                country: 'India',
                pinCode: 560038,
                phoneNumber: 8888888888
            }
        ]
    });

    console.log(`✓ Demo account created: ${demoUser.email}`);

    return demoUser;
};

// ============================================================
// DEMO WISHLIST
// ============================================================

const updateDemoWishlist = async demoUser => {
    const products = await Product.find()
        .sort({ createdAt: 1 })
        .limit(5);

    if (!products.length) {
        console.log('⚠ No products found. Wishlist skipped.');
        return;
    }

    demoUser.wishlist = products.map(product => ({
        _id: product._id,
        name: product.name,
        description: product.description,
        price: product.price,
        ratings: product.ratings || 0,
        images: cloneImages(product.images),
        product: product._id
    }));

    await demoUser.save();

    console.log(
        `✓ Demo wishlist updated: ${products.length} products`
    );
};

// ============================================================
// CLEAN EXISTING DEMO DATA
// ============================================================

const cleanExistingDemoData = async demoUser => {
    console.log('\nCleaning previous demo transactional data...');

    const existingOrders = await Order.find({
        user: demoUser._id
    }).select('_id');

    const orderIds = existingOrders.map(order => order._id);

    if (orderIds.length > 0) {
        const deletedReturns = await Return.deleteMany({
            order: { $in: orderIds }
        });

        const deletedRefunds = await Refund.deleteMany({
            order: { $in: orderIds }
        });

        console.log(
            `✓ Removed ${deletedReturns.deletedCount} existing demo returns`
        );

        console.log(
            `✓ Removed ${deletedRefunds.deletedCount} existing demo refunds`
        );
    }

    const deletedOrders = await Order.deleteMany({
        user: demoUser._id
    });

    const deletedMemberships = await PlusMembership.deleteMany({
        user: demoUser._id
    });

    console.log(
        `✓ Removed ${deletedOrders.deletedCount} existing demo orders`
    );

    console.log(
        `✓ Removed ${deletedMemberships.deletedCount} existing demo memberships`
    );
};

// ============================================================
// REVENUE DISTRIBUTION
// ============================================================

const buildRevenuePerOrder = () => {
    const result = [];

    for (const month of REVENUE_SERIES) {
        const baseRevenue = Math.floor(
            month.revenue / month.orders
        );

        const remainder =
            month.revenue - baseRevenue * month.orders;

        for (let i = 0; i < month.orders; i++) {
            result.push(
                baseRevenue + (i < remainder ? 1 : 0)
            );
        }
    }

    return result;
};

// ============================================================
// CREATE ORDER ITEM
// ============================================================

const createOrderItem = (product, targetOrderValue) => {
    /*
     * IMPORTANT:
     *
     * This references an ACTUAL catalogue product.
     *
     * The demo transaction amount is synthetic because this
     * dataset is intentionally deterministic for the portfolio.
     *
     * The product identity/name/image remains the real catalogue
     * product.
     */

    return {
        name: product.name,
        price: targetOrderValue,
        quantity: 1,
        images: cloneImages(product.images || []),
        product: product._id
    };
};

// ============================================================
// CREATE DEMO ORDERS
// ============================================================

const createDemoOrders = async (demoUser, products) => {
    if (!products.length) {
        throw new Error(
            'No products exist in the catalogue. Cannot create demo orders.'
        );
    }

    const revenuePerOrder = buildRevenuePerOrder();

    if (revenuePerOrder.length !== TARGET_ORDERS) {
        throw new Error(
            `Revenue distribution produced ${revenuePerOrder.length} orders instead of ${TARGET_ORDERS}.`
        );
    }

    const orders = [];

    let globalOrderIndex = 0;

    for (const statusConfig of ORDER_STATUS_DISTRIBUTION) {
        for (let i = 0; i < statusConfig.count; i++) {
            const product =
                products[globalOrderIndex % products.length];

            const orderRevenue =
                revenuePerOrder[globalOrderIndex];

            /*
             * Spread orders over the six analytics months.
             *
             * 14 + 17 + 19 + 21 + 25 + 30 = 126
             */
            const monthIndex = REVENUE_SERIES.findIndex(
                month => {
                    let cumulative = 0;

                    for (const currentMonth of REVENUE_SERIES) {
                        cumulative += currentMonth.orders;

                        if (globalOrderIndex < cumulative) {
                            return currentMonth === month;
                        }
                    }

                    return false;
                }
            );

            const month =
                REVENUE_SERIES[
                    monthIndex >= 0 ? monthIndex : 0
                ];

            const monthStart = new Date(
                `${month.period}-01T12:00:00.000Z`
            );

            const dayOffset =
                globalOrderIndex %
                25;

            const createdDate = addDays(
                monthStart,
                dayOffset
            );

            const orderItems = [
                createOrderItem(
                    product,
                    orderRevenue
                )
            ];

            const order = {
                _id: generateId(),

                user: demoUser._id,

                isDemo: true,

                shippingInfo: {
                    address:
                        demoUser.addresses?.[0]?.address ||
                        '123 Innovation Street, Whitefield',

                    city:
                        demoUser.addresses?.[0]?.city ||
                        'Bangalore',

                    state:
                        demoUser.addresses?.[0]?.state ||
                        'Karnataka',

                    country:
                        demoUser.addresses?.[0]?.country ||
                        'India',

                    pinCode:
                        demoUser.addresses?.[0]?.pinCode ||
                        560066,

                    phoneNumber:
                        demoUser.addresses?.[0]?.phoneNumber ||
                        9999999999
                },

                orderItems,

                paymentInfo: {
                    id: `demo_payment_${globalOrderIndex + 1}`,
                    status:
                        statusConfig.status === 'Cancelled'
                            ? 'FAILED'
                            : 'PAID'
                },

                itemsPrice: orderRevenue,

                shippingPrice: 0,

                totalPrice: orderRevenue,

                orderStatus: statusConfig.status,

                createdAt: createdDate,

                paidAt: createdDate,

                estimatedDeliveryDate: addDays(
                    createdDate,
                    7
                ),

                DeliveredAt:
                    statusConfig.status === 'Delivered'
                        ? addDays(createdDate, 5)
                        : undefined
            };

            orders.push(order);

            globalOrderIndex++;
        }
    }

    await Order.insertMany(orders);

    console.log(
        `✓ Orders created: ${orders.length}/${TARGET_ORDERS}`
    );

    return orders;
};

// ============================================================
// CREATE RETURNS
// ============================================================

const createDemoReturns = async orders => {
    const returnOrders = orders
        .filter(order =>
            order.orderStatus === 'Delivered'
        )
        .slice(0, TARGET_RETURNS);

    const returnReasons = [
        'Size / Fit',
        'Size / Fit',
        'Size / Fit',
        'Size / Fit',
        'Changed Mind',
        'Changed Mind',
        'Product Not as Expected',
        'Damaged',
        'Wrong Item'
    ];

    const returns = returnOrders.map(
        (order, index) => {
            const item = order.orderItems[0];

            return {
                _id: generateId(),

                order: order._id,

                isDemo: true,

                products: [
                    {
                        _id: generateId(),
                        product: item.product,
                        quantity: 1
                    }
                ],

                reason: returnReasons[index],

                requestedAt: addDays(
                    order.createdAt,
                    4
                ),

                status:
                    index < 5
                        ? 'Completed'
                        : 'Pending',

                resolvedAt:
                    index < 5
                        ? addDays(
                            order.createdAt,
                            8
                        )
                        : undefined
            };
        }
    );

    if (returns.length !== TARGET_RETURNS) {
        throw new Error(
            `Unable to create ${TARGET_RETURNS} returns. Only ${returns.length} eligible orders found.`
        );
    }

    await Return.insertMany(returns);

    console.log(
        `✓ Created ${returns.length} demo returns`
    );

    return returns;
};

// ============================================================
// CREATE REFUNDS
// ============================================================

const createDemoRefunds = async orders => {
    const refundOrders = orders
        .filter(order =>
            [
                'Delivered',
                'Cancelled'
            ].includes(order.orderStatus)
        )
        .slice(0, TARGET_REFUNDS);

    if (refundOrders.length < TARGET_REFUNDS) {
        throw new Error(
            `Unable to create ${TARGET_REFUNDS} refunds.`
        );
    }

    const refunds = refundOrders.map(
        (order, index) => ({
            _id: generateId(),

            order: order._id,

            isDemo: true,

            amount: order.totalPrice,

            initiatedAt: addDays(
                order.createdAt,
                6
            ),

            status:
                index < 3
                    ? 'Completed'
                    : 'Initiated',

            completedAt:
                index < 3
                    ? addDays(
                        order.createdAt,
                        9
                    )
                    : undefined
        })
    );

    await Refund.insertMany(refunds);

    console.log(
        `✓ Created ${refunds.length} demo refunds`
    );

    return refunds;
};

// ============================================================
// CREATE MEMBERSHIPS
// ============================================================

const createDemoMemberships = async demoUser => {
    const memberships = [];

    const plans = [
        {
            planId: 'essential',
            name: 'Essential',
            description:
                'Essential membership plan',
            amount: 600,
            duration: 30,
            count: 31,
            activeCount: 28
        },
        {
            planId: 'premium',
            name: 'Premium',
            description:
                'Premium membership plan',
            amount: 1000,
            duration: 30,
            count: 15,
            activeCount: 13
        },
        {
            planId: 'elite',
            name: 'Elite',
            description:
                'Elite membership plan',
            amount: 1800,
            duration: 30,
            count: 6,
            activeCount: 5
        }
    ];

    let membershipIndex = 0;

    for (const plan of plans) {
        for (let i = 0; i < plan.count; i++) {
            const isActive =
                i < plan.activeCount;

            const createdAt = new Date();

            createdAt.setMonth(
                createdAt.getMonth() -
                (isActive ? 1 : 5)
            );

            const nextPaymentDate = isActive
                ? addMonths(createdAt, 1)
                : addMonths(createdAt, -1);

            memberships.push({
                _id: generateId(),

                subscriptionId:
                    `demo_sub_${membershipIndex + 1}`,

                cashfreeSubscriptionId:
                    `demo_cashfree_${membershipIndex + 1}`,

                cashfreeSubscriptionSessionId:
                    undefined,

                planId: plan.planId,

                name: plan.name,

                description: plan.description,

                amount: plan.amount,

                duration: plan.duration,

                user: demoUser._id,

                isDemo: true,

                isActive,

                status: isActive
                    ? 'ACTIVE'
                    : 'EXPIRED',

                nextPaymentDate,

                activationEmailSent: true,

                activatedAt: createdAt,

                createdAt
            });

            membershipIndex++;
        }
    }

    if (
        memberships.length !==
        TARGET_MEMBERSHIPS
    ) {
        throw new Error(
            `Expected ${TARGET_MEMBERSHIPS} memberships but generated ${memberships.length}.`
        );
    }

    await PlusMembership.insertMany(
        memberships
    );

    console.log(
        `✓ Created ${memberships.length} demo memberships`
    );

    return memberships;
};

// ============================================================
// VALIDATE DATASET
// ============================================================

const validateDemoDataset = async demoUser => {
    const demoOrders = await Order.find({
        user: demoUser._id
    }).lean();

    const demoOrderIds =
        demoOrders.map(order => order._id);

    const demoReturns = await Return.find({
        order: { $in: demoOrderIds }
    }).lean();

    const demoRefunds = await Refund.find({
        order: { $in: demoOrderIds }
    }).lean();

    const demoMemberships =
        await PlusMembership.find({
            user: demoUser._id
        }).lean();

    const revenue = roundMoney(
        demoOrders.reduce(
            (sum, order) =>
                sum + Number(order.totalPrice || 0),
            0
        )
    );

    const activeMemberships =
        demoMemberships.filter(
            membership =>
                membership.isActive
        );

    const expiredMemberships =
        demoMemberships.filter(
            membership =>
                !membership.isActive
        );

    console.log('\n');
    console.log(
        '================================================'
    );
    console.log(
        '        MAISON DEMO DATASET SUMMARY'
    );
    console.log(
        '================================================'
    );

    console.log(
        `Demo User:       ${demoUser.email}`
    );

    console.log(
        `Orders:          ${demoOrders.length}`
    );

    console.log(
        `Returns:         ${demoReturns.length}`
    );

    console.log(
        `Refunds:         ${demoRefunds.length}`
    );

    console.log(
        `Memberships:     ${demoMemberships.length}`
    );

    console.log(
        `Active Members:  ${activeMemberships.length}`
    );

    console.log(
        `Expired Members: ${expiredMemberships.length}`
    );

    console.log(
        `Revenue:         ₹${revenue}`
    );

    console.log(
        '================================================'
    );

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
        demoOrders.length !==
        TARGET_ORDERS
    ) {
        throw new Error(
            `Expected ${TARGET_ORDERS} demo orders but found ${demoOrders.length}`
        );
    }

    if (
        demoReturns.length !==
        TARGET_RETURNS
    ) {
        throw new Error(
            `Expected ${TARGET_RETURNS} demo returns but found ${demoReturns.length}`
        );
    }

    if (
        demoRefunds.length !==
        TARGET_REFUNDS
    ) {
        throw new Error(
            `Expected ${TARGET_REFUNDS} demo refunds but found ${demoRefunds.length}`
        );
    }

    if (
        demoMemberships.length !==
        TARGET_MEMBERSHIPS
    ) {
        throw new Error(
            `Expected ${TARGET_MEMBERSHIPS} memberships but found ${demoMemberships.length}`
        );
    }

    if (
        activeMemberships.length !==
        TARGET_ACTIVE_MEMBERS
    ) {
        throw new Error(
            `Expected ${TARGET_ACTIVE_MEMBERS} active memberships but found ${activeMemberships.length}`
        );
    }

    if (
        expiredMemberships.length !==
        TARGET_EXPIRED_MEMBERS
    ) {
        throw new Error(
            `Expected ${TARGET_EXPIRED_MEMBERS} expired memberships but found ${expiredMemberships.length}`
        );
    }

    if (
        revenue !==
        TARGET_REVENUE
    ) {
        throw new Error(
            `Expected demo revenue ₹${TARGET_REVENUE} but found ₹${revenue}`
        );
    }

    // --------------------------------------------------------
    // ORDER STATUS VALIDATION
    // --------------------------------------------------------

    const statusCounts = {};

    for (const order of demoOrders) {
        statusCounts[order.orderStatus] =
            (statusCounts[order.orderStatus] || 0) + 1;
    }

    for (const expected of ORDER_STATUS_DISTRIBUTION) {
        const actual =
            statusCounts[expected.status] || 0;

        if (actual !== expected.count) {
            throw new Error(
                `Expected ${expected.count} ${expected.status} orders but found ${actual}`
            );
        }
    }

    console.log('\n✓ Demo order status distribution:');

    for (const expected of ORDER_STATUS_DISTRIBUTION) {
        console.log(
            `  ${expected.status}: ${
                statusCounts[expected.status] || 0
            }`
        );
    }

    console.log(
        `✓ Demo revenue: ₹${revenue}`
    );

    console.log(
        `✓ Demo order count: ${demoOrders.length}`
    );

    console.log('\n✓ Demo dataset validation passed');
};

// ============================================================
// MAIN
// ============================================================

const seedDemoAccount = async () => {
    try {
        const uri = process.env.DB_HOSTED_URI;

        if (!uri) {
            throw new Error(
                'No DB_HOSTED_URI found in env. Aborting.'
            );
        }

        await mongoose.connect(uri);

        console.log('✓ Connected to MongoDB');

        // ----------------------------------------------------
        // 1. DEMO USER
        // ----------------------------------------------------

        const demoUser =
            await getOrCreateDemoUser();

        // ----------------------------------------------------
        // 2. ACTUAL PRODUCTS
        // ----------------------------------------------------

        const products =
            await Product.find()
                .sort({ createdAt: 1 });

        console.log(
            `✓ Actual catalogue products available: ${products.length}`
        );

        if (!products.length) {
            throw new Error(
                'No actual products found in Product collection.'
            );
        }

        // ----------------------------------------------------
        // 3. WISHLIST
        // ----------------------------------------------------

        await updateDemoWishlist(
            demoUser
        );

        // ----------------------------------------------------
        // 4. CLEAN ONLY DEMO TRANSACTIONS
        // ----------------------------------------------------

        await cleanExistingDemoData(
            demoUser
        );

        // ----------------------------------------------------
        // 5. CREATE ORDERS
        // ----------------------------------------------------

        const orders =
            await createDemoOrders(
                demoUser,
                products
            );

        // ----------------------------------------------------
        // 6. CREATE RETURNS
        // ----------------------------------------------------

        await createDemoReturns(
            orders
        );

        // ----------------------------------------------------
        // 7. CREATE REFUNDS
        // ----------------------------------------------------

        await createDemoRefunds(
            orders
        );

        // ----------------------------------------------------
        // 8. CREATE MEMBERSHIPS
        // ----------------------------------------------------

        await createDemoMemberships(
            demoUser
        );

        // ----------------------------------------------------
        // 9. VALIDATE EVERYTHING
        // ----------------------------------------------------

        await validateDemoDataset(
            demoUser
        );

        console.log('\n');
        console.log(
            '✅ Demo account seeding completed successfully!'
        );

        console.log(
            '\nDemo Account:'
        );

        console.log(
            `Email: ${DEMO_EMAIL}`
        );

        console.log(
            `User ID: ${demoUser._id}`
        );

        console.log(
            '\nActual catalogue products were preserved.'
        );

        console.log(
            'Demo orders reference the actual Product collection.'
        );

        console.log(
            'Only demo transactional data was recreated.'
        );

        await mongoose.disconnect();

        process.exit(0);
    } catch (error) {
        console.error(
            '\n❌ Error seeding demo account:'
        );

        console.error(error);

        await mongoose.disconnect();

        process.exit(1);
    }
};

seedDemoAccount();