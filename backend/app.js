const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const errorMiddleware = require("./middleware/error");
const multer = require("multer");
const url = require("url");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  UploadPartCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { fromEnv } = require("@aws-sdk/credential-provider-env");
// const s3 = new S3Client();
const { isAuthUser, authRoles } = require("./middleware/auth");
const User = require("./models/user");
const Product = require("./models/product");
const jwt = require("jsonwebtoken");
const Snowflake = require("@theinternetfolks/snowflake");
const { Client } = require('@elastic/elasticsearch');
const { generateEmbedding } = require('./utils/generateEmbedding');
const redisClientPromise = require('./config/redisClient');
const esClient = new Client({ node: 'http://localhost:9200' });
require("dotenv").config({ path: "./config/config.env" });

app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 50000,
  }),
);

// s3.config.update({
//     region: process.env.AWS_BUCKET_REGION,
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
// });

// Initialize S3 client
const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: fromEnv(),
});

// Configure Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type."));
    }
  },
});

// app.use(upload.single('image'));
// app.use(upload.array('product', 10));

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

// Route Imports
const productRoute = require("./routes/product");
const userRoute = require("./routes/user");
const orderRoute = require("./routes/order");
const paymentRoute = require("./routes/payment");
const couponRoute = require("./routes/coupon");

app.use("/api/v1", productRoute);
app.use("/api/v1", userRoute);
app.use("/api/v1", orderRoute);
app.use("/api/v1", paymentRoute);
app.use("/api/v1", couponRoute);

// CORS
app.use(async (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "*");
  return next();
});

const corsOptions = {
  origin: "http://localhost:3000",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
};

app.use(cors(corsOptions));

process.noDeprecation = true;

// middleware for error
app.use(errorMiddleware);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Internal Server Error");
});

app.get("/", (req, res) => {
  res.send("Hello, welcome to my API!");
});

app.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { name, whatsappNumber, email, password } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).send("No file uploaded.");
      return;
    }

    const s3 = new S3Client({
      region: process.env.AWS_BUCKET_REGION,
      credentials: fromEnv(),
    });

    // Define the upload parameters
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.originalname, // The name under which the file will be stored in S3
      Body: file.buffer, // The file data to be uploaded
    };

    // Upload the file to S3
    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3.send(uploadCommand);

    const cacheBuster = Date.now();
    const avatarUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uploadParams.Key}?cacheBuster=${cacheBuster}`;

    console.log("✅ Image uploaded successfully:", avatarUrl);

    const user = await User.create({
      _id: Snowflake.Snowflake.generate({
        timestamp: timestampInSeconds,
      }),
      name,
      whatsappNumber,
      email,
      password,
      avatar: avatarUrl,
    });

    let token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET_KEY,
    );

    const options = {
      expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      httpOnly: true,
    };

    res.status(201).cookie("token", token, options).json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("⚠️ Error:", err);
    res.status(500).json({
      success: false,
      message: "⚠️ Error: " + err.message,
    });
  }
});

app.put("/me/update", isAuthUser, upload.single("image"), async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email } = req.body;
    const file = req.file;

    // Upload the avatar image to AWS S3
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${userId}-${file.originalname}`,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    const s3 = new S3Client({
      region: process.env.AWS_BUCKET_REGION,
      credentials: fromEnv(),
    });

    // Upload the file to S3
    const uploadCommand = new PutObjectCommand(uploadParams);
    await s3.send(uploadCommand);

    const cacheBuster = Date.now();
    const avatarUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uploadParams.Key}?cacheBuster=${cacheBuster}`;

    // Update the user profile in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, email, avatar: avatarUrl },
      { new: true },
    );

    res.status(200).json({
      message: "✅ Profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("⚠️ Error processing request:", error);
    res.status(500).json({ error: "⚠️ Internal server error." });
  }
});

// Extract image key from URL
const getImageKeyFromUrl = (imageUrl) => {
  const parsedUrl = url.parse(imageUrl);
  const pathName = parsedUrl.pathname;
  const key = pathName.substring(1); // Remove the leading slash (/)

  return key;
};

app.delete(
  "/admin/user/:id",
  isAuthUser,
  authRoles("admin"),
  async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: "⚠️ User not found" });
      }

      // Initialize S3 client
      const s3 = new S3Client({
        region: process.env.AWS_BUCKET_REGION,
        credentials: fromEnv(),
      });

      // Delete image from AWS S3
      const imageKey = getImageKeyFromUrl(user.avatar);
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageKey,
      };

      // Delete the object from S3
      await s3.send(new DeleteObjectCommand(deleteParams));

      console.log("✅ Image deleted from AWS S3");

      // Delete user from MongoDB
      await User.findByIdAndDelete(userId);

      console.log("✅ User deleted from MongoDB:", user);

      return res.status(200).json({
        success: true,
        message: "✅ Profile deleted successfully.",
      });
    } catch (error) {
      console.error("⚠️ Error processing request:", error);
      return res.status(500).json({ error: "⚠️ Internal server error." });
    }
  },
);

app.post(
  "/admin/add-product",
  isAuthUser,
  authRoles("admin"),
  upload.array("product", 10),
  async (req, res) => {
    try {
      const { name, description, price, category, Stock } = req.body;
      const files = req.files;

      const imageUrls = [];

      if (files && files.length > 0) {
        // Initialize S3 client
        const s3 = new S3Client({
          region: process.env.AWS_BUCKET_REGION,
          credentials: fromEnv(),
        });

        for (const file of files) {
          // Upload the product image to AWS S3
          const uploadParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: file.originalname,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          // Upload the file to S3
          const uploadCommand = new PutObjectCommand(uploadParams);
          await s3.send(uploadCommand);

          const cacheBuster = Date.now();
          const avatarUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uploadParams.Key}?cacheBuster=${cacheBuster}`;

          console.log("✅ Image uploaded successfully:", avatarUrl);
          imageUrls.push(avatarUrl);
        }
      }

      // Create a new product in the database
      const product = await Product.create({
        _id: Snowflake.Snowflake.generate({
          timestamp: timestampInSeconds,
        }),
        name,
        description,
        price,
        category,
        Stock,
        images: imageUrls.map((url) => ({ url })),
        user: req.user._id,
      });

      const newProduct = await product.save();

      res.status(201).json({
        message: "✅ Product created successfully.",
        product: newProduct,
      });
    } catch (error) {
      console.error("⚠️ Error creating product:", error);
      res.status(500).json({
        success: false,
        error: "⚠️ Internal server error." + error,
      });
    }
  },
);

app.put(
  "/admin/product/:id",
  isAuthUser,
  authRoles("admin"),
  upload.array("product", 10),
  async (req, res) => {
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
        const redisClient = await redisClientPromise;
        const cacheKey = `product:${productId}`;

        if (redisClient && typeof redisClient.del === 'function') {
            await redisClient.del(cacheKey);
            await redisClient.set(cacheKey, JSON.stringify(updatedProduct), { EX: 3600 });
        } else {
            console.warn('⚠️ Redis Warning: redisClient.del is not available. Skipping cache sync. Check config/redisClient.js export.');
        }
      } catch (cacheError) {
        console.error("Redis cache sync error:", cacheError);
      }

      try {
        const docToUpdate = {};
        if (req.body.price) docToUpdate.price = req.body.price;
        if (req.body.name) docToUpdate.name = req.body.name;
        if (req.body.description)
          docToUpdate.description = req.body.description;
        if (req.body.embedding) docToUpdate.embedding = req.body.embedding;

        if (Object.keys(docToUpdate).length > 0) {
          await esClient.update({
            index: "products",
            id: productId,
            body: { 
                doc: docToUpdate, 
                doc_as_upsert: true
            },
          });
        }
      } catch (error) {
        console.error("Elasticsearch sync error:", error);
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
  },
);

// app.put(
//     '/admin/product/:id',
//     isAuthUser,
//     authRoles('admin'),
//     upload.array('product', 10),
//     async (req, res) => {
//         try {
//             const productId = req.params.id;
//             const { name, description, price, category, stock } = req.body;
//             const files = req.files;

//             let imageUrls = [];

//             const product = await Product.findById(productId);

//             if (!product) {
//                 return res.status(404).json({ error: '⚠️ Product not found' });
//             }

//             // Initialize S3 client
//             const s3 = new S3Client({
//                 region: process.env.AWS_BUCKET_REGION,
//                 credentials: fromEnv()
//             });

//             // Delete images from AWS S3
//             const deleteObjects = product.images.map(image => ({
//                 Key: getImageKeyFromUrl(image.url)
//             }));
//             const deleteParams = {
//                 Bucket: process.env.AWS_BUCKET_NAME,
//                 Delete: {
//                     Objects: deleteObjects,
//                     Quiet: false
//                 }
//             };
//             const deleteObject = new DeleteObjectCommand(deleteParams);
//             await s3.send(deleteObject);

//             console.log('✅ Images deleted from AWS S3');

//             // Upload new images
//             const uploadParams = {
//                 Bucket: process.env.AWS_BUCKET_NAME,
//                 Key: `${productId}-${files.originalname}`,
//                 Body: files.buffer,
//                 ContentType: files.mimetype
//             };

//             for (const file of files) {
//                 uploadParams.Key = file.originalname;
//                 uploadParams.ContentType = file.mimetype;
//                 uploadParams.Body = file.buffer;

//                 await s3.send(
//                     new UploadPartCommand(uploadParams)
//                 );

//                 const cacheBuster = Date.now();
//                 const avatarUrl = `https://${uploadParams.Bucket}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${uploadParams.Key}?cacheBuster=${cacheBuster}`;

//                 imageUrls.push({
//                     key: file.originalname,
//                     url: avatarUrl
//                 });
//             }

//             // Update the product in the database
//             const updatedProduct = await Product.findByIdAndUpdate(
//                 productId,
//                 {
//                     name,
//                     description,
//                     price,
//                     category,
//                     stock,
//                     images: imageUrls
//                 },
//                 { new: true }
//             );

//             if (!updatedProduct) {
//                 return res
//                     .status(404)
//                     .json({ error: '⚠️⚠️ Product not found.' });
//             }

//             res.status(200).json({
//                 message: '✅ Product updated successfully.',
//                 product: updatedProduct
//             });
//         } catch (error) {
//             console.error('⚠️ Error processing request:', error);
//             res.status(500).json({
//                 success: false,
//                 error: '⚠️ Internal server error.'
//             });
//         }
//     }
// );

app.delete(
  "/admin/product/:id",
  isAuthUser,
  authRoles("admin"),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({ error: "⚠️ Product not found" });
      }

      // Initialize S3 client
      const s3 = new S3Client({
        region: process.env.AWS_BUCKET_REGION,
        credentials: fromEnv(),
      });

      // Delete images from AWS S3
      const deleteObjects = product.images.map((image) => ({
        Key: getImageKeyFromUrl(image.url),
      }));
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Delete: {
          Objects: deleteObjects,
          Quiet: false,
        },
      };
      await s3.send(new DeleteObjectsCommand(deleteParams));

      console.log("✅ Images deleted from AWS S3");

      // Delete product from MongoDB
      await Product.findByIdAndDelete(productId);

      console.log("✅ Product deleted from MongoDB:", product);

      return res.status(200).json({
        success: true,
        message: "✅ Product deleted successfully.",
        product,
      });
    } catch (error) {
      console.error("⚠️ Error processing request:", error);
      return res.status(500).json({ error: "⚠️ Internal server error." });
    }
  },
);

module.exports = app;
