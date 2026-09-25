module.exports = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';

    // Wrong MongoDB ObjectId
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Resource not found. Invalid: ${err.path}`;
    }
    // Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 409;
        message = `Duplicate ${Object.keys(err.keyValue || {})} entered`;
    }
    if (err.name === 'ValidationError') {
        statusCode = 400;
    }
    // Invalid / expired JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your session is invalid or has expired. Please sign in again.';
    }
    // Upload errors (file too large, too many files, wrong type)
    if (err.name === 'MulterError' || message === 'Invalid file type.') {
        statusCode = 400;
    }
    // Malformed JSON body
    if (err.type === 'entity.parse.failed') {
        statusCode = 400;
        message = 'Malformed JSON body';
    }

    if (statusCode >= 500) {
        console.error(err);
        // Don't leak internals (stack traces, driver messages) to clients.
        message = 'Internal Server Error';
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};
