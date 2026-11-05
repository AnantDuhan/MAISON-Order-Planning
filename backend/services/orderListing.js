/**
 * Paginated order lists: the admin's All Orders, and a customer's My Orders.
 *
 * Both used to load every order into memory (and the admin list was cached
 * in Redis as one value). Now the database filters, sorts and pages.
 *
 * Admin list, view "all":
 *   page 1 also returns `pinned`: orders that need action now, so they can't
 *   hide on a later page: late orders first (most overdue first), then Maison
 *   Plus orders still to ship (priority dispatch, oldest first). The paged
 *   list below holds everything else, newest first.
 * Admin list, view "late": only late orders, most overdue first.
 */
const Order = require('../models/order');
const { realOnly } = require('../utils/demoFilter');

const ADMIN_PAGE_SIZE = 25;
const CUSTOMER_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
// Pinned orders shown above page 1. Beyond this, the "late" view lists them all.
const PINNED_LIMIT = 50;

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Midnight today in India (the shop's clock), as a Date. */
const startOfTodayIST = (now = new Date()) => {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    ist.setUTCHours(0, 0, 0, 0);
    return new Date(ist.getTime() - IST_OFFSET_MS);
};

/** Page number and size from query strings, clamped. */
const paging = (query = {}, defaultSize) => {
    const page = Math.max(1, Math.floor(Number(query.page)) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(query.limit)) || defaultSize));
    return { page, limit, skip: (page - 1) * limit };
};

/**
 * Late: not delivered, not refunded, and the expected delivery day is over.
 * Matches the customer's "Running late" message (DeliveryProgress).
 */
const lateFilter = (now = new Date()) => ({
    orderStatus: { $in: ['Processing', 'Shipped'] },
    isRefunded: { $ne: true },
    estimatedDeliveryDate: { $ne: null, $lt: startOfTodayIST(now) },
});

/** Plus orders still waiting to be shipped (priority dispatch). */
const plusToShipFilter = () => ({ orderStatus: 'Processing', memberTier: 'plus' });

// Just what the list shows: no street address, payment ids or shipment events.
const LIST_FIELDS = '_id orderItems.name orderItems.images orderItems.quantity totalPrice orderStatus refundStatus isRefunded '
    + 'estimatedDeliveryDate memberTier createdAt shippingInfo.city user guest.name guest.email';

const listQuery = (filter, sort, { skip = 0, limit } = {}) => Order.find(filter)
    .select(LIST_FIELDS)
    .populate('user', 'name email')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

/** Order lines keep only their first photo for the list. */
const trimImages = orders => orders.map(order => ({
    ...order,
    orderItems: (order.orderItems || []).map(item => ({ ...item, images: (item.images || []).slice(0, 1) })),
}));

/**
 * @param {{view?: 'all'|'late', page?, limit?, demo?: boolean, now?: Date}} options
 * @returns {Promise<{orders, pinned, page, limit, total, pages, counts: {late, plusToShip}}>}
 */
const adminOrders = async ({ view = 'all', demo = false, now = new Date(), ...query } = {}) => {
    const scope = demo ? { isDemo: true } : realOnly();
    const { page, limit, skip } = paging(query, ADMIN_PAGE_SIZE);
    const late = { ...scope, ...lateFilter(now) };
    const plusToShip = { ...scope, ...plusToShipFilter(), $nor: [lateFilter(now)] };

    let listFilter;
    let sort;
    if (view === 'late') {
        listFilter = late;
        sort = { estimatedDeliveryDate: 1, createdAt: 1 };
    } else {
        // Everything not pinned, so nothing shows twice.
        listFilter = { ...scope, $nor: [lateFilter(now), plusToShipFilter()] };
        sort = { createdAt: -1 };
    }

    const [orders, total, lateCount, plusCount] = await Promise.all([
        listQuery(listFilter, sort, { skip, limit }),
        Order.countDocuments(listFilter),
        Order.countDocuments(late),
        Order.countDocuments(plusToShip),
    ]);

    let pinned = [];
    if (view === 'all' && page === 1) {
        const [lateOrders, plusOrders] = await Promise.all([
            listQuery(late, { estimatedDeliveryDate: 1, createdAt: 1 }, { limit: PINNED_LIMIT }),
            listQuery(plusToShip, { createdAt: 1 }, { limit: PINNED_LIMIT }),
        ]);
        pinned = [...lateOrders, ...plusOrders].slice(0, PINNED_LIMIT);
    }

    return {
        orders: trimImages(orders),
        pinned: trimImages(pinned),
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
        counts: { late: lateCount, plusToShip: plusCount },
    };
};

/** A customer's orders, newest first. */
const customerOrders = async (userId, query = {}) => {
    const { page, limit, skip } = paging(query, CUSTOMER_PAGE_SIZE);
    const filter = { user: String(userId) };
    const [orders, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Order.countDocuments(filter),
    ]);
    return { orders, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
};

module.exports = {
    adminOrders,
    customerOrders,
    lateFilter,
    plusToShipFilter,
    startOfTodayIST,
    paging,
    ADMIN_PAGE_SIZE,
    CUSTOMER_PAGE_SIZE,
    PINNED_LIMIT,
};
