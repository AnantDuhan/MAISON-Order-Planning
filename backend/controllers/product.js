import Product from '../models/product.js';
import User from '../models/user.js';
import Review from '../models/review.js';
import ApiFeatures from '../utils/apifeatures.js';
import { Snowflake } from '@theinternetfolks/snowflake';
import { GoogleGenerativeAI } from '@google/generative-ai';

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

const genAi = new GoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY
});

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

    const product = await Product.findById(req.params.id);

    if (!product) {
        res.status(404).json({
            success: false,
            message: 'Product not found'
        })
    }

    res.status(200).json({
        success: true,
        product
    });
};

// create new review or update the review
export const createProductReview = async (req, res, next) => {

    let review;
    const { rating, comment, productId } = req.body;
    review = {
        _id: Snowflake.Snowflake.generate({
            timestamp: timestampInSeconds
        }),
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment
    };

    const product = await Product.findById(productId);
    const isReviewed = product.reviews.find(
        rev => rev.user.toString() === req.user._id.toString()
    );

    console.log(product.reviews)
    if (isReviewed) {
        product.reviews.forEach(rev => {
            if (rev.user.toString() === req.user._id.toString())
                (rev.rating = rating), (rev.comment = comment);
        });
    } else {
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
    }

    let avg = 0;

    product.reviews.forEach(rev => {
        avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    const updatedProduct = await Product.findById(productId);

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        review: updatedProduct.reviews.find(
            rev => rev.user.toString() === req.user._id.toString()
        )
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

        console.log("product in wishlist", isProductInWishlist);
        if (isProductInWishlist) {
            return res.status(400).json({
                success: false,
                message: 'Product is already in the wishlist'
            });
        }

        const wishlistItem = {
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            product: req.params.id,
            name: product.name,
            description: product.description,
            price: product.price,
            ratings: product.ratings,
            images: product.images
        };

        user.wishlist.push(wishlistItem);

        await user.save();

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

    res.status(200).json({
        success: true,
        message: 'Review deleted successfully'
    });
};

export const summerizeProductReviews = async (req, res, next) => {
    const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // 1. Fetch all reviews for the product
  const reviews = await Review.find({ product: product._id });

  if (reviews.length < 3) {
    res.status(400);
    throw new Error('Not enough reviews to generate a summary.');
  }

  // 2. Concatenate review text
  const reviewsText = reviews.map((r) => r.comment).join('\n');

  // 3. Create the prompt for the AI
  const prompt = `You are an e-commerce assistant. Based on the following customer reviews, generate a concise summary. The summary should be a string containing a 'Pros' list and a 'Cons' list, each with 2-3 bullet points. Use emojis like ✅ for pros and ⚠️ for cons.

  Reviews:
  ---
  ${reviewsText}
  ---
  `;

  // 4. Send the prompt to the Gemini API
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  const summary = result.response.text();

  // 5. Save the result to the product
  product.aiSummary = summary;
  await product.save();

  res.status(201).json({
    message: 'Summary generated successfully',
    summary: product.aiSummary,
  });
};

