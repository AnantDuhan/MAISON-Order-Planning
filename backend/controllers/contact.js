const Contact = require('../models/contact');
const sendEmail = require('../utils/sendEmail');
const { sendEmailInBackground } = require('../utils/sendEmail');
const ejs = require('ejs');
const path = require('path');
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const generateId = require('../utils/generateId');

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

exports.contactUs = async (req, res) => {
    try {
        // Honeypot: real users never see the "website" field. Pretend success
        // so bots don't learn they were filtered.
        if (req.body.website) {
            return res.status(200).json({ success: true, message: 'Message sent and saved successfully' });
        }

        const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
        const name = clean(req.body.name, 80);
        const email = clean(req.body.email, 120).toLowerCase();
        const subject = clean(req.body.subject, 150);
        const message = clean(req.body.message, 2000);

        const errors = [];
        if (name.length < 2) errors.push('Name is required.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push('A valid email is required.');
        if (subject.length < 3) errors.push('Subject is required.');
        if (message.length < 10) errors.push('Message must be at least 10 characters.');
        // Link-stuffed messages are almost always spam.
        if ((message.match(/https?:\/\//gi) || []).length > 3) errors.push('Too many links in message.');
        if (errors.length) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const contact = await Contact.create({
            _id: generateId(),
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
