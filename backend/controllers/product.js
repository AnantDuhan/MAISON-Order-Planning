import Product from "../models/product.js";
import User from "../models/user.js";
import Review from "../models/review.js";
import ApiFeatures from "../utils/apifeatures.js";
import generateId from "../utils/generateId.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import redisClientPromise from "../config/redisClientUpstash.js";
import dotenv from "dotenv";
import { generateEmbedding } from "../utils/generateEmbedding.js";

dotenv.config({ path: "../config/config.env" });

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

// get all products
// export const getAllProducts = async (req, res, next) => {

//     let products;

//     const resultPerPage = process.env.RESULT_PER_PAGE;
//     const productsCount = await Product.countDocuments();

//     const apiFeature = new ApiFeatures(Product.find(), req.query)
//         .search()
//         .filter();

//     products = await apiFeature.query;

//     let filteredProductsCount = products.length;

//     apiFeature.pagination(resultPerPage);

//     products = await apiFeature.query.clone();

//     res.status(200).json({
//         success: true,
//         products,
//         productsCount,
//         resultPerPage,
//         filteredProductsCount
//     });
// };

export const getAllProducts = async (req, res, next) => {
  const redisClient = redisClientPromise;
  // Cache per query signature — listings vary by search/filter/page, so a
  // single flat key won't do. Reads dominate and the catalog changes rarely,
  // so a short TTL removes almost all DB load from this route.
  const cacheKey = `products:list:${JSON.stringify(req.query)}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }
  } catch (cacheError) {
    console.error(
      "Redis cache read error (getAllProducts):",
      cacheError.message,
    );
  }

  const resultPerPage = process.env.RESULT_PER_PAGE;
  const productsCount = await Product.countDocuments();

  const apiFeature = new ApiFeatures(Product.find(), req.query)
    .search()
    .filter();

  let products = await apiFeature.query;
  const filteredProductsCount = products.length;

  apiFeature.pagination(resultPerPage);
  products = await apiFeature.query.clone();

  const payload = {
    success: true,
    products,
    productsCount,
    resultPerPage,
    filteredProductsCount,
  };

  try {
    // 60s TTL: listings tolerate brief staleness. See the invalidation note
    // below if you need writes to reflect immediately.
    await redisClient.set(cacheKey, JSON.stringify(payload), { EX: 60 });
  } catch (cacheError) {
    console.error(
      "Redis cache write error (getAllProducts):",
      cacheError.message,
    );
  }

  res.status(200).json(payload);
};

// Get All Product (Admin)
export const getAdminProducts = async (req, res, next) => {
  const products = await Product.find();

  res.status(200).json({
    success: true,
    products,
  });
};

// get product details
export const getProductDetails = async (req, res, next) => {
  const redisClient = redisClientPromise;
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;

  try {
    try {
      const cachedProduct = await redisClient.get(cacheKey);
      if (cachedProduct) {
        const productData = JSON.parse(cachedProduct);
        return res.status(200).json({
          success: true,
          product: productData,
        });
      }
    } catch (cacheError) {
      console.error("Redis cache read error:", cacheError.message);
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
    try {
      await redisClient.set(cacheKey, JSON.stringify(product), {
        EX: 3600,
      });
    } catch (cacheError) {
      console.error("Redis cache write error:", cacheError.message);
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product details error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.files && req.files.length > 0) {
      const s3 = new S3Client({
        region: process.env.AWS_BUCKET_REGION,
        // Make sure your fromEnv() or credentials setup is correct here
      });

      // A. Safely Delete Old Images (Using Plural Command)
      if (product.images && product.images.length > 0) {
        const deleteObjects = product.images.map((image) => ({
          Key: getImageKeyFromUrl(image.url), // Ensure this utility works!
        }));

        await s3.send(
          new DeleteObjectsCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Delete: { Objects: deleteObjects, Quiet: false },
          }),
        );
        console.log("✅ Old Images deleted from AWS S3");
      }

      // B. Upload New Images (Using PutObjectCommand)
      let imageUrls = [];
      for (const file of req.files) {
        // Ensure a unique key using Date.now() to prevent cache collisions
        const uniqueKey = `${productId}-${Date.now()}-${file.originalname}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: uniqueKey,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );

        const avatarUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uniqueKey}`;
        imageUrls.push({ key: uniqueKey, url: avatarUrl });
      }

      // Attach new images to the body so MongoDB saves them
      req.body.images = imageUrls;
    }

    if (req.body.name || req.body.description) {
      const existingProduct = await Product.findById(productId);
      const textForEmbedding = `${req.body.name || existingProduct.name} ${req.body.description || existingProduct.description}`;

      const vector = await generateEmbedding(textForEmbedding);
      if (vector) {
        req.body.embedding = vector;
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    try {
      const redisClient = redisClientPromise;
      const cacheKey = `product:${productId}`;

      await redisClient.del(cacheKey);
      await redisClient.set(cacheKey, JSON.stringify(updatedProduct), {
        EX: 3600,
      });
    } catch (cacheError) {
      console.error("Redis cache sync error:", cacheError);
    }

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

// create new review or update the review
// Regenerate a product's AI review summary, invalidate its cache, and push the
// update to viewers in real time. Reusable by the admin endpoint and the
// automatic trigger when a new review is added.
async function generateReviewSummary(productId, app) {
  if (!process.env.GEMINI_API_KEY) return null;

  const product = await Product.findById(productId);
  if (!product || product.numOfReviews < 3) return null;

  const reviewsText = product.reviews.map((r) => r.comment).join("\n");
  const prompt = `You are an e-commerce assistant. Based on the following customer reviews, generate a concise summary. The summary should be a string containing a 'Pros' list and a 'Cons' list, each with 2-3 bullet points. Use emojis like \u2705 for pros and \u26a0\ufe0f for cons. Reviews: --- ${reviewsText} ---`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent(prompt);

  product.aiSummary = result.response.text();
  await product.save();

  // Invalidate the cached product so the next fetch includes the new summary.
  try {
    const redisPromise = app && app.get("redisClient");
    const redisClient = redisPromise ? await redisPromise : null;
    if (redisClient && typeof redisClient.del === "function") {
      await redisClient.del(`product:${productId}`);
    }
  } catch (cacheError) {
    console.error("Summary cache invalidation error:", cacheError.message);
  }

  // Tell everyone viewing this product to refresh.
  const io = app && app.get("socketio");
  if (io) {
    io.to(String(productId)).emit("summaryUpdate", {
      aiSummary: product.aiSummary,
    });
  }
  return product.aiSummary;
}

export const createProductReview = async (req, res, next) => {
  const { rating, comment, productId } = req.body;

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
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
  product.ratings =
    product.reviews.length > 0 ? avg / product.reviews.length : 0;

  await product.save({ validateBeforeSave: false });

  // Invalidate Redis Cache
  try {
    const redisClient = req.app.get("redisClient");
    const cacheKey = `product:${productId}`;
    await redisClient.del(cacheKey);
    await redisClient.set(`product:${productId}`, JSON.stringify(product));
  } catch (cacheError) {
    console.error("Redis cache invalidation error:", cacheError);
  }

  const io = req.app.get("socketio");
  io.to(productId).emit("reviewUpdate", {
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

export const getAllWishlistProducts = async (req, res) => {
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

export const addToWishList = async (req, res) => {
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

export const removeFromWishList = async (req, res) => {
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
export const getProductReviews = async (req, res, next) => {
  const productId = req.query.id;
  const product = await Product.findById(productId);

  if (!product) {
    res.status(404).json({
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

export const deleteReview = async (req, res, next) => {
  const productId = req.query.id;
  const reviewId = req.params.reviewId;

  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: "Product not found",
    });
  }

  const reviews = product.reviews.filter(
    (rev) => rev._id.toString() !== reviewId.toString(),
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

  await Product.findByIdAndUpdate(
    productId,
    {
      reviews,
      ratings,
      numOfReviews,
    },
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    },
  );

  try {
    const redisClient = redisClientPromise;
    const cacheKey = `product:${productId}`;
    await redisClient.del(cacheKey);
    console.log(`CACHE INVALIDATED for product: ${productId}`);
  } catch (cacheError) {
    console.error("Redis cache invalidation error:", cacheError);
  }

  const io = req.app.get("socketio");
  io.to(productId).emit("reviewUpdate", {
    reviews: product.reviews,
    ratings: product.ratings,
    numOfReviews: product.numOfReviews,
  });

  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
  });
};

export const summerizeProductReviews = async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message:
          "GEMINI_API_KEY not found. Please check your server environment variables.",
      });
    }

    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.numOfReviews < 3) {
      return res.status(400).json({
        success: false,
        message: "Not enough reviews to generate a summary.",
      });
    }

    // if (product.numOfReviews < 3) {
    //     return res.status(400).json({
    //         success: false,
    //         message: 'Review count mismatch. Not enough reviews to summarize.'
    //     });
    // }

    const reviewsText = product.reviews.map((r) => r.comment).join("\n");

    const prompt = `
            You are an e-commerce review analyst.

            Analyze the following customer reviews and return a concise, useful summary.

            Return ONLY valid JSON in exactly this structure:

            {
            "overall": "One or two sentence overall takeaway",
            "pros": [
                "Short positive point",
                "Short positive point",
                "Short positive point"
            ],
            "cons": [
                "Short negative point",
                "Short negative point",
                "Short negative point"
            ]
            }

            Rules:
            - "overall" must be concise and factual.
            - Provide 2-3 pros.
            - Provide 2-3 cons.
            - Each point must be short and specific.
            - Do not use markdown.
            - Do not use bullet symbols.
            - Do not include emojis.
            - Do not include any text outside the JSON object.

            Customer reviews:
            ---
            ${reviewsText}
            ---
        `;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);

    const rawSummary = result.response.text().trim();

    let summary;

    try {
      summary = JSON.parse(rawSummary);
    } catch (parseError) {
      console.error("❌ Failed to parse Gemini JSON response:", rawSummary);

      return res.status(500).json({
        success: false,
        message: "AI returned an invalid summary format.",
      });
    }

    // Basic validation of the AI response
    if (
      !summary ||
      typeof summary.overall !== "string" ||
      !Array.isArray(summary.pros) ||
      !Array.isArray(summary.cons)
    ) {
      console.error("❌ Invalid AI summary structure:", summary);

      return res.status(500).json({
        success: false,
        message: "AI returned an invalid summary structure.",
      });
    }

    await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          aiSummary: summary,
        },
      },
      {
        new: true,
      },
    );

    try {
      const redisPromise = req.app.get("redisClient");
      if (redisPromise) {
        const redisClient = await redisPromise;

        if (typeof redisClient.del === "function") {
          const cacheKey = `product:${productId}`;
          await redisClient.del(cacheKey);
          console.log(`✅ CACHE INVALIDATED for product: ${productId}`);
        } else {
          console.log("⚠️ Redis client found, but .del is not available.");
        }
      } else {
        console.log(
          "Redis client not found in app, skipping cache invalidation.",
        );
      }
    } catch (cacheError) {
      console.error("Redis cache invalidation error:", cacheError);
    }

    res.status(200).json({
      success: true,
      message: "Summary generated successfully",
      summary,
    });
  } catch (error) {
    console.error("AI Summarization Error:", error);

    // Gracefully handle the Rate Limit error if it happens again
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "The AI summary feature is currently busy. Please try again in a minute.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server Error during summarization",
    });
  }
};
