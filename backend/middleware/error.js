module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    // Wrong MongoDB ObjectId
    if (err.name === 'CastError') {
        err.statusCode = 400;
        err.message = `Resource not found. Invalid: ${err.path}`;
    }
    // Mongoose duplicate key
    if (err.code === 11000) {
        err.statusCode = 400;
        err.message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    }
    // Invalid JWT
    if (err.name === 'JsonWebTokenError') {
        err.statusCode = 400;
        err.message = 'JSON Web Token is invalid, Try again!';
    }
    // Expired JWT
    if (err.name === 'TokenExpiredError') {
        err.statusCode = 400;
        err.message = 'JSON Web Token is expired, Try again!';
    }

    // Always respond — previously unmatched errors sent nothing, hanging the request.
    res.status(err.statusCode).json({
        success: false,
        message: err.message,
    });
};
