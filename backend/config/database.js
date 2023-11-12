const mongoose = require('mongoose');
const dotenv = require("dotenv");

const connectDB = () => {
    mongoose
        .connect('mongodb://localhost:27017/e-commerce', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        .then(data => {
            console.log(
                `MongoDB connected with server: ${data.connection.host}`
            );
        });
}

module.exports = connectDB;
