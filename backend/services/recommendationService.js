import Product from "../models/product.js";
import ProductInteraction from "../models/productInteraction.js";

// ===========================================================================
// Tunable configuration (env-overridable) — Phases 4 & 5
// ===========================================================================

const INTERACTION_WEIGHTS = {
    view: 1,
    click: 2,
    wishlist: 3,
    cart: 4,
    purchase: 6,
};

// Phase 4 — how much each signal contributes to the hybrid score.
const HYBRID_WEIGHTS = {
    semantic: Number(process.env.REC_W_SEMANTIC) || 0.45,
    behavioral: Number(process.env.REC_W_BEHAVIORAL) || 0.25,
    popularity: Number(process.env.REC_W_POPULARITY) || 0.2,
    freshness: Number(process.env.REC_W_FRESHNESS) || 0.1,
};

// Phase 5 — recency decay (half-life, days) for history and freshness;
// category cap for diversity; exploration slice.
const RECENCY_HALF_LIFE_DAYS = Number(process.env.REC_RECENCY_HALF_LIFE_DAYS) || 30;
const FRESHNESS_HALF_LIFE_DAYS = Number(process.env.REC_FRESHNESS_HALF_LIFE_DAYS) || 45;
const MAX_PER_CATEGORY = Number(process.env.REC_MAX_PER_CATEGORY) || 3;
const EXPLORATION_RATIO = Number(process.env.REC_EXPLORATION_RATIO) || 0.2;

// ===========================================================================
// Math helpers
// ===========================================================================

const daysSince = (date) =>
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);

// Exponential decay: value halves every `halfLife` days.
const decay = (days, halfLife) => Math.pow(0.5, Math.max(0, days) / halfLife);

// Min-max normalizer across a set of values (→ 0..1).
const minMaxNormalizer = (values) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return (v) => (max === min ? 0.5 : (v - min) / (max - min));
};

const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

// ===========================================================================
// Semantic similarity for a single product (unchanged Phase 1 behaviour)
// ===========================================================================

export const getSimilarProducts = async (productId, limit = 8) => {
    const product = await Product.findById(productId).select("+embedding").lean();

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    if (!product.embedding || product.embedding.length === 0) {
        return [];
    }

    return Product.aggregate([
        {
            $vectorSearch: {
                index: "product_vector_index",
                path: "embedding",
                queryVector: product.embedding,
                numCandidates: 100,
                limit: limit + 1,
            },
        },
        { $match: { _id: { $ne: product._id } } },
        { $limit: limit },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                price: 1,
                ratings: 1,
                images: 1,
                category: 1,
                Stock: 1,
                numOfReviews: 1,
                score: { $meta: "vectorSearchScore" },
            },
        },
    ]);
};

// ===========================================================================
// Phase 3/5 — build the user profile from interactions (with recency decay)
// ===========================================================================

const buildUserProfile = (interactions, productMap) => {
    let userVector = null;
    let totalWeight = 0;
    const categoryAffinity = {};

    for (const interaction of interactions) {
        const product = productMap.get(String(interaction.product));
        if (!product) continue;

        const baseWeight =
            INTERACTION_WEIGHTS[interaction.type] ?? interaction.weight ?? 1;

        // Phase 5 — recent interactions count for more than old ones.
        const weight =
            baseWeight * decay(daysSince(interaction.createdAt), RECENCY_HALF_LIFE_DAYS);

        // Behavioral signal: affinity per category.
        if (product.category) {
            categoryAffinity[product.category] =
                (categoryAffinity[product.category] || 0) + weight;
        }

        // Semantic signal: weighted embedding sum.
        if (product.embedding && product.embedding.length > 0) {
            if (!userVector) userVector = new Array(product.embedding.length).fill(0);
            if (product.embedding.length === userVector.length) {
                for (let i = 0; i < product.embedding.length; i++) {
                    userVector[i] += product.embedding[i] * weight;
                }
                totalWeight += weight;
            }
        }
    }

    // Weighted average + L2 normalize the user vector.
    if (userVector && totalWeight > 0) {
        for (let i = 0; i < userVector.length; i++) userVector[i] /= totalWeight;
        const magnitude = Math.sqrt(userVector.reduce((s, v) => s + v * v, 0));
        if (magnitude > 0) {
            for (let i = 0; i < userVector.length; i++) userVector[i] /= magnitude;
        } else {
            userVector = null;
        }
    } else {
        userVector = null;
    }

    const maxAffinity = Math.max(1, ...Object.values(categoryAffinity));
    const behavioralFor = (category) =>
        (categoryAffinity[category] || 0) / maxAffinity;

    return { userVector, behavioralFor };
};

// ===========================================================================
// Phase 4 — score a candidate pool on the four hybrid signals
// ===========================================================================

const scoreCandidates = (candidates, behavioralFor) => {
    if (candidates.length === 0) return [];

    const semanticNorm = minMaxNormalizer(candidates.map((p) => p.similarity ?? 0));

    const popularityRaw = candidates.map(
        (p) =>
            ((p.ratings || 0) / 5) *
            Math.min(1, Math.log10((p.numOfReviews || 0) + 1) / 2)
    );
    const popularityNorm = minMaxNormalizer(popularityRaw);

    const freshnessRaw = candidates.map((p) =>
        p.createdAt ? decay(daysSince(p.createdAt), FRESHNESS_HALF_LIFE_DAYS) : 0
    );
    const freshnessNorm = minMaxNormalizer(freshnessRaw);

    return candidates.map((p, i) => {
        const semantic = semanticNorm(p.similarity ?? 0);
        const behavioral = behavioralFor(p.category);
        const popularity = popularityNorm(popularityRaw[i]);
        const freshness = freshnessNorm(freshnessRaw[i]);

        const hybrid =
            HYBRID_WEIGHTS.semantic * semantic +
            HYBRID_WEIGHTS.behavioral * behavioral +
            HYBRID_WEIGHTS.popularity * popularity +
            HYBRID_WEIGHTS.freshness * freshness;

        return {
            ...p,
            _scores: { semantic, behavioral, popularity, freshness },
            hybrid,
        };
    });
};

// ===========================================================================
// Phase 5 — final selection: category balancing + exploration/exploitation
// ===========================================================================

const selectWithQuality = (scored, limit) => {
    const ranked = [...scored].sort((a, b) => b.hybrid - a.hybrid);

    const exploreSlots = Math.round(limit * EXPLORATION_RATIO);
    const exploitSlots = limit - exploreSlots;

    const selected = [];
    const chosen = new Set();
    const catCount = {};

    const tryAdd = (p, respectCap = true) => {
        if (chosen.has(String(p._id))) return false;
        const count = catCount[p.category] || 0;
        if (respectCap && count >= MAX_PER_CATEGORY) return false;
        selected.push(p);
        chosen.add(String(p._id));
        catCount[p.category] = count + 1;
        return true;
    };

    // Exploitation — greedy top picks, diversity-capped per category.
    for (const p of ranked) {
        if (selected.length >= exploitSlots) break;
        tryAdd(p, true);
    }

    // Exploration — random picks from the rest (still capped).
    for (const p of shuffle(ranked)) {
        if (selected.length >= limit) break;
        tryAdd(p, true);
    }

    // Backfill — if caps left us short, relax the cap.
    for (const p of ranked) {
        if (selected.length >= limit) break;
        tryAdd(p, false);
    }

    return selected.slice(0, limit);
};

// ===========================================================================
// Public entry point — hybrid personalized recommendations
// ===========================================================================

export const getPersonalizedRecommendations = async (userId, limit = 8) => {
    const interactions = await ProductInteraction.find({ user: userId })
        .sort({ createdAt: -1 })
        .lean();

    // Cold start — no history yet.
    if (!interactions.length) {
        return getFallbackRecommendations(limit);
    }

    const interactedIds = [...new Set(interactions.map((i) => i.product))];

    const historyProducts = await Product.find({ _id: { $in: interactedIds } })
        .select("+embedding")
        .lean();
    const productMap = new Map(historyProducts.map((p) => [String(p._id), p]));

    const { userVector, behavioralFor } = buildUserProfile(interactions, productMap);

    // No usable vector → fall back.
    if (!userVector) {
        return getFallbackRecommendations(limit);
    }

    // Larger candidate pool so the scorer + quality layer have room to work.
    const poolSize = Math.max(limit * 5, 40);
    const candidates = await Product.aggregate([
        {
            $vectorSearch: {
                index: "product_vector_index",
                path: "embedding",
                queryVector: userVector,
                numCandidates: Math.max(200, poolSize * 5),
                limit: poolSize + interactedIds.length,
            },
        },
        // Duplicate suppression — never recommend already-interacted products.
        { $match: { _id: { $nin: interactedIds } } },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                price: 1,
                ratings: 1,
                images: 1,
                category: 1,
                Stock: 1,
                numOfReviews: 1,
                createdAt: 1,
                similarity: { $meta: "vectorSearchScore" },
            },
        },
    ]);

    // Business rule — only recommend in-stock products.
    const inStock = candidates.filter((p) => (p.Stock ?? 0) > 0);
    if (inStock.length === 0) {
        return getFallbackRecommendations(limit);
    }

    const scored = scoreCandidates(inStock, behavioralFor);
    return selectWithQuality(scored, limit);
};

// ===========================================================================
// Cold-start fallback — mini popularity + freshness hybrid, diversity-capped
// ===========================================================================

const getFallbackRecommendations = async (limit = 8) => {
    const pool = await Product.find({ Stock: { $gt: 0 } })
        .sort({ ratings: -1, numOfReviews: -1 })
        .limit(Math.max(limit * 4, 32))
        .lean();

    if (pool.length === 0) {
        return Product.find().sort({ ratings: -1 }).limit(limit).lean();
    }

    const popularityRaw = pool.map(
        (p) =>
            ((p.ratings || 0) / 5) *
            Math.min(1, Math.log10((p.numOfReviews || 0) + 1) / 2)
    );
    const popularityNorm = minMaxNormalizer(popularityRaw);
    const freshnessRaw = pool.map((p) =>
        p.createdAt ? decay(daysSince(p.createdAt), FRESHNESS_HALF_LIFE_DAYS) : 0
    );
    const freshnessNorm = minMaxNormalizer(freshnessRaw);

    const scored = pool.map((p, i) => ({
        ...p,
        hybrid:
            0.7 * popularityNorm(popularityRaw[i]) +
            0.3 * freshnessNorm(freshnessRaw[i]),
    }));

    return selectWithQuality(scored, limit);
};
