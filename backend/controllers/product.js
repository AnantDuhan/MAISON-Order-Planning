import Product from '../models/product.js';
import User from '../models/user.js';
import Review from '../models/review.js';
import ApiFeatures from '../utils/apifeatures.js';
import { Snowflake } from '@theinternetfolks/snowflake';
import { GoogleGenerativeAI } from '@google/generative-ai';
import redisClientPromise from '../config/redisClient.js';
import dotenv from 'dotenv';
import { Client } from '@elastic/elasticsearch';
const client = new Client({ node: 'http://localhost:9200' });

dotenv.config({ path: '../config/config.env' });

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

// get all products
export const getAllProducts = async (req, res, next) => {

    let products;

    const resultPerPage = process.env.RESULT_PER_PAGE;
    const productsCount = await Product.countDocuments();

    const apiFeature = new ApiFeatures(Product.find(), req.query)
        .search()
        .filter();

    products = await apiFeature.query;

    let filteredProductsCount = products.length;

    apiFeature.pagination(resultPerPage);

    products = await apiFeature.query.clone();

    res.status(200).json({
        success: true,
        products,
        productsCount,
        resultPerPage,
        filteredProductsCount
    });
};

// Get All Product (Admin)
export const getAdminProducts = async (req, res, next) => {

    const products = await Product.find();

    res.status(200).json({
        success: true,
        products
    });
};

// get product details
export const getProductDetails = async (req, res, next) => {

    const redisClient = redisClientPromise;
    const productId = req.params.id;
    const cacheKey = `product:${productId}`;

    try {
        const cachedProduct = await redisClient.get(cacheKey);
        if (cachedProduct) {
            const productData = JSON.parse(cachedProduct);
            return res.status(200).json({
                success: true,
                product: productData
            });
        }

        // --- 2. If Miss, Get from DB ---
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
        // --- 3. Store in Cache ---
        await redisClient.set(cacheKey, JSON.stringify(product), {
            EX: 3600
        });

        res.status(200).json({
            success: true,
            product
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

export const updateProduct = async (req, res, next) => {
    const productId = req.params.id;
    let product = await Product.findById(productId);

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    // Update product with new data from req.body
    product = await Product.findByIdAndUpdate(productId, req.body, {
        new: true,
        runValidators: true,
    });
    
    // --- Invalidate the cache after the update ---
    try {
        const redisClient = redisClientPromise;
        const cacheKey = `product:${productId}`;
        await redisClient.del(cacheKey);
    } catch (cacheError) {
        console.error('Redis cache invalidation error:', cacheError);
    }

    await redisClient.set(`/admin/product/${productId}`, JSON.stringify(product));

    const io = req.app.get('socketio');
    io.to(productId).emit('productUpdate', product);
    
    res.status(200).json({
        success: true,
        product,
    });
};

// create new review or update the review
export const createProductReview = async (req, res, next) => {
    const { rating, comment, productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
        return next(new ErrorHandler("Product not found", 404));
    }

    const isReviewed = product.reviews.find(
        (rev) => rev.user.toString() === req.user._id.toString()
    );

    let newReview;

    if (isReviewed) {
        product.reviews.forEach((rev) => {
            if (rev.user.toString() === req.user._id.toString()) {
                rev.rating = rating;
                rev.comment = comment;
            }
        });
    } else {
        newReview = {
            _id: Snowflake.generate(),
            user: req.user._id,
            name: req.user.name,
            rating: Number(rating),
            comment,
        };
        product.reviews.push(newReview);
        product.numOfReviews = product.reviews.length;
    }

    let avg = 0;
    product.reviews.forEach((rev) => {
        avg += rev.rating;
    });
    product.ratings = product.reviews.length > 0 ? avg / product.reviews.length : 0;

    await product.save({ validateBeforeSave: false });

    // Invalidate Redis Cache
    try {
        const redisClient = req.app.get('redisClient');
        const cacheKey = `product:${productId}`;
        await redisClient.del(cacheKey);
    } catch (cacheError) {
        console.error('Redis cache invalidation error:', cacheError);
    }

    await redisClient.set(`product:${productId}`, JSON.stringify(product));

    const io = req.app.get('socketio');
    io.to(productId).emit('reviewUpdate', {
        reviews: product.reviews,
        ratings: product.ratings,
        numOfReviews: product.numOfReviews,
    });

    res.status(200).json({
        success: true,
    });
};


export const getAllWishlistProducts = async (req, res) => {
    try {
        // Find the current user
        const user = await User.findById(req.user._id).populate(
            'wishlist.product'
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const wishlistProducts = user.wishlist.map(item => item.product);

        res.status(200).json({
            success: true,
            wishlistProducts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

export const addToWishList = async (req, res) => {
    try {

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const user = await User.findById(req.user._id);

        const isProductInWishlist = user.wishlist.some(
            item => item.product.toString() === req.params.id
        );

        if (isProductInWishlist) {
            return res.status(400).json({
                success: false,
                message: 'Product is already in the wishlist'
            });
        }

        const wishlistItem = {
            _id: Snowflake.generate(),
            product: req.params.id,
            name: product.name,
            description: product.description,
            price: product.price,
            ratings: product.ratings,
            images: product.images
        };

        user.wishlist.push(wishlistItem);

        await user.save();

        const io = req.app.get('socketio');
        io.to(req.user._id.toString()).emit('wishlistUpdate', user.wishlist);

        res.status(200).json({
            success: true,
            message: 'Product added to wishlist successfully',
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

export const removeFromWishList = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const user = await User.findById(req.user._id);

        const isProductInWishlistIndex = user.wishlist.findIndex(
            item => item.product.toString() === req.params.id
        );

        if (isProductInWishlistIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'Product is not in the wishlist'
            });
        }

        user.wishlist.splice(isProductInWishlistIndex, 1);

        await user.save();

        const io = req.app.get('socketio');
        io.to(req.user._id.toString()).emit('wishlistUpdate', user.wishlist);

        res.status(200).json({
            success: true,
            message: 'Product removed from wishlist successfully',
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Internal Server Error'
        });
    }
};

// Get all reviews of a product
export const getProductReviews = async (req, res, next) => {
    const productId = req.query.id;
    const product = await Product.findById(productId);

    if (!product) {
        res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    const reviews = product.reviews;

    res.status(200).json({
        success: true,
        reviews
    });
};

export const deleteReview = async (req, res, next) => {
    const productId = req.query.id;
    const reviewId = req.params.reviewId;

    const product = await Product.findById(productId);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }

    const reviews = product.reviews.filter(
        rev => rev._id.toString() !== reviewId.toString()
    );

    let avg = 0;

    reviews.forEach(rev => {
        avg += rev.rating;
    });

    let ratings = 0;

    if (reviews.length === 0) {
        ratings = 0;
    } else {
        ratings = avg / reviews.length;
    }

    const numOfReviews = reviews.length;

    await Product.findByIdAndUpdate(
        productId,
        {
            reviews,
            ratings,
            numOfReviews
        },
        {
            new: true,
            runValidators: true,
            useFindAndModify: false
        }
    );

    try {
        const redisClient = redisClientPromise;
        const cacheKey = `product:${productId}`;
        await redisClient.del(cacheKey);
        console.log(`CACHE INVALIDATED for product: ${productId}`);
    } catch (cacheError) {
        console.error('Redis cache invalidation error:', cacheError);
    }

    const io = req.app.get('socketio');
    io.to(productId).emit('reviewUpdate', {
        reviews: product.reviews,
        ratings: product.ratings,
        numOfReviews: product.numOfReviews,
    });

    res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
    });
};

export const summerizeProductReviews = async (req, res, next) => {
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
            success: false,
            message: 'GEMINI_API_KEY not found. Please check your server environment variables.'
        });
    }

    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        });
    }
    
    if (product.numOfReviews < 3) {
        return res.status(400).json({
            success: false,
            message: 'Not enough reviews to generate a summary.'
        });
    }

    
    // if (product.numOfReviews < 3) {
    //     return res.status(400).json({
    //         success: false,
    //         message: 'Review count mismatch. Not enough reviews to summarize.'
    //     });
    // }
    
    const reviewsText = product.reviews.map((r) => r.comment).join('\n');

    const prompt = `You are an e-commerce assistant. Based on the following customer reviews, generate a concise summary. The summary should be a string containing a 'Pros' list and a 'Cons' list, each with 2-3 bullet points. Use emojis like ✅ for pros and ⚠️ for cons. Reviews: --- ${reviewsText} ---`;

    // Initialize the client here, inside the function, to ensure the API key is loaded.
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    product.aiSummary = summary;
    await product.save();

    try {
        const redisClient = req.app.get('redisClient');
        if (redisClient) {
            const cacheKey = `product:${productId}`;
            await redisClient.del(cacheKey);
            console.log(`CACHE INVALIDATED for product: ${productId}`);
        } else {
            console.log('Redis client not initialized, skipping cache invalidation.');
        }
    } catch (cacheError) {
        console.error('Redis cache invalidation error:', cacheError);
    }

    const io = req.app.get('socketio');
    if (io) {
        io.to(productId).emit('summaryUpdate', summary);
    } else {
        console.log('Socket.io not initialized, skipping emit.');
    }

    res.status(201).json({
        success: true,
        message: 'Summary generated successfully',
        summary: product.aiSummary,
    });
};

export const searchProducts = async (req, res, next) => {
    const { keyword, category, price, ratings } = req.query;

    const mustQueries = [];
    if (keyword) {
        mustQueries.push({
            multi_match: {
                query: keyword,
                fields: ["name", "description"],
                fuzziness: "AUTO"
            }
        });
    }

    const filterQueries = [];
    if (category) {
        filterQueries.push({ term: { category: category } });
    }
    if (price) {
        filterQueries.push({
            range: {
                price: {
                    gte: price.gte || 0,
                    lte: price.lte || 1000000
                }
            }
        });
    }
    if (ratings) {
         filterQueries.push({
            range: {
                ratings: {
                    gte: ratings.gte || 0
                }
            }
        });
    }

    const body = await client.search({
        index: 'products',
        body: {
            query: {
                bool: {
                    must: mustQueries,
                    filter: filterQueries
                }
            },
            // This is for faceted search (filter counts)
            aggs: {
                categories: {
                    terms: {
                        field: 'category'
                    }
                }
            }
        }
    });

    const productIds = body.hits.hits.map(hit => hit._id);
    const products = await Product.find({ '_id': { $in: productIds } });

    res.status(200).json({
        success: true,
        products,
        facets: body.aggregations
    });
};

export const getAutocompleteSuggestions = async (req, res, next) => {
    const { keyword } = req.query;

    if (!keyword) {
        return res.status(200).json({ 
            success: true, 
            suggestions: [] 
        });
    }

    const body = await client.search({
        index: 'products',
        body: {
            query: {
                multi_match: {
                    query: keyword,
                    type: "bool_prefix",
                    fields: [
                        "name",
                        "name._2gram",
                        "name._3gram"
                    ]
                }
            }
        }
    });

    const suggestions = body.hits.hits.map(hit => ({
        name: hit._source.name,
        _id: hit._id
    }));
    
    res.status(200).json({
        success: true,
        suggestions,
    });
};