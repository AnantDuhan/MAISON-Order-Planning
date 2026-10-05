const Product = require('../models/product');
const { hasVariants, findVariant, variantPrice, variantLabel, imagesForVariant } = require('./productVariants');
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
 * @param {{checkStock?: boolean}} [options] checkStock=false when the stock for
 *   these items is already held for this customer (placing a paid order).
 * @returns {Promise<{orderItems, itemsPrice, shippingPrice, taxPrice, discount, totalPrice, coupon}>}
 */
async function priceOrder(requestedItems, couponCode, { checkStock = true } = {}) {
    if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
        throw new PricingError('Order must contain at least one item');
    }

    // Merge duplicate lines (same product and variant) so stock checks see the
    // full quantity.
    const lines = new Map();
    for (const item of requestedItems) {
        const id = String(item?.product || '');
        const variant = item?.variant ? String(item.variant) : null;
        const quantity = Number(item?.quantity);
        if (!id || !Number.isInteger(quantity) || quantity < 1) {
            throw new PricingError('Each item needs a product and a positive whole quantity');
        }
        const key = `${id}|${variant || ''}`;
        const line = lines.get(key) || { id, variant, quantity: 0 };
        line.quantity += quantity;
        lines.set(key, line);
    }

    const products = await Product.find({ _id: { $in: [...new Set([...lines.values()].map(l => l.id))] } });
    const byId = new Map(products.map(p => [String(p._id), p]));

    const orderItems = [];
    let itemsPrice = 0;
    for (const { id, variant: variantId, quantity } of lines.values()) {
        const product = byId.get(id);
        if (!product) {
            throw new PricingError(`Product ${id} is no longer available`, 404);
        }

        // Products with options (Size, Colour...) are bought as a specific variant.
        let variant = null;
        if (hasVariants(product)) {
            if (!variantId) {
                const names = (product.options || []).map(o => o.name.toLowerCase()).join(' and ');
                throw new PricingError(`Please choose ${names} for "${product.name}"`);
            }
            variant = findVariant(product, variantId);
            if (!variant || variant.active === false) {
                throw new PricingError(`That option of "${product.name}" is no longer available`, 404);
            }
        }
        const label = variant ? variantLabel(product, variant) : '';
        const available = variant ? variant.Stock : product.Stock;
        if (checkStock && available < quantity) {
            throw new PricingError(`Only ${Math.max(0, available)} left in stock for "${product.name}"${label ? ` (${label})` : ''}`, 409);
        }
        const unitPrice = variant ? variantPrice(product, variant) : product.price;
        itemsPrice += unitPrice * quantity;
        orderItems.push({
            product: id,
            ...(variant && { variant: String(variant._id), variantLabel: label, sku: variant.sku }),
            name: product.name,
            price: unitPrice,
            quantity,
            // Only the URL: product image ids are strings, while order line
            // images are subdocuments with their own ObjectId — copying the
            // product's _id made Order validation fail.
            // The chosen colour's photos first, so the order shows what was bought.
            images: (variant ? imagesForVariant(product, variant) : product.images || []).map(image => ({ url: image.url })),
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
