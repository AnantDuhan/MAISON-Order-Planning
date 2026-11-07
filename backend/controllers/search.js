const Product = require('../models/product');
const { listProducts } = require('./product');

// GET /api/v1/search
// The catalogue query with a keyword: same filters, sorting, paging and
// response shape as GET /products. Products match when their name contains
// the keyword (case-insensitive).
exports.searchProductsController = async (req, res) => {
    try {
        const payload = await listProducts(req.query);
        return res.status(200).json({ ...payload, total: payload.filteredProductsCount });
    } catch (error) {
        console.error('Search error:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Search is temporarily unavailable',
        });
    }
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SUGGESTION_LIMIT = 6;

/**
 * Up to `limit` products whose name contains the typed text, names that start
 * with it first, then shorter (closer) names.
 */
const suggestProducts = async (text, limit = SUGGESTION_LIMIT) => {
    const query = typeof text === 'string' ? text.trim().slice(0, 100) : '';
    if (!query) return [];
    const matches = await Product.find({ name: { $regex: escapeRegex(query), $options: 'i' } })
        .select('name category price images')
        .limit(50)
        .lean();
    const lower = query.toLowerCase();
    return matches
        .map(p => ({ product: p, starts: p.name.toLowerCase().startsWith(lower) }))
        .sort((a, b) => (b.starts - a.starts) || (a.product.name.length - b.product.name.length))
        .slice(0, limit)
        .map(({ product: p }) => ({
            // `id` too: the header navigates to /product/:id on click.
            id: String(p._id),
            _id: String(p._id),
            name: p.name,
            category: p.category,
            price: p.price,
            images: (p.images || []).slice(0, 1),
        }));
};
exports.suggestProducts = suggestProducts;

// GET /api/v1/products/autocomplete?query=...
exports.autocompleteController = async (req, res) => {
    try {
        const data = await suggestProducts(req.query.query);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Autocomplete error:', error.message);
        // Suggestions are non-critical — fail soft with an empty list.
        res.status(200).json({ success: true, data: [] });
    }
};
