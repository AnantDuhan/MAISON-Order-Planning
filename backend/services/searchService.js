const esClient = require('../config/elasticsearch');
const Product = require('../models/product');

const PRODUCT_INDEX = 'products';

const INDEX_DEFINITION = {
    mappings: {
        properties: {
            name: {
                type: 'text',
                fields: {
                    keyword: { type: 'keyword' },
                    suggest: { type: 'search_as_you_type' },
                },
            },
            description: { type: 'text' },
            category: { type: 'keyword' },
            price: { type: 'float' },
            ratings: { type: 'float' },
            numOfReviews: { type: 'integer' },
            Stock: { type: 'integer' },
            images: { type: 'object', enabled: false },
            createdAt: { type: 'date' },
        },
    },
};

const toDoc = p => ({
    name: p.name,
    description: p.description,
    category: p.category,
    price: p.price,
    ratings: p.ratings,
    numOfReviews: p.numOfReviews,
    Stock: p.Stock,
    images: p.images,
    createdAt: p.createdAt,
});

async function ensureIndex() {
    const exists = await esClient.indices.exists({ index: PRODUCT_INDEX });
    if (!exists) {
        await esClient.indices.create({ index: PRODUCT_INDEX, ...INDEX_DEFINITION });
        console.log(`🔎 Elasticsearch index "${PRODUCT_INDEX}" created`);
    }
}

async function indexProduct(product) {
    if (!product || !product._id) return;
    await esClient.index({
        index: PRODUCT_INDEX,
        id: String(product._id),
        document: toDoc(product),
    });
}

async function deleteProductDoc(id) {
    try {
        await esClient.delete({ index: PRODUCT_INDEX, id: String(id) });
    } catch (e) {
        if (e.meta && e.meta.statusCode === 404) return;
        throw e;
    }
}

async function bulkReindex() {
    await ensureIndex();
    const products = await Product.find().lean();
    if (!products.length) return { indexed: 0 };

    const operations = products.flatMap(p => [
        { index: { _index: PRODUCT_INDEX, _id: String(p._id) } },
        toDoc(p),
    ]);

    const resp = await esClient.bulk({ operations, refresh: true });
    if (resp.errors) {
        const firstErr = resp.items.find(i => i.index && i.index.error);
        console.error('Bulk reindex errors:', firstErr && firstErr.index.error);
    }
    return { indexed: products.length };
}

async function searchProducts({ keyword, category, minPrice, maxPrice, inStock, sort, page = 1, limit = 12 }) {
    const size = Number(limit) || 12;
    const from = (Math.max(1, Number(page) || 1) - 1) * size;

    const must = [];
    if (keyword && keyword.trim()) {
        must.push({
            multi_match: {
                query: keyword,
                fields: ['name^3', 'name.suggest^2', 'description', 'category^2'],
                fuzziness: 'AUTO',
                prefix_length: 1,
                operator: 'or',
            },
        });
    } else {
        must.push({ match_all: {} });
    }

    const filter = [];
    if (category) filter.push({ term: { category } });
    if (minPrice != null || maxPrice != null) {
        const range = {};
        if (minPrice != null) range.gte = Number(minPrice);
        if (maxPrice != null) range.lte = Number(maxPrice);
        filter.push({ range: { price: range } });
    }
    if (inStock) filter.push({ range: { Stock: { gt: 0 } } });

    const sortClause = [];
    if (sort === 'price_asc') sortClause.push({ price: 'asc' });
    else if (sort === 'price_desc') sortClause.push({ price: 'desc' });
    else if (sort === 'ratings') sortClause.push({ ratings: 'desc' });

    const resp = await esClient.search({
        index: PRODUCT_INDEX,
        from,
        size,
        query: { bool: { must, filter } },
        ...(sortClause.length ? { sort: sortClause } : {}),
    });

    const products = resp.hits.hits.map(h => ({ _id: h._id, ...h._source, _score: h._score }));
    const total = typeof resp.hits.total === 'object' ? resp.hits.total.value : resp.hits.total;
    return { products, total };
}

async function suggestProducts(query, limit = 6) {
    if (!query || !query.trim()) return [];
    const resp = await esClient.search({
        index: PRODUCT_INDEX,
        size: Number(limit) || 6,
        query: {
            multi_match: {
                query,
                type: 'bool_prefix',
                fields: ['name.suggest', 'name.suggest._2gram', 'name.suggest._3gram'],
            },
        },
        _source: ['name', 'category', 'price', 'images'],
    });
    // include `id` too — the frontend suggestion click navigates by suggestion.id
    return resp.hits.hits.map(h => ({ id: h._id, _id: h._id, ...h._source }));
}

module.exports = {
    PRODUCT_INDEX,
    ensureIndex,
    indexProduct,
    deleteProductDoc,
    bulkReindex,
    searchProducts,
    suggestProducts,
};
