const Contact = require('../models/contact');
const sendEmail = require('../utils/sendEmail');
const { sendEmailInBackground } = require('../utils/sendEmail');
const ejs = require('ejs');
const path = require('path');
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const Snowflake = require('@theinternetfolks/snowflake');

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

exports.contactUs = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        const contact = await Contact.create({
            _id: Snowflake.Snowflake.generate({
                timestamp: timestampInSeconds
            }),
            name,
            email,
            subject,
            message
        });

        await contact.save();

        const emailMessage = await ejs.renderFile(
            path.join(__dirname, '../mails/contact-us.ejs'),
                { name, email, subject, message }
        );

        sendEmailInBackground({
            email: 'duhananant@gmail.com',
            subject: `New Contact Form Submission`,
            html: emailMessage
        });

        res.status(200).json({
            success: true,
            message: 'Message sent and saved successfully',
            contact
        })
    } catch (error) {
        console.log("ERROR", error);
        res.status(500).json({
            success: false,
            message: 'Error Sending Message'
        })
    }
};
