import dotenv from "dotenv";
import mongoose from "mongoose";
import Product from "../models/product.js";
import { generateEmbedding } from "../utils/generateEmbedding.js";

dotenv.config({ path: "./config/config.env" });

const generateProductEmbeddings = async () => {
    try {
        await mongoose.connect(process.env.DB_HOSTED_URI);

        console.log("✅ MongoDB connected");

        const products = await Product.find({
            $or: [
                { embedding: { $exists: false } },
                { embedding: { $size: 0 } }
            ]
        })
            .select("_id name description")
            .lean();

        console.log(`📦 Products requiring embeddings: ${products.length}`);

        let successCount = 0;
        let failedCount = 0;

        for (const product of products) {
            console.log(`\n🔄 Generating embedding for: ${product.name}`);

            const text = `${product.name}\n${product.description}`;

            const embedding = await generateEmbedding(text);

            if (!embedding || embedding.length === 0) {
                console.error(
                    `❌ Failed to generate embedding for: ${product.name}`
                );

                failedCount++;
                continue;
            }

            // Only update the embedding field.
            // This avoids saving unrelated/malformed fields such as aiSummary.
            await Product.updateOne(
                { _id: product._id },
                {
                    $set: {
                        embedding
                    }
                }
            );

            console.log(
                `✅ Saved embedding for ${product.name} (${embedding.length} dimensions)`
            );

            successCount++;

            // Small delay to avoid hitting embedding API too aggressively
            await new Promise((resolve) => setTimeout(resolve, 300));
        }

        console.log("\n========================================");
        console.log("🎉 Embedding migration completed");
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log("========================================");

    } catch (error) {
        console.error("❌ Embedding migration failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 MongoDB disconnected");
    }
};

generateProductEmbeddings();