const Coupon = require('../../models/Coupon');

async function generateCoupon(req, res) {
    try {
        const { code, discount } = req.body;

        const coupon = await Coupon.create({
            code,
            discount,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        return coupon;
    } catch (error) {
        return 'Coupon code generation failed';
    }
};

async function getAllCoupons(req, res){
    try {
        const coupons = await Coupon.find();

        return coupons;
    } catch (error) {
        return 'Failed to fetch coupon codes';
    }
};

module.exports = {
    generateCoupon,
    getAllCoupons
};
