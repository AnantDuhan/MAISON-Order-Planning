const nodemailer = require('nodemailer');

const sendEmail = async options => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_MAIL || !process.env.SMTP_PASSWORD) {
        throw new Error('SMTP email configuration is missing');
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000
    });

    const mailOptions = {
        from: process.env.SMTP_MAIL,
        to: options.email,
        subject: options.subject,
        html: options.html,
        headers: {
            'Content-Type': 'text/html',
            charset: 'UTF-8'
        }
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
