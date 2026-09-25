// CommonJS like the rest of the backend (this file used to be ESM and only
// loaded thanks to Node 22's require(esm) support).
const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");
const ApiFeatures = require("../utils/apifeatures");
const generateId = require("../utils/generateId");
const { GoogleGenAI } = require("@google/genai");
const cache = require("../utils/cache");
const { generateEmbedding } = require("../utils/generateEmbedding");
const searchService = require("../services/searchService");

// Fields an admin may change through the JSON update endpoint.
const UPDATABLE_PRODUCT_FIELDS = ["name", "description", "price", "category", "Stock"];

const LIST_CACHE_TTL = 60;
const DETAIL_CACHE_TTL = 3600;

const syncSearchIndex = product =>
  searchService.indexProduct(product).catch(err => console.error("Search index sync failed:", err.message));

// Auto-generate a review summary the first time a product with enough reviews
// is viewed, so nobody has to click "Generate". Guarded so each product only
// generates once at a time.
const summaryInProgress = new Set();

function maybeAutoSummarize(product, app) {
  if (!product || !product._id) return;
  const id = String(product._id);
  const hasSummary = product.aiSummary && product.aiSummary.overall;
  if (product.numOfReviews > 3 && !hasSummary && !summaryInProgress.has(id)) {
    summaryInProgress.add(id);
    generateReviewSummary(id, app)
      .catch((err) => console.error("Auto summary (on view) failed:", err.message))
      .finally(() => summaryInProgress.delete(id));
  }
}

exports.getAllProducts = async (req, res, next) => {
  // Cache per query signature — listings vary by search/filter/page. Keys are
  // built from a normalised, whitelisted view of the query so arbitrary
  // parameters can't create unbounded numbers of cache entries.
  const { keyword, category, page, price, ratings } = req.query;
  const cacheKey = `products:list:${JSON.stringify({ keyword, category, page, price, ratings })}`;

  const cached = await cache.getJSON(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  const resultPerPage = Number(process.env.RESULT_PER_PAGE) || 8;
  const productsCount = await Product.estimatedDocumentCount();

  const apiFeature = new ApiFeatures(Product.find(), req.query).search().filter();

  const filteredProductsCount = await Product.countDocuments(apiFeature.query.getFilter());

  apiFeature.pagination(resultPerPage);
  const products = await apiFeature.query;

  const payload = {
    success: true,
    products,
    productsCount,
    resultPerPage,
    filteredProductsCount,
  };

  await cache.setJSON(cacheKey, payload, LIST_CACHE_TTL);

  res.status(200).json(payload);
};

// Get All Product (Admin)
exports.getAdminProducts = async (req, res, next) => {
  const products = await Product.find();

  res.status(200).json({
    success: true,
    products,
  });
};

// get product details
exports.getProductDetails = async (req, res, next) => {
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;

  try {
    const cachedProduct = await cache.getJSON(cacheKey);
    if (cachedProduct) {
      maybeAutoSummarize(cachedProduct, req.app);
      return res.status(200).json({
        success: true,
        product: cachedProduct,
      });
    }

    // --- 2. If Miss, Get from DB ---
    const product = await Product.findById(productId).populate({
        path: 'reviews.user',
        select: 'name avatar'
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }
    // --- 3. Store in Cache ---
    await cache.setJSON(cacheKey, product, DETAIL_CACHE_TTL);

    maybeAutoSummarize(product, req.app);

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product details error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// JSON-only admin update (images are handled by PUT /admin/product/:id in app.js).
exports.updateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const update = {};
    for (const field of UPDATABLE_PRODUCT_FIELDS) {
      if (req.body[field] !== undefined) update[field] = req.body[field];
    }

    if (update.name || update.description) {
      const vector = await generateEmbedding(
        `${update.name || product.name} ${update.description || product.description}`,
      );
      if (vector) update.embedding = vector;
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, update, {
      new: true,
      runValidators: true,
    });

    await cache.del(`product:${productId}`);
    syncSearchIndex(updatedProduct);

    res.status(200).json({
      success: true,
      message: "✅ Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Product Update Error:", error);
    res.status(500).json({ message: "Server Error during update" });
  }
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const MIN_REVIEWS_FOR_SUMMARY = 3;

function buildSummaryPrompt(reviews) {
  const reviewsText = reviews.map((r) => r.comment).join("\n");
  return `You are an e-commerce review analyst.

Analyze the following customer reviews and return a concise, useful summary.

Return ONLY valid JSON in exactly this structure:
{
  "overall": "One or two sentence overall takeaway",
  "pros": ["Short positive point", "Short positive point"],
  "cons": ["Short negative point", "Short negative point"]
}

Rules:
- "overall" must be concise and factual.
- Provide 2-3 pros and 2-3 cons.
- Each point must be short and specific.
- No markdown, no bullet symbols, no emojis, and no text outside the JSON object.

Customer reviews:
---
${reviewsText}
---`;
}

async function generateStructuredSummary(reviews) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildSummaryPrompt(reviews),
    config: { responseMimeType: "application/json" },
  });

  const raw = (response.text || "").trim();

  let summary;
  try {
    summary = JSON.parse(raw);
  } catch {
    throw new Error("AI returned an invalid summary format.");
  }

  if (
    !summary ||
    typeof summary.overall !== "string" ||
    !Array.isArray(summary.pros) ||
    !Array.isArray(summary.cons)
  ) {
    throw new Error("AI returned an invalid summary structure.");
  }

  return summary;
}

async function generateReviewSummary(productId, app) {
  if (!process.env.GEMINI_API_KEY) return null;

  const product = await Product.findById(productId);
  if (!product || product.numOfReviews < MIN_REVIEWS_FOR_SUMMARY) return null;

  const summary = await generateStructuredSummary(product.reviews);

  product.aiSummary = summary;
  await product.save();

  await cache.del(`product:${productId}`);

  const io = app && app.get("socketio");
  if (io) {
    io.to(String(productId)).emit("summaryUpdate", { aiSummary: summary });
  }
  return summary;
}

exports.createProductReview = async (req, res, next) => {
  const { comment, productId } = req.body;
  const rating = Number(req.body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: "Rating must be a whole number from 1 to 5",
    });
  }
  if (typeof comment !== "string" || !comment.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please write a comment for your review",
    });
  }

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  // Only customers who have received this product can review it.
  const hasPurchased = await Order.exists({
    user: req.user._id,
    orderStatus: "Delivered",
    "orderItems.product": String(productId),
  });
  if (!hasPurchased) {
    return res.status(403).json({
      success: false,
      message: "You can review this product once an order containing it has been delivered",
    });
  }

  const isReviewed = product.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString(),
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
      _id: generateId(),
      user: req.user._id,
      name: req.user.name,
      rating,
      comment,
    };
    product.reviews.push(newReview);
    product.numOfReviews = product.reviews.length;
  }

  let avg = 0;
  product.reviews.forEach((rev) => {
    avg += rev.rating;
  });
  product.ratings =
    product.reviews.length > 0 ? avg / product.reviews.length : 0;

  await product.save({ validateBeforeSave: false });

  await cache.del(`product:${productId}`);
  syncSearchIndex(product);

  const io = req.app.get("socketio");
  io.to(String(productId)).emit("reviewUpdate", {
    reviews: product.reviews,
    ratings: product.ratings,
    numOfReviews: product.numOfReviews,
  });

  // Automatically (re)generate the AI summary in the background once there are
  // enough reviews. Fire-and-forget so the review response isn't blocked by the
  // slow Gemini call; a 'summaryUpdate' socket event refreshes viewers when done.
  if (product.numOfReviews >= 3) {
    generateReviewSummary(productId, req.app).catch((err) =>
      console.error("Auto summary generation failed:", err.message),
    );
  }

  res.status(200).json({
    success: true,
  });
};

exports.getAllWishlistProducts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Wishlist entries already contain the product snapshot needed by the UI.
    // Expose the product id as _id so wishlist cards can use the same shape as products.
    const wishlistProducts = user.wishlist.map((item) => ({
      ...item.toObject(),
      _id: item.product,
    }));

    res.status(200).json({
      success: true,
      wishlistProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.addToWishList = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await User.findById(req.user._id);

    const isProductInWishlist = user.wishlist.some(
      (item) => item.product.toString() === req.params.id,
    );

    if (isProductInWishlist) {
      return res.status(400).json({
        success: false,
        message: "Product is already in the wishlist",
      });
    }

    const wishlistItem = {
      _id: generateId(),
      product: req.params.id,
      name: product.name,
      description: product.description,
      price: product.price,
      ratings: product.ratings,
      images: product.images,
    };

    user.wishlist.push(wishlistItem);

    await user.save();

    const io = req.app.get("socketio");
    io.to(req.user._id.toString()).emit("wishlistUpdate", user.wishlist);

    const wishlistProducts = user.wishlist.map((item) => ({
      ...item.toObject(),
      _id: item.product,
    }));

    res.status(200).json({
      success: true,
      message: "Product added to wishlist successfully",
      wishlist: wishlistProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.removeFromWishList = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await User.findById(req.user._id);

    const isProductInWishlistIndex = user.wishlist.findIndex(
      (item) => item.product.toString() === req.params.id,
    );

    if (isProductInWishlistIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Product is not in the wishlist",
      });
    }

    user.wishlist.splice(isProductInWishlistIndex, 1);

    await user.save();

    const io = req.app.get("socketio");
    io.to(req.user._id.toString()).emit("wishlistUpdate", user.wishlist);

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist successfully",
      wishlist: user.wishlist,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Get all reviews of a product
exports.getProductReviews = async (req, res, next) => {
  const productId = req.query.id;
  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const reviews = product.reviews;

  res.status(200).json({
    success: true,
    reviews,
  });
};

exports.deleteReview = async (req, res, next) => {
  const productId = req.query.id;
  const reviewId = req.params.reviewId;

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const review = product.reviews.find((rev) => String(rev._id) === String(reviewId));
  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  // Only the review's author or an MFA-verified admin may delete it.
  const isAuthor = String(review.user) === String(req.user._id);
  const isAdmin = req.user.role === "admin" && req.auth?.mfaVerified;
  if (!isAuthor && !isAdmin) {
    return res.status(403).json({
      success: false,
      message: "You can only delete your own reviews",
    });
  }

  const reviews = product.reviews.filter(
    (rev) => String(rev._id) !== String(reviewId),
  );

  let avg = 0;

  reviews.forEach((rev) => {
    avg += rev.rating;
  });

  let ratings = 0;

  if (reviews.length === 0) {
    ratings = 0;
  } else {
    ratings = avg / reviews.length;
  }

  const numOfReviews = reviews.length;

  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    {
      reviews,
      ratings,
      numOfReviews,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  await cache.del(`product:${productId}`);
  syncSearchIndex(updatedProduct);

  // Emit the post-delete state (previously the old reviews were sent).
  const io = req.app.get("socketio");
  io.to(String(productId)).emit("reviewUpdate", {
    reviews: updatedProduct.reviews,
    ratings: updatedProduct.ratings,
    numOfReviews: updatedProduct.numOfReviews,
  });

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
};

exports.summerizeProductReviews = async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY not found. Please check your server environment variables.",
      });
    }

    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.numOfReviews < MIN_REVIEWS_FOR_SUMMARY) {
      return res.status(400).json({
        success: false,
        message: "Not enough reviews to generate a summary.",
      });
    }

    const summary = await generateReviewSummary(productId, req.app);

    res.status(200).json({
      success: true,
      message: "Summary generated successfully",
      summary,
    });
  } catch (error) {
    console.error("AI Summarization Error:", error);
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: "The AI summary feature is currently busy. Please try again in a minute.",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || "Server Error during summarization",
    });
  }
};
