/**
 * Admin dashboard insights: what runs out soon, what each product earns, and
 * how cart reminders are doing.
 *
 * Profitability uses the cost prices on the products today (Product.costPrice,
 * per-variant costPrice), not a cost recorded at the time of each sale, so a
 * changed cost price changes past margins too. Margins are before payment
 * gateway fees.
 */
const Order = require('../models/order');
const Product = require('../models/product');
const cartRecovery = require('./cartRecoveryService');
const { findVariant, variantLabel } = require('../utils/productVariants');
const { realOnly } = require('../utils/demoFilter');

const DAY_MS = 24 * 60 * 60 * 1000;
const VELOCITY_DAYS = 30;
const RUN_OUT_WITHIN_DAYS = 21;
const LIST_LIMIT = 8;
const round = n => Math.round(n * 100) / 100;

/** Units sold per product + variant, and what they earned after coupon discounts. */
const salesByLine = async ({ since, until = new Date() }) => Order.aggregate([
    { $match: realOnly({ createdAt: { $gte: since, $lt: until }, paidAt: { $ne: null } }) },
    { $project: {
        isRefunded: 1,
        orderItems: 1,
        // Share of the items' price kept after the coupon (1 with no coupon).
        kept: { $cond: [{ $gt: ['$itemsPrice', 0] }, { $subtract: [1, { $divide: [{ $ifNull: ['$discountedAmount', 0] }, '$itemsPrice'] }] }, 1] },
    } },
    { $unwind: '$orderItems' },
    { $group: {
        _id: { product: '$orderItems.product', variant: { $ifNull: ['$orderItems.variant', null] } },
        name: { $last: '$orderItems.name' },
        units: { $sum: { $cond: ['$isRefunded', 0, '$orderItems.quantity'] } },
        revenue: { $sum: { $cond: ['$isRefunded', 0, { $multiply: ['$orderItems.price', '$orderItems.quantity', '$kept'] }] } },
        refundedUnits: { $sum: { $cond: ['$isRefunded', '$orderItems.quantity', 0] } },
    } },
]);

const loadProducts = ids => Product.find({ _id: { $in: ids } })
    .select('name Stock costPrice options variants images isDemo')
    .lean()
    .then(list => new Map(list.map(p => [String(p._id), p])));

/**
 * Products (or variants) that will sell out within RUN_OUT_WITHIN_DAYS at the
 * last 30 days' pace, soonest first. Sold-out lines that are still in demand
 * come first (0 days).
 */
const runningOut = async ({ now = new Date() } = {}) => {
    const lines = await salesByLine({ since: new Date(now.getTime() - VELOCITY_DAYS * DAY_MS), until: now });
    const selling = lines.filter(l => l.units > 0);
    const products = await loadProducts([...new Set(selling.map(l => String(l._id.product)))]);
    const rows = [];
    for (const line of selling) {
        const product = products.get(String(line._id.product));
        if (!product || product.isDemo) continue;
        const variant = line._id.variant ? findVariant(product, line._id.variant) : null;
        if (line._id.variant && (!variant || variant.active === false)) continue;
        const stock = variant ? variant.Stock : product.Stock;
        const perDay = line.units / VELOCITY_DAYS;
        const daysLeft = Math.floor(stock / perDay);
        if (daysLeft > RUN_OUT_WITHIN_DAYS) continue;
        rows.push({
            product: product._id,
            variant: variant?._id || null,
            name: product.name,
            label: variant ? variantLabel(product, variant) : '',
            image: product.images?.[0]?.url || null,
            stock,
            soldLast30Days: line.units,
            daysLeft,
        });
    }
    return rows.sort((a, b) => a.daysLeft - b.daysLeft || b.soldLast30Days - a.soldLast30Days).slice(0, LIST_LIMIT);
};

/**
 * Revenue, cost and margin per product over the last `days` days (refunded
 * orders excluded from revenue). Products with sales but no cost price are
 * listed so the admin can add one.
 */
const profitability = async ({ days = 30, now = new Date() } = {}) => {
    const window = Math.min(365, Math.max(1, Math.floor(Number(days)) || 30));
    const lines = await salesByLine({ since: new Date(now.getTime() - window * DAY_MS), until: now });
    const products = await loadProducts([...new Set(lines.map(l => String(l._id.product)))]);

    const byProduct = new Map();
    for (const line of lines) {
        const id = String(line._id.product);
        const product = products.get(id);
        if (product?.isDemo) continue;
        const variant = product && line._id.variant ? findVariant(product, line._id.variant) : null;
        const unitCost = variant?.costPrice ?? product?.costPrice ?? null;
        const row = byProduct.get(id) || {
            product: id,
            name: product?.name || line.name,
            image: product?.images?.[0]?.url || null,
            units: 0,
            refundedUnits: 0,
            revenue: 0,
            cost: 0,
            costKnown: true,
        };
        row.units += line.units;
        row.refundedUnits += line.refundedUnits;
        row.revenue += line.revenue;
        if (line.units > 0) {
            if (unitCost == null) row.costKnown = false;
            else row.cost += unitCost * line.units;
        }
        byProduct.set(id, row);
    }

    const rows = [...byProduct.values()]
        .filter(r => r.units > 0 || r.refundedUnits > 0)
        .map(r => {
            const margin = r.costKnown ? r.revenue - r.cost : null;
            return {
                ...r,
                revenue: round(r.revenue),
                cost: r.costKnown ? round(r.cost) : null,
                margin: margin == null ? null : round(margin),
                marginRate: margin == null || !r.revenue ? null : round(margin / r.revenue),
                refundRate: r.units + r.refundedUnits ? round(r.refundedUnits / (r.units + r.refundedUnits)) : 0,
            };
        })
        .sort((a, b) => b.revenue - a.revenue);

    const known = rows.filter(r => r.margin != null);
    const totals = {
        revenue: round(rows.reduce((n, r) => n + r.revenue, 0)),
        // Margin over the products whose cost is known, and the revenue it covers.
        margin: round(known.reduce((n, r) => n + r.margin, 0)),
        revenueWithCost: round(known.reduce((n, r) => n + r.revenue, 0)),
    };
    totals.marginRate = totals.revenueWithCost ? round(totals.margin / totals.revenueWithCost) : null;

    return {
        days: window,
        totals,
        products: rows.slice(0, 10),
        missingCost: rows.filter(r => r.margin == null).map(r => ({ product: r.product, name: r.name })),
    };
};

/** Everything the dashboard's insights panel shows, in one call. */
const dashboardInsights = async ({ days = 30, now = new Date() } = {}) => {
    const [soon, profit, recovery] = await Promise.all([
        runningOut({ now }),
        profitability({ days, now }),
        cartRecovery.recoveryStats({ days: 30 }).catch(() => null),
    ]);
    return {
        runningOut: soon,
        profitability: profit,
        recovery: recovery && {
            days: recovery.days,
            emailed: recovery.emailed,
            clicked: recovery.clicked,
            recovered: recovery.recovered,
            recoveredRevenue: recovery.recoveredRevenue,
            recoveryRate: recovery.recoveryRate,
        },
    };
};

module.exports = { runningOut, profitability, dashboardInsights, RUN_OUT_WITHIN_DAYS };
