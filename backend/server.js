const app = require('./app');
// const cronJob = require('./cronJob');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const http = require('http');
const { Server } = require('socket.io');
const redisClient = require('./config/redisClient');

// Handling Uncaught Exceptions
// process.on('uncaughtException', (err) => {
//     console.log(`Error: ${err}`);
//     console.log(`Shutting down the server due to Uncaught Exceptions`);
//     process.exit(1);
// })

// config
dotenv.config({ path: './backend/config/config.env' });

const createServer = http.createServer(app);
const io = new Server(createServer, {
    cors: {
        origin: "http://localhost:3000",
    }
});

app.set('socketio', io);
app.set('redisClient', redisClient);

//connecting to database
connectDB();

const server = app.listen(process.env.PORT, () => {
    console.log(`✅ Server is working on http://localhost:${process.env.PORT}`)
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
