module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    // Wrong MongoDB Id Error
    if (err.name === "CaseError") {
        res.status(400).json({
            message: `Resource not found. Invalid: ${err.path}`
        });
    }

    // mongoose duplicate key error
    if (err.code === 11000) {
        res.status(400).json({
            message: `Duplicate ${object.keys(err.keyValue)} entered`
        });
    }

    // wrong JWT error
    if (err.name === "JsonWebTokenError") {
        res.status(400).json({
            message: `JSON Web Token is invalid, Try again!`
        });
    }

    // JWT expire error
    if (err.name === 'TokenExpiredError') {
        res.status(400).json({
            message: `JSON Web Token is invalid, Try again!`
        });
    }
};
