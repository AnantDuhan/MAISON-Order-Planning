const Subscribe = require('../models/subscribe');
const Snowflake = require('@theinternetfolks/snowflake');

const timestamp = Date.now();
const timestampInSeconds = Math.floor(timestamp / 1000);

exports.subscriber = async (req, res, next) => {
    try {
            const { email } = req.body;

            const existingSubscriber = await Subscribe.findOne({ email });

            if (existingSubscriber) {
                return res
                    .status(400)
                    .json({ error: 'Email address is already subscribed.' });
            }

            const newSubscriber = await Subscribe.create({
                _id: Snowflake.Snowflake.generate({
                    timestamp: timestampInSeconds
                }),
                email
            });
            await newSubscriber.save();

            res.status(200).json({
                success: true,
                message: "You've successfully subscribed to our newsletter",
                newSubscriber
            });
        } catch (error) {
        res.status(500).json({
            success: false,
            message : error.message
        })
    }
}
