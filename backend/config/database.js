const mongoose = require('mongoose');
const dotenv = require("dotenv");

const connectDB = () => {
    mongoose
        .connect(process.env.DB_HOSTED_URI)
        .then(data => {
            console.log(
                `🚀 MongoDB connected with server: ${data.connection.host}`
            );
        });
}

module.exports = connectDB;
