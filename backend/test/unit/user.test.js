const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const userController = require('../controllers/user.controller');
const User = require('../../models/user');
const sendEmail = require('../../utils/sendEmail');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('User Controller - Forgot Password', () => {

    afterEach(() => {
        sinon.restore();
    });

    it('should return a success message if the user is found and the email is sent successfully to the user', async () => {
        const req = {
            body: {
                email: 'test@example.com'
            }
        };

        const user = {
            email: 'test@example.com',
            getResetPasswordToken: sinon.stub().returns('resetToken'),
            save: sinon.stub().resolves()
        };

        // stub user.findOne to resolve with a user
        sinon.stub(User, 'findOne').resolves(user);

        // stub sendEmail to resolve successfully
        sinon.stub(sendEmail, 'sendEmail').resolves();

        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };

        const result = await userController.forgotPassword(req, res);

        expect(result).to.equal(`Email sent to ${user.email} successfully.`);

        expect(res.status).to.be.calledWith(200);
        expect(res.json).to.be.calledWithMatch({
            success: true,
            message: `Email sent to ${user.email} successfully.`
        });
    });

    it('should return a "User not found" error message if the user is not found', async () => {
        const req = {
            body: {
                email: 'nonexistant@example.com'
            }
        };

        // Stub User.findOne to resolve with null, indicating that the user doesn't exist
        sinon.stub(User, 'findOne').resolves(null);

        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };

        const result = await userController.forgotPassword(req, res);

        expect(result).to.equal('User not found');

        expect(result).to.be.calledWith(404);
        expect(result).to.be.calledWithMatch({
            success: false,
            message: 'User not found'
        });
    });

    it('should handle errors and return a "Failed to reset Password" message', async () => {
        const req = {
            body: {
                email: 'test@example.com'
            }
        };

        const user = {
            email: 'test@example.com',
            getResetPasswordToken: sinon.stub().returns('resetToken'),
            save: sinon.stub().resolves(),
        };

        // stub User.findOne to resolve with a user
        sinon.stub(User, 'findOne').resolves(user);

        // stub sendEmail to simulate an error
        sinon.stub(sendEmail, 'sendEmail').rejects(new Error('Fake Error'));

        const res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub(),
        };

        const result = await userController.forgotPassword(req, res);

        expect(result).to.equal('Failed to reset password');

        expect(result).to.be.calledWith(500);
        expect(result).to.be.calledWithMatch({
            success: false,
            message: 'Failed to reset password'
        });
    });
});
