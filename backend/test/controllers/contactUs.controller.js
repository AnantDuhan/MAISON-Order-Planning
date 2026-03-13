const Contact = require('../../models/contact');
const sendEmail = require('../../utils/sendEmail');

exports.contactUs = async (req, res) => {
        const { name, email, subject, message } = req.body;

        const contact = await Contact.create({
            name,
            email,
            subject,
            message
        });

        await contact.save();

        await sendEmail({
            email: 'duhananant@gmail.com',
            subject: `New Contact Form Submission`,
            html: `
      <p>You have received a new contact form submission:</p>
      <ul>
        <li>Name: ${name}</li>
        <li>Email: ${email}</li>
        <li>Subject: ${subject}</li>
      </ul>
      <p>Message:</p>
      <p>${message}</p>
    `
        });

    return contact;
};
