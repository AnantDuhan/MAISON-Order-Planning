const { searchProducts, suggestProducts } = require('../services/searchService');
const categoryService = require('../services/categoryService');
const { listProducts } = require('./product');

const RESULT_PER_PAGE = () => Number(process.env.RESULT_PER_PAGE) || 8;

// The extended query parser turns price[gte]=5 into { price: { gte: '5' } };
// older clients may send minPrice/maxPrice instead.
const rangeOf = (query, field, legacyMin, legacyMax) => ({
    min: query[field]?.gte ?? query[`${field}[gte]`] ?? (legacyMin && query[legacyMin]),
    max: query[field]?.lte ?? query[`${field}[lte]`] ?? (legacyMax && query[legacyMax]),
});

// GET /api/v1/search
// Same filters, sorting and response shape as GET /products, ranked by
// Elasticsearch relevance. If Elasticsearch is down, it falls back to the
// catalogue query so search still returns results.
exports.searchProductsController = async (req, res) => {
    const { keyword, category, sort, page, inStock } = req.query;
    const price = rangeOf(req.query, 'price', 'minPrice', 'maxPrice');
    const ratings = rangeOf(req.query, 'ratings');
    const limit = Number(req.query.limit) || RESULT_PER_PAGE();

    try {
        // A department ("Accessories") covers every category inside it.
        const categories = typeof category === 'string' && category.trim()
            ? await categoryService.namesFor(category)
            : [];

        const { products, total } = await searchProducts({
            keyword,
            categories,
            minPrice: price.min,
            maxPrice: price.max,
            minRating: ratings.min,
            inStock: inStock === 'true',
            sort,
            page,
            limit,
        });

        return res.status(200).json({
            success: true,
            products,
            total,
            productsCount: total,
            filteredProductsCount: total,
            resultPerPage: limit,
        });
    } catch (error) {
        console.error('Search error, using catalogue fallback:', error.message);
    }

    try {
        const payload = await listProducts(req.query);
        return res.status(200).json({ ...payload, total: payload.filteredProductsCount, fallback: true });
    } catch (error) {
        console.error('Search fallback error:', error.message);
        return res.status(503).json({
            success: false,
            message: 'Search is temporarily unavailable',
        });
    }
};

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
