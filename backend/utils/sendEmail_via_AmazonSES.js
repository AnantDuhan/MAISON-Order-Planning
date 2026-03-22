const AWS = require('aws-sdk');
const Subscribe = require('../models/subscribe');

AWS.config.update({
    region: process.env.AWS_BUCKET_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const ses = new AWS.SES({ region: process.env.AWS_BUCKET_REGION });

const sendEmailViaAmazonSES = async (options) => {
    try {
        const users = await Subscribe.find(); // Retrieve all users

        for (const user of users) {
            const params = {
                Destination: {
                    ToAddresses: [options.email] // Send the email to each user
                },
                Message: {
                    Body: {
                        Text: {
                            Data: options.text || '' // You can use options.text for plain text email content
                        },
                        Html: {
                            Data: options.html || '' // You can use options.html for HTML email content
                        }
                    },
                    Subject: {
                        Data: options.subject
                    }
                },
                Source: 'duhananant@gmail.com' // Use a default source address
            };

            const data = await ses.sendEmail(params).promise();
            console.log(`Email sent to ${user.email}:`, data);
        }
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

module.exports = sendEmailViaAmazonSES;
