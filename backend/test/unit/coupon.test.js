const chai = require('chai');
const sinon = require('sinon');
const couponController = require('../controllers/coupon.controller');
const Coupon = require('../../models/Coupon');

chai.use(require('sinon-chai'));
const expect = chai.expect;

describe('Coupon Controller', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('generateCoupon', () => {
        it('should generate a new coupon successfully', async () => {
            const req = {
                body: {
                    code: 'TESTCODE',
                    discount: 10
                }
            };

            // Stub Coupon.create to resolve with a fake coupon object
            sinon.stub(Coupon, 'create').resolves({ _id: 'fakeId' });

            const result = await couponController.generateCoupon(req);

            expect(result).to.be.an('object');
            expect(result).to.have.property('_id', 'fakeId');
        });

        it('should handle errors when generating a coupon', async () => {
            const req = {
                body: {
                    code: 'TESTCODE',
                    discount: 10
                }
            };

            // Stub Coupon.create to simulate an error
            sinon.stub(Coupon, 'create').rejects(new Error('Fake error'));

            const result = await couponController.generateCoupon(req);

            expect(result).to.be.a('string');
            expect(result).to.equal('Coupon code generation failed');
        });
    });

    describe('getAllCoupons', () => {
        it('should get all coupons successfully', async () => {
            // Create fake coupons for testing
            const fakeCoupons = [
                { code: 'COUPON1', discount: 20 },
                { code: 'COUPON2', discount: 30 }
            ];

            // Stub Coupon.find to resolve with fake coupons
            sinon.stub(Coupon, 'find').resolves(fakeCoupons);

            const result = await couponController.getAllCoupons();

            expect(result).to.be.an('array');
            expect(result).to.deep.equal(fakeCoupons);
        });

        it('should handle errors when getting coupons', async () => {
            // Stub Coupon.find to simulate an error
            sinon.stub(Coupon, 'find').rejects(new Error('Fake error'));

            const result = await couponController.getAllCoupons();

            expect(result).to.be.a('string');
            expect(result).to.equal('Failed to fetch coupon codes');
        });
    });
});
