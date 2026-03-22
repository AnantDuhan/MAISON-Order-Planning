exports.processPayment = async (req, res, next) => {
    try {
        const mockClientSecret = `mock_secret_${Math.random().toString(36).substring(2, 15)}`;

        res.status(200).json({
            success: true,
            clientSecret: mockClientSecret,
            message: 'Mock Payment Successfully processed'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Mock Payment failed'
        });
    }
};

exports.sendStripeApiKey = async (req, res, next) => {
    res.status(200).json({
        stripeApiKey: 'MOCK_API_KEY_1234567890'
    });
};
