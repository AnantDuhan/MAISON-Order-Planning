const chai = require('chai');
const sinon = require('sinon');
const contactController = require('../../controllers/contact');
const Contact = require('../../models/contact');
const sendEmail = require('../../utils/sendEmail');

chai.use(require('sinon-chai'));
const expect = chai.expect;

describe('Contact Controller', () => {
    let req, res;

    beforeEach(() => {
        // Create fake request and response objects for each test
        req = {
            body: {
                name: 'John Doe',
                email: 'johndoe@example.com',
                subject: 'Test Subject',
                message: 'Test Message'
            }
        };
        res = {
            status: sinon.stub().returnsThis(),
            json: sinon.stub()
        };
    });

    it('should create a new contact and send notifications successfully', async () => {
        // Stub Contact.create to resolve with a fake contact object
        sinon.stub(Contact, 'create').resolves({ _id: 'fakeId' });

        // Stub sendEmail to resolve successfully
        sinon.stub(sendEmail, 'sendEmail').resolves();

        // Call the controller function
        await contactController.contactUs(req, res);

        // Assertions
        expect(res.status).to.be.calledWith(200);
        expect(res.json).to.be.calledWithMatch({
            success: true,
            message: 'Message sent and saved successfully'
        });

        // Restore stubs to avoid interfering with other tests
        sinon.restore();
    });

    it('should handle errors gracefully', async () => {
        // Stub Contact.create to simulate an error
        sinon.stub(Contact, 'create').rejects(new Error('Fake error'));

        // Call the controller function
        await contactController.contactUs(req, res);

        // Assertions
        expect(res.status).to.be.calledWith(500);
        expect(res.json).to.be.calledWithMatch({
            success: false,
            message: 'Error Sending Message'
        });

        // Restore stubs to avoid interfering with other tests
        sinon.restore();
    });
});
