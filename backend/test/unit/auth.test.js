const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const sinon = require('sinon');
const authController = require('../controllers/auth.controller');
const User = require('../../models/user');
const stripe = require('stripe');
const AWS = require('aws-sdk');

AWS.config.update({
    region: process.env.AWS_BUCKET_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const s3 = new AWS.S3();

chai.use(chaiAsPromised);
const expect = chai.expect;

// describe('Registration Controller', () => {
//     it('should register a user successfully', async () => {
//         const req = {
//             body: {
//                 name: 'John Doe',
//                 whatsappNumber: '1234567890',
//                 email: 'john@example.com',
//                 password: 'password'
//             },
//             file: {
//                 originalname: 'avatar.jpg',
//                 buffer: Buffer.from('fake image data')
//             }
//         };

//         // Mocking stripe.customers.create
//         sinon
//             .stub(stripe.customers, 'create')
//             .resolves({ id: 'stripeCustomerId' });

//         // Mocking S3 upload
//         sinon.stub(s3, 'upload').returnsThis(); // To chain .promise()
//         sinon.stub(s3, 'promise').resolves({ Location: 'avatar-url' });

//         // Mocking User.create
//         sinon.stub(User, 'create').resolves({});

//         const user = await registrationController.registerUser(req);

//         expect(user).to.be.an('object');
//         expect(user).to.have.property('name', 'John Doe');

//         // Restore stubs to avoid interfering with other tests
//         sinon.restore();
//     });

//     it('should throw an error if no file is uploaded', async () => {
//         const req = {
//             body: {
//                 name: 'John Doe',
//                 whatsappNumber: '1234567890',
//                 email: 'john@example.com',
//                 password: 'password'
//             },
//             file: undefined // No file uploaded
//         };

//         await expect(
//             registrationController.registerUser(req)
//         ).to.be.rejectedWith('No file uploaded.');
//     });
// });

describe('User Controller', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('should return an error if email or password is missing', async () => {
        const req = {
            body: {
                // Missing email and password
            }
        };

        const result = await authController.loginUser(req);

        expect(result).to.equal('Please Enter Email and Password');
    });

    it('should return an error if the email is invalid', async () => {
        const req = {
            body: {
                email: 'invalid_email@example.com',
                password: 'password123'
            }
        };

        // Stub User.findOne to resolve with null, indicating that the user doesn't exist
        sinon.stub(User, 'findOne').resolves(null);

        const result = await authController.loginUser(req);

        expect(result).to.equal('Failed to Login');
    });

    it('should return an error if the password is incorrect', async () => {
        const req = {
            body: {
                email: 'valid_email@example.com',
                password: 'incorrect_password'
            }
        };

        // Stub User.findOne to resolve with a user but with a password mismatch
        sinon.stub(User, 'findOne').resolves({
            email: 'valid_email@example.com',
            comparePassword: async () => false
        });

        const result = await authController.loginUser(req);

        expect(result).to.equal('Failed to Login');
    });

    it('should return the user object if login is successful', async () => {
        const req = {
            body: {
                email: 'valid_email@example.com',
                password: 'correct_password'
            }
        };

        // Stub User.findOne to resolve with a user and password match
        sinon.stub(User, 'findOne').resolves({
            email: 'valid_email@example.com',
            comparePassword: async () => true
        });

        const result = await authController.loginUser(req);

        expect(result).to.be.an('object');
        expect(result).to.have.property('email', 'valid_email@example.com');
    });

    it('should return an error if an exception occurs', async () => {
        const req = {
            body: {
                email: 'valid_email@example.com',
                password: 'correct_password'
            }
        };

        // Stub User.findOne to simulate an exception
        sinon.stub(User, 'findOne').throws(new Error('Fake error'));

        const result = await authController.loginUser(req);

        expect(result).to.equal('Failed to Login');
    });
});
