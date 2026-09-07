const app = require('./app');
// const cronJob = require('./cronJob');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const http = require('http');
const { Server } = require('socket.io');
const redisClient = require('./config/redisClientUpstash');
const { warmUpEmailTransport } = require('./utils/sendEmail');
const runWeeklyNewsletter = require('./newsletterJob');
const runWishlistReminders = require('./wishlistJob');

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

io.on('connection', socket => {
    // Generic rooms — order status uses room `order:<orderId>`; future
    // per-entity channels can reuse joinRoom/leaveRoom.
    socket.on('joinRoom', room => room && socket.join(room));
    socket.on('leaveRoom', room => room && socket.leave(room));

    // Back-compat with the product page, which joins a room named by productId.
    socket.on('joinProductRoom', productId => productId && socket.join(productId));
    socket.on('leaveProductRoom', productId => productId && socket.leave(productId));
});

app.set('socketio', io);
app.set('redisClient', redisClient);

//connecting to database
connectDB();

// Open the SMTP pool at boot so the first user-facing email is fast too.
warmUpEmailTransport();

const server = createServer.listen(process.env.PORT || 8080, () => {
    console.log(`✅ Server is working on http://localhost:${process.env.PORT || 8080}`)
})

// In-process schedulers. Off by default: production drives these via the
// secret-protected /api/v1/jobs/* endpoints (see routes/jobs.js) using an
// external scheduler, which is reliable on hosts that sleep idle instances.
// Set ENABLE_IN_PROCESS_CRON=true for a single always-on instance instead.
if (process.env.ENABLE_IN_PROCESS_CRON === 'true') {
    // Check daily; each subscriber is eligible only once every seven days.
    setInterval(() => runWeeklyNewsletter().catch(error => console.error('Newsletter job failed:', error.message)), 24 * 60 * 60 * 1000);

    // Daily wishlist reminders for users with saved items.
    setInterval(() => runWishlistReminders().catch(error => console.error('Wishlist job failed:', error.message)), 24 * 60 * 60 * 1000);

    console.log('🗓️  In-process schedulers enabled (newsletter + wishlist)');
}

// Unhandeled Promise Rejection
// process.on("unhandledRejection", err => {
//     console.log(`Error: ${err.message}`);
//     console.log(`Shutting down the server due to Unhandled Promise Rejection`);
//     server.close(() => {
//         process.exit(1);
//     });
// });
