const app = require('./app');
// const cronJob = require('./cronJob');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Handling Uncaught Exceptions
// process.on('uncaughtException', (err) => {
//     console.log(`Error: ${err}`);
//     console.log(`Shutting down the server due to Uncaught Exceptions`);
//     process.exit(1);
// })

// config
dotenv.config({ path: './backend/config/config.env' });

//connecting to database
connectDB();

const server = app.listen(process.env.PORT, () => {
    console.log(`Server is working on http://localhost:${process.env.PORT}`)
})

// cronJob.start();

// Unhandeled Promise Rejection
// process.on("unhandledRejection", err => {
//     console.log(`Error: ${err.message}`);
//     console.log(`Shutting down the server due to Unhandled Promise Rejection`);
//     server.close(() => {
//         process.exit(1);
//     });
// });
