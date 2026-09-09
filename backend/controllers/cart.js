const Cart = require('../models/cart');
const generateId = require('../utils/generateId');

// GET /cart — this user's synced cart (empty items if none saved yet)
exports.getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id });

        res.status(200).json({
            success: true,
            items: cart ? cart.items : [],
            updatedAt: cart ? cart.updatedAt : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch cart',
            error: error.message
        });
    }
};

// PUT /cart — replaces this user's whole cart with the given items.
// The mobile app treats this as a full sync point (debounced after local
// mutations, and merged-then-pushed once after login) rather than
// per-item endpoints, since a cart is small and this keeps sync simple.
exports.syncCart = async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'items must be an array'
            });
        }

        const cart = await Cart.findOneAndUpdate(
            { user: req.user._id },
            {
                $set: {
                    items,
                    updatedAt: new Date()
                },
                $setOnInsert: { _id: generateId(), user: req.user._id }
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            items: cart.items,
            updatedAt: cart.updatedAt
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to sync cart',
            error: error.message
        });
    }
};
