import { recordProductInteraction } from "../services/productInteractionService.js";

export const trackProductInteraction = async (req, res) => {
    try {
        const { productId, type, anonymousId } = req.body;

        if (!productId || !type) {
            return res.status(400).json({
                success: false,
                message: "productId and type are required",
            });
        }

        // Logged-in users are tracked by their id; guests by a client-supplied
        // anonymous id. One of the two must be present.
        if (!req.user && !anonymousId) {
            return res.status(400).json({
                success: false,
                message: "anonymousId is required for guest tracking",
            });
        }

        await recordProductInteraction({
            userId: req.user ? req.user._id : undefined,
            anonymousId: req.user ? undefined : anonymousId,
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
