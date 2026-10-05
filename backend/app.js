const path = require("path");
// Load env before anything that reads process.env at require time. Resolved
// from this file so it works regardless of the working directory.
require("dotenv").config({ path: path.join(__dirname, "config/config.env"), quiet: true });

const cookieParser = require("cookie-parser");
const compression = require("compression");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { fromEnv } = require("@aws-sdk/credential-provider-env");
const swaggerUi = require("swagger-ui-express");

const errorMiddleware = require("./middleware/error");
const securityHeaders = require("./middleware/securityHeaders");
const enforceHttps = require("./middleware/enforceHttps");
const { isAuthUser, authRoles } = require("./middleware/auth");
const { apiLimiter } = require("./middleware/rateLimiter");
const Product = require("./models/product");
const generateId = require("./utils/generateId");
const { generateEmbedding } = require("./utils/generateEmbedding");
const cache = require("./utils/cache");
const { indexProduct, deleteProductDoc } = require("./services/searchService");
const swaggerSpec = require("./config/swagger");

const app = express();
app.set("trust proxy", 1);

// Express 5 defaults to the "simple" query parser, which turns
// `price[gte]=10` into the literal key "price[gte]" and silently broke the
// price/rating filters. The extended parser restores nested objects;
// ApiFeatures whitelists what can be filtered on.
app.set("query parser", "extended");

// Security headers (helmet): HSTS, nosniff, frame protection, referrer
// policy and a Content-Security-Policy. See middleware/securityHeaders.js.
app.use(enforceHttps);
app.use(securityHeaders);

// Gzip response bodies. Registered first so every downstream response
// (API JSON, docs, health) is compressed before it leaves the server.
app.use(compression());
app.use(cookieParser());

// Webhook signatures are computed over the exact raw body, so keep a copy —
// but only for webhook routes, not for every request.
app.use(express.json({
  limit: "1mb",
  verify: (req, res, buffer) => {
    if (req.originalUrl.endsWith("/webhook")) {
      req.rawBody = buffer.toString("utf8");
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:4000",
  "https://maisonorderplanning.netlify.app",
  "https://maisonorderplanning.in"
];

const isAllowedOrigin = origin =>
  !origin ||
  allowedOrigins.includes(origin) ||
  (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin)) ||
  /^https:\/\/[-a-z0-9]+--orderplanning\.netlify\.app$/i.test(origin);

const corsOptions = {
  origin: (origin, callback) => {
    // Do NOT throw — that returns a 500 with no CORS headers, which the browser
    // reports as a generic CORS error. Reject cleanly instead.
    callback(null, isAllowedOrigin(origin));
  },
  optionsSuccessStatus: 204,
  credentials: true,
};

app.use(cors(corsOptions));

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: fromEnv(),
});

const sharp = require("sharp");

const IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp"];

// Resize to a sensible max and re-encode as WebP before upload. A 4 MB phone
// photo typically lands around 150–300 KB with no visible quality loss.
// Falls back to the original bytes if sharp can't read the file.
const compressImage = async file => {
  try {
    const buffer = await sharp(file.buffer)
      .rotate() // respect EXIF orientation
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return { buffer, mimetype: "image/webp", ext: "webp" };
  } catch (err) {
    console.error("⚠️ Image compression failed, uploading original:", err.message);
    return { buffer: file.buffer, mimetype: file.mimetype, ext: null };
  }
};

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type."));
    }
  },
});

const bucketHost = () =>
  `${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com`;

// Unique key per upload so products never overwrite each other's images.
const uploadProductImages = async (productId, files = []) => {
  const images = [];
  for (const file of files) {
    const { buffer, mimetype, ext } = await compressImage(file);
    let safeName = file.originalname.replace(/[^\w.-]/g, "_");
    if (ext) safeName = safeName.replace(/\.[^.]+$/, "") + `.${ext}`;
    const key = `products/${productId}/${Date.now()}-${safeName}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // Filenames are unique per upload, so images can be cached forever.
      CacheControl: "public, max-age=31536000, immutable",
    }));
    images.push({ _id: generateId(), url: `https://${bucketHost()}/${key}` });
  }
  return images;
};

// S3 key for an image in our bucket, or null for anything else.
const getImageKeyFromUrl = imageUrl => {
  try {
    const parsed = new URL(imageUrl);
    if (parsed.host !== bucketHost()) return null;
    return decodeURIComponent(parsed.pathname.slice(1)) || null;
  } catch {
    return null;
  }
};

// Best-effort cleanup. DeleteObjects rejects an empty list, so skip it then.
const deleteImages = async (images = []) => {
  const objects = images
    .map(image => getImageKeyFromUrl(image.url))
    .filter(Boolean)
    .map(Key => ({ Key }));
  if (!objects.length) return;
  try {
    await s3.send(new DeleteObjectsCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Delete: { Objects: objects, Quiet: true },
    }));
  } catch (err) {
    console.error("⚠️ S3 image cleanup failed:", err.message);
  }
};

const pickProductFields = body => {
  const fields = {};
  for (const key of ["name", "description", "price", "category", "Stock", "lowStockThreshold"]) {
    if (body[key] !== undefined && body[key] !== "") fields[key] = body[key];
  }
  return fields;
};

// Options (Size, Colour…) and variants arrive as JSON strings in the
// multipart form. Validates them and sets the derived Stock / price range.
// Returns an error message for the client, or null.
const applyVariantInput = (fields, body, existing) => {
  if (body.options === undefined) return null;
  try {
    const built = buildVariantFields({
      options: body.options,
      variants: body.variants,
      price: fields.price ?? existing?.price,
      existingVariants: existing?.variants,
    });
    fields.options = built.options;
    fields.variants = built.variants;
    fields.priceFrom = built.priceFrom;
    fields.priceTo = built.priceTo;
    if (built.variants.length) fields.Stock = built.Stock;
    return null;
  } catch (error) {
    return error instanceof SyntaxError ? "Options could not be read" : error.message;
  }
};

// Colour tags for photos. New uploads: `imageColors` = JSON array in upload
// order. Existing photos: `imageTags` = JSON { imageId: colour }. Tags that
// don't match a colour of the product are dropped.
const tagNewImages = (images, raw) => {
  const tags = Array.isArray(raw) ? raw : parseTags(raw);
  if (!Array.isArray(tags)) return images;
  return images.map((img, i) => (tags[i] ? { ...img, color: String(tags[i]) } : img));
};
const tagExistingImages = (images, raw) => {
  const tags = parseTags(raw);
  if (!tags || typeof tags !== "object") return images;
  return images.map(img => {
    const plain = typeof img.toObject === "function" ? img.toObject() : { ...img };
    if (Object.prototype.hasOwnProperty.call(tags, plain._id)) {
      if (tags[plain._id]) plain.color = String(tags[plain._id]);
      else delete plain.color;
    }
    return plain;
  });
};

const syncSearchIndex = promise =>
  promise.catch(err => console.error("Search index sync failed:", err.message));

// Route Imports
const productRoute = require("./routes/product");
const userRoute = require("./routes/user");
const orderRoute = require("./routes/order");
const paymentRoute = require("./routes/payment");
const subscriptionRoute = require("./routes/subscription");
const couponRoute = require("./routes/coupon");
const analyticsRoute = require("./routes/analytics");
const jobsRoute = require("./routes/jobs");
const bannerRoute = require("./routes/banner");
const cartRoute = require("./routes/cart");
const redirectRoute = require("./routes/redirect");
const searchRoute = require("./routes/search");
const seoRoute = require("./routes/seo");
const invoiceRoute = require("./routes/invoice");
const auditRoute = require("./routes/audit");
const walletRoute = require("./routes/wallet");
const featuresRoute = require("./routes/features");
const inventory = require("./services/inventoryService");
const { auditAdminWrites, snapshot } = require("./middleware/audit");
const { buildVariantFields, cleanImageColors, parseTags } = require("./utils/productVariants");

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is online and ready.",
    timestamp: new Date().toISOString()
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use("/api/v1", apiLimiter);
// Audit trail for every admin write (must run before the routes).
app.use(["/api/v1/admin", "/admin"], auditAdminWrites);
app.use("/api/v1", productRoute);
app.use("/api/v1", searchRoute);
app.use("/api/v1", userRoute);
app.use("/api/v1", orderRoute);
app.use("/api/v1", paymentRoute);
app.use("/api/v1", subscriptionRoute);
app.use("/api/v1", couponRoute);
app.use("/api/v1", analyticsRoute);
app.use("/api/v1", jobsRoute);
app.use("/api/v1", bannerRoute);
app.use("/api/v1", cartRoute);
app.use("/api/v1", invoiceRoute);
app.use("/api/v1", auditRoute);
app.use("/api/v1", walletRoute);
app.use("/api/v1", featuresRoute);
app.use(redirectRoute);
app.use(seoRoute); // /sitemap.xml

// --- Admin product routes with image uploads ---------------------------------
// These live outside /api/v1 because the frontend calls them at these paths.
// Middleware is attached per route (not router.use) so it never runs for
// unrelated requests such as the SPA fallback below.
const adminProducts = express.Router();
const adminOnly = [apiLimiter, isAuthUser, authRoles("admin")];

adminProducts.post("/admin/add-product", adminOnly, upload.array("product", 10), async (req, res) => {
  try {
    const productId = generateId();
    // Validate options/variants (and photo tags) before uploading anything,
    // so a rejected form doesn't leave photos behind in S3.
    const fields = pickProductFields(req.body);
    const variantError = applyVariantInput(fields, req.body, null);
    if (variantError) {
      return res.status(400).json({ success: false, message: variantError });
    }
    let imageColors;
    try {
      imageColors = parseTags(req.body.imageColors);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    let images = await uploadProductImages(productId, req.files);
    images = cleanImageColors(tagNewImages(images, imageColors), fields.options);

    const embedding = await generateEmbedding(`${fields.name || ""} ${fields.description || ""}`);

    const product = await Product.create({
      _id: productId,
      ...fields,
      images,
      ...(embedding ? { embedding } : {}),
      user: req.user._id,
    });

    await cache.del(`product:${productId}`);
    syncSearchIndex(indexProduct(product));

    res.locals.audit = {
      entity: { type: "product", id: productId },
      after: snapshot(product, ["name", "price", "Stock", "category"]),
      summary: `Created product ${product.name}`,
    };

    res.status(201).json({
      success: true,
      message: "✅ Product created successfully.",
      product,
    });
  } catch (error) {
    console.error("⚠️ Error creating product:", error);
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({
      success: false,
      message: status === 400 ? error.message : "Could not create product",
    });
  }
});

adminProducts.put("/admin/product/:id", adminOnly, upload.array("product", 10), async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Only whitelisted fields; never ratings, reviews, user, isDemo, ...
    const update = pickProductFields(req.body);
    const variantError = applyVariantInput(update, req.body, product);
    if (variantError) {
      return res.status(400).json({ success: false, message: variantError });
    }

    let oldImages = null;
    if (req.files && req.files.length > 0) {
      // Upload first, delete the old images only after the update succeeds,
      // so a failed upload doesn't leave the product with no images.
      update.images = await uploadProductImages(productId, req.files);
      oldImages = product.images;
    }
    // Colour tags: on new uploads, or on the existing photos when no new ones
    // were sent. Re-checked against the (possibly edited) colour values.
    try {
      const options = update.options ?? product.options;
      if (update.images) {
        update.images = cleanImageColors(tagNewImages(update.images, req.body.imageColors), options);
      } else if (req.body.imageTags !== undefined || update.options !== undefined) {
        update.images = cleanImageColors(tagExistingImages(product.images, req.body.imageTags), options);
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    if (update.name || update.description) {
      const vector = await generateEmbedding(
        `${update.name || product.name} ${update.description || product.description}`
      );
      if (vector) update.embedding = vector;
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, update, {
      returnDocument: "after",
      runValidators: true,
    });

    if (oldImages) await deleteImages(oldImages);

    await cache.del(`product:${productId}`);
    syncSearchIndex(indexProduct(updatedProduct));
    inventory.onStockEdited(productId, product.Stock, updatedProduct.Stock);
    res.locals.audit = {
      before: snapshot(product, ['name', 'price', 'Stock', 'category', 'lowStockThreshold']),
      after: snapshot(updatedProduct, ['name', 'price', 'Stock', 'category', 'lowStockThreshold']),
      summary: `Updated product ${updatedProduct.name}${oldImages ? " (new images)" : ""}`,
    };

    res.status(200).json({
      success: true,
      message: "✅ Product updated successfully.",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Product Update Error:", error);
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({
      success: false,
      message: status === 400 ? error.message : "Server Error during update",
    });
  }
});

adminProducts.delete("/admin/product/:id", adminOnly, async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await Product.deleteOne({ _id: productId });
    res.locals.audit = {
      before: snapshot(product, ["name", "price", "Stock", "category"]),
      summary: `Deleted product ${product.name}`,
    };
    await deleteImages(product.images);
    await cache.del(`product:${productId}`);
    syncSearchIndex(deleteProductDoc(productId));

    return res.status(200).json({
      success: true,
      message: "✅ Product deleted successfully.",
      product,
    });
  } catch (error) {
    console.error("⚠️ Error deleting product:", error);
    return res.status(500).json({ success: false, message: "Could not delete product" });
  }
});

app.use(adminProducts);
app.use("/api/v1", adminProducts);

// --- Serve the built React app (same-origin deployment) ---------------------
// In production the backend serves the compiled frontend, so the whole app is
// one origin: no CORS, no cross-site cookies, relative /api/v1 calls just work.
// Guarded by NODE_ENV so local dev (CRA dev server + proxy) is unaffected.
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "../frontend/build");
  // Vite fingerprints everything in /assets, so those can be cached for a year;
  // index.html must always be revalidated so new deploys are picked up.
  app.use(express.static(buildPath, {
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // SPA fallback: any non-API GET returns index.html so client-side routes
  // (e.g. /product/:id, /account/addresses) resolve. Express 5 needs a RegExp
  // here, and we exclude the API, docs, and socket.io paths.
  app.get(/^\/(?!api\/|api-docs|socket\.io\/).*/, (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("Hello, welcome to my API!");
  });
}

// Error handler goes LAST so it catches errors from every route above
// (including multer's "Invalid file type" and oversized uploads).
app.use(errorMiddleware);

module.exports = app;
module.exports.isAllowedOrigin = isAllowedOrigin;
