const Coupon = require('../models/Coupon');
const nodeCache = require('node-cache');
const NodeCache = new nodeCache();
const Snowflake = require('@theinternetfolks/snowflake');

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

// Generate a new coupon code
exports.generateCoupon = async (req, res, next) => {
    try {
        const { code, discount } = req.body;

        const coupon = await Coupon.create({
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            code,
            discount,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        res.status(201).json({
            success: true,
            coupon
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Coupon code generation failed',
            error: error.message
        });
    }
};

// Get all coupon codes
exports.getAllCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find();

        res.status(200).json({
            success: true,
            coupons
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon codes',
            error: error.message
        });
    }
};
