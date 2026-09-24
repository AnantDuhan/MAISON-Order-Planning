const Coupon = require('../models/coupon');
const generateId = require('../utils/generateId');

// Generate a new coupon code
exports.generateCoupon = async (req, res, next) => {
    try {
        const { code, discount, expiresAt } = req.body;

        if (!code || discount === undefined || discount === null || discount === '') {
            return res.status(400).json({
                success: false,
                message: 'Coupon code and discount are required'
            });
        }

        const discountValue = Number(discount);
        if (Number.isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
            return res.status(400).json({
                success: false,
                message: 'Discount must be a percentage between 0 and 100'
            });
        }

        // Custom expiry if supplied and valid, else default to 7 days out.
        let expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        if (expiresAt) {
            const parsed = new Date(expiresAt);
            if (Number.isNaN(parsed.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid expiry date'
                });
            }
            if (parsed.getTime() <= Date.now()) {
                return res.status(400).json({
                    success: false,
                    message: 'Expiry date must be in the future'
                });
            }
            expiry = parsed;
        }

        const coupon = await Coupon.create({
            _id: generateId(),
            code: code.trim().toUpperCase(),
            discount: discountValue,
            expiresAt: expiry
        });

        res.status(201).json({
            success: true,
            coupon
        });
    } catch (error) {
        // Duplicate code (unique index) surfaces as a 409 rather than a 500.
        if (error && error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A coupon with that code already exists'
            });
        }
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
        const isAdmin = req.user?.role === 'admin' && (req.auth?.mfaVerified || req.user.isDemo);

        const coupons = isAdmin
            ? await Coupon.find(req.user.isDemo ? { isDemo: true } : {}).sort({ createdAt: -1 })
            : await Coupon.find({ expiresAt: { $gt: new Date() }, isDemo: { $ne: true } })
                .select('code discount expiresAt')
                .sort({ discount: -1 });

        res.status(200).json({
            success: true,
            coupons
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupon codes'
        });
    }
};
