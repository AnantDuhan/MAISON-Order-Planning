const Product = require('../models/product');
const Coupon = require('../models/coupon');

// Server-side source of truth for what an order costs. The client may show
// its own numbers, but nothing it sends (prices, totals, amounts) is trusted.
//
// Rules mirror frontend/src/components/Cart/ConfirmOrder.js:
//   subtotal = Σ product.price × quantity   (price read from the DB)
//   shipping = subtotal > 1000 ? 0 : 150
//   discount = subtotal × coupon.discount / 100   (active, unexpired coupon)
//   total    = subtotal + shipping − discount

const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_CHARGE = 150;

class PricingError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}

const round2 = n => Math.round(n * 100) / 100;

async function findActiveCoupon(couponCode) {
    if (typeof couponCode !== 'string' || !couponCode.trim()) return null;

    const coupon = await Coupon.findOne({
        code: couponCode.trim().toUpperCase(),
        expiresAt: { $gt: new Date() },
    });
    if (!coupon) {
        throw new PricingError('Coupon is invalid or has expired');
    }
    return coupon;
}

/**
 * @param {Array<{product: string, quantity: number}>} requestedItems
 * @param {string} [couponCode]
 * @returns {Promise<{orderItems, itemsPrice, shippingPrice, taxPrice, discount, totalPrice, coupon}>}
 */
async function priceOrder(requestedItems, couponCode) {
    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
        throw new PricingError('Order must contain at least one item');
    }

    // Merge duplicate lines so stock checks see the full quantity.
    const quantities = new Map();
    for (const item of requestedItems) {
        const id = String(item?.product || '');
        const quantity = Number(item?.quantity);
        if (!id || !Number.isInteger(quantity) || quantity < 1) {
            throw new PricingError('Each item needs a product and a positive whole quantity');
        }
        quantities.set(id, (quantities.get(id) || 0) + quantity);
    }

    const products = await Product.find({ _id: { $in: [...quantities.keys()] } });
    const byId = new Map(products.map(p => [String(p._id), p]));

    const orderItems = [];
    let itemsPrice = 0;
    for (const [id, quantity] of quantities) {
        const product = byId.get(id);
        if (!product) {
            throw new PricingError(`Product ${id} is no longer available`, 404);
        }
        if (product.Stock < quantity) {
            throw new PricingError(`Only ${product.Stock} left in stock for "${product.name}"`, 409);
        }
        itemsPrice += product.price * quantity;
        orderItems.push({
            product: id,
            name: product.name,
            price: product.price,
            quantity,
            images: product.images,
        });
    }

    itemsPrice = round2(itemsPrice);
    const shippingPrice = itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
    const taxPrice = 0;

    const coupon = await findActiveCoupon(couponCode);
    const discount = coupon ? round2((itemsPrice * coupon.discount) / 100) : 0;
    const totalPrice = round2(Math.max(0, itemsPrice + shippingPrice + taxPrice - discount));

    return { orderItems, itemsPrice, shippingPrice, taxPrice, discount, totalPrice, coupon };
}

module.exports = { priceOrder, PricingError };
