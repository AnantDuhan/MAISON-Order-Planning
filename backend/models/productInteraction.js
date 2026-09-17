import mongoose from "mongoose";

const productInteractionSchema = new mongoose.Schema(
    {
        user: {
            type: String,
            ref: "User",
            required: true,
        },

        product: {
            type: String,
            ref: "Product",
            required: true,
        },

        type: {
            type: String,
            enum: [
                "view",
                "click",
                "wishlist",
                "cart",
                "purchase",
            ],
            required: true,
        },

        weight: {
            type: Number,
            required: true,
        },

        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false,
    }
);

productInteractionSchema.index({
    user: 1,
    createdAt: -1,
});

productInteractionSchema.index({
    user: 1,
    product: 1,
});

export default mongoose.model(
    "ProductInteraction",
    productInteractionSchema
);