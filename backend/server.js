const app = require('./app');
// const cronJob = require('./cronJob');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
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

// Fan Socket.io events across instances via Redis pub/sub. Without this, an
// event emitted on one instance never reaches clients connected to another.
// Falls back to the in-memory adapter locally when REDIS_URL is unset.
async function attachRedisAdapter(io) {
    if (!process.env.REDIS_URL) {
        console.info('Socket.io: single-instance mode (no REDIS_URL)');
        return;
    }
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    pubClient.on('error', e => console.error('Socket pub error:', e.message));
    subClient.on('error', e => console.error('Socket sub error:', e.message));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.info('Socket.io: Redis adapter attached (multi-instance ready)');
}
attachRedisAdapter(io).catch(err => console.error('Redis adapter setup failed:', err.message));

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

// Graceful shutdown: stop accepting new connections, let in-flight requests
// finish, close sockets, then exit. Hosts (Render, Fly, K8s) send SIGTERM
// before replacing an instance — without this, live requests get dropped.
const gracefulShutdown = signal => {
    console.log(`\n${signal} received — shutting down gracefully`);
    io.close();
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
    // Force-exit if connections don't drain in time.
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000).unref();
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejection safety net.
process.on('unhandledRejection', err => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
});
