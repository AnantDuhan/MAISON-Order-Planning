const Coupon = require('../models/coupon');
const Order = require('../models/order');
const generateId = require('../utils/generateId');
const { realOnly } = require('../utils/demoFilter');

// Generate a new coupon code
exports.generateCoupon = async (req, res, next) => {
    try {
        const { code, discount, expiresAt, membersOnly } = req.body;

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
            expiresAt: expiry,
            membersOnly: membersOnly === true || membersOnly === 'true'
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
            // Real admin: real coupons only (the demo seed's are isDemo).
            ? await Coupon.find(req.user.isDemo ? { isDemo: true } : realOnly()).sort({ createdAt: -1 })
            : await Coupon.find({ expiresAt: { $gt: new Date() }, isDemo: { $ne: true } })
                .select('code discount expiresAt membersOnly')
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

// GET /api/v1/admin/coupons
// Every coupon, newest first, with how it has been used: orders placed with
// it, their revenue, the discount given and when it was last used. The demo
// admin sees only demo coupons and orders; the real admin never sees them.
exports.getAdminCoupons = async (req, res) => {
    try {
        const scope = () => (req.user?.isDemo ? { isDemo: true } : realOnly());
        const coupons = await Coupon.find(scope()).sort({ createdAt: -1 }).lean();
        const codes = coupons.map(c => c.code);

        const usage = codes.length
            ? await Order.aggregate([
                { $match: { ...scope(), couponUsed: true, couponCode: { $in: codes } } },
                {
                    $group: {
                        _id: '$couponCode',
                        orders: { $sum: 1 },
                        revenue: { $sum: '$totalPrice' },
                        discountGiven: { $sum: '$discountedAmount' },
                        lastUsedAt: { $max: '$createdAt' },
                    },
                },
            ])
            : [];
        const byCode = new Map(usage.map(u => [u._id, u]));
        const now = Date.now();

        res.status(200).json({
            success: true,
            coupons: coupons.map(c => {
                const u = byCode.get(c.code) || {};
                return {
                    _id: c._id,
                    code: c.code,
                    discount: c.discount,
                    membersOnly: Boolean(c.membersOnly),
                    createdAt: c.createdAt,
                    expiresAt: c.expiresAt,
                    active: new Date(c.expiresAt).getTime() > now,
                    orders: u.orders || 0,
                    revenue: Math.round(u.revenue || 0),
                    discountGiven: Math.round(u.discountGiven || 0),
                    lastUsedAt: u.lastUsedAt || null,
                };
            }),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Could not load coupons' });
    }
};
