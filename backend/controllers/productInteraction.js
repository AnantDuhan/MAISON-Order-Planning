import { recordProductInteraction } from "../services/productInteractionService.js";

export const trackProductInteraction = async (req, res) => {
    try {
        const { productId, type } = req.body;

        if (!productId || !type) {
            return res.status(400).json({
                success: false,
                message: "productId and type are required",
            });
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        await recordProductInteraction({
            userId: req.user._id,
            productId,
            type,
        });

        return res.status(201).json({
            success: true,
            message: "Interaction recorded",
        });
    } catch (error) {
        console.error("Product interaction error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};