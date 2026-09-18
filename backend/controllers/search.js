const { searchProducts, suggestProducts } = require('../services/searchService');

// GET /api/v1/search
exports.searchProductsController = async (req, res) => {
    try {
        const { keyword, category, sort, page, limit, inStock } = req.query;
        const minPrice = req.query['price[gte]'] ?? req.query.minPrice;
        const maxPrice = req.query['price[lte]'] ?? req.query.maxPrice;

        const { products, total } = await searchProducts({
            keyword,
            category,
            minPrice,
            maxPrice,
            inStock: inStock === 'true',
            sort,
            page,
            limit,
        });

        res.status(200).json({
            success: true,
            products,
            total,
            productsCount: total,
        });
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(503).json({
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
