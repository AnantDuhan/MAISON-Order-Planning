import Product from "../models/product.js";
import ProductInteraction from "../models/productInteraction.js";
import redisClientPromise from "../config/redisClientUpstash.js";

/**
 * Get products semantically similar to a given product.
 *
 * Uses the product's Gemini embedding + MongoDB Atlas Vector Search.
 */
export const getSimilarProducts = async (productId, limit = 8) => {
    const product = await Product.findById(productId)
        .select("+embedding")
        .lean();

    if (!product) {
        const error = new Error("Product not found");
        error.statusCode = 404;
        throw error;
    }

    // Existing products created before embeddings were introduced
    // may not have an embedding.
    if (!product.embedding || product.embedding.length === 0) {
        return [];
    }

    const pipeline = [
        {
            $vectorSearch: {
                index: "product_vector_index",
                path: "embedding",
                queryVector: product.embedding,
                numCandidates: 100,
                limit: limit + 1,
            },
        },
        {
            $match: {
                _id: { $ne: product._id },
            },
        },
        {
            $limit: limit,
        },
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
    ];

    return Product.aggregate(pipeline);
};

const INTERACTION_WEIGHTS = {
    view: 1,
    click: 2,
    wishlist: 3,
    cart: 4,
    purchase: 6,
};

export const getPersonalizedRecommendations = async (
    userId,
    limit = 8
) => {
    console.log("👤 Building recommendations for user:", userId);

    // 1. Get all interactions of the user
    const interactions = await ProductInteraction.find({
        user: userId,
    })
        .sort({ createdAt: -1 })
        .lean();

    console.log(`🧠 Found ${interactions.length} interactions`);

    // No interaction history → fallback
    if (!interactions.length) {
        console.log("ℹ️ No interactions found. Using fallback.");
        return getFallbackRecommendations(limit);
    }

    // 2. Get unique product IDs
    const productIds = [
        ...new Set(interactions.map((interaction) => interaction.product)),
    ];

    // 3. Load embeddings for interacted products
    const products = await Product.find({
        _id: { $in: productIds },
    })
        .select("+embedding")
        .lean();

    console.log(`📦 Loaded ${products.length} products`);

    // Map product ID → product
    const productMap = new Map(
        products.map((product) => [String(product._id), product])
    );

    // 4. Create weighted user vector
    let userVector = null;
    let totalWeight = 0;

    for (const interaction of interactions) {
        const product = productMap.get(String(interaction.product));

        if (
            !product?.embedding ||
            product.embedding.length === 0
        ) {
            continue;
        }

        const weight =
            INTERACTION_WEIGHTS[interaction.type] ??
            interaction.weight ??
            1;

        if (!userVector) {
            userVector = new Array(product.embedding.length).fill(0);
        }

        // Safety check
        if (product.embedding.length !== userVector.length) {
            console.warn(
                `⚠️ Embedding dimension mismatch for product ${product._id}`
            );
            continue;
        }

        for (let i = 0; i < product.embedding.length; i++) {
            userVector[i] += product.embedding[i] * weight;
        }

        totalWeight += weight;
    }

    // No valid embeddings
    if (!userVector || totalWeight === 0) {
        console.log(
            "⚠️ No valid embeddings found. Using fallback."
        );

        return getFallbackRecommendations(limit);
    }

    // 5. Calculate weighted average
    for (let i = 0; i < userVector.length; i++) {
        userVector[i] /= totalWeight;
    }

    // 6. Normalize vector
    let magnitude = 0;

    for (const value of userVector) {
        magnitude += value * value;
    }

    magnitude = Math.sqrt(magnitude);

    if (magnitude === 0) {
        return getFallbackRecommendations(limit);
    }

    for (let i = 0; i < userVector.length; i++) {
        userVector[i] /= magnitude;
    }

    console.log(
        `🧮 User vector created: ${userVector.length} dimensions`
    );

    // 7. Exclude products already interacted with
    const interactedProductIds = productIds;

    // 8. Vector search
    const recommendations = await Product.aggregate([
        {
            $vectorSearch: {
                index: "product_vector_index",
                path: "embedding",
                queryVector: userVector,

                numCandidates: Math.max(
                    100,
                    limit * 10
                ),

                limit:
                    limit +
                    interactedProductIds.length +
                    10,
            },
        },

        // Don't recommend products the user already interacted with
        {
            $match: {
                _id: {
                    $nin: interactedProductIds,
                },
            },
        },

        {
            $limit: limit,
        },

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

                similarity: {
                    $meta: "vectorSearchScore",
                },
            },
        },
    ]);

    console.log(
        "🎯 Personalized recommendations:",
        recommendations.map((product) => ({
            name: product.name,
            similarity: product.similarity,
        }))
    );

    return recommendations;
};


// Fallback when there is not enough user history
const getFallbackRecommendations = async (limit = 8) => {
    return Product.find()
        .sort({
            ratings: -1,
            numOfReviews: -1,
        })
        .limit(limit)
        .lean();
};