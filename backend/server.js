const path = require('path');
// Load env first, from a path relative to this file (not the working dir).
require('dotenv').config({ path: path.join(__dirname, 'config/config.env'), quiet: true });

const app = require('./app');
const { isAllowedOrigin } = require('./app');
const connectDB = require('./config/database');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const redisClient = require('./config/redisClientUpstash');
const { warmUpEmailTransport } = require('./utils/sendEmail');
const runWeeklyNewsletter = require('./newsletterJob');
const runWishlistReminders = require('./wishlistJob');
const { resolveSession } = require('./middleware/auth');
const Order = require('./models/order');
const Product = require('./models/product');

// Handling Uncaught Exceptions
// process.on('uncaughtException', (err) => {
//     console.log(`Error: ${err}`);
//     console.log(`Shutting down the server due to Uncaught Exceptions`);
//     process.exit(1);
// })

const createServer = http.createServer(app);
const io = new Server(createServer, {
    cors: {
        origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
        credentials: true,
    }
});

// Fan Socket.io events across instances via Redis pub/sub. Without this, an
// event emitted on one instance never reaches clients connected to another.
// Falls back to the in-memory adapter locally when REDIS_URL is unset.
async function attachRedisAdapter(io) {
    if (!process.env.REDIS_UPSTASH_URL) {
        console.info('Socket.io: single-instance mode (no REDIS_UPSTASH_URL)');
        return;
    }
    const pubClient = createClient({ url: process.env.REDIS_UPSTASH_URL });
    const subClient = pubClient.duplicate();
    pubClient.on('error', e => console.error('Socket pub error:', e.message));
    subClient.on('error', e => console.error('Socket sub error:', e.message));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.info('Socket.io: Redis adapter attached (multi-instance ready)');
}
attachRedisAdapter(io).catch(err => console.error('Redis adapter setup failed:', err.message));

const readCookie = (header, name) => {
    for (const part of String(header || '').split(';')) {
        const [key, ...rest] = part.trim().split('=');
        if (key === name) return decodeURIComponent(rest.join('='));
    }
    return null;
};

// Identify the socket's user from the same httpOnly session cookie the API
// uses. Anonymous sockets are allowed, but can only join public product rooms.
io.use(async (socket, next) => {
    try {
        const session = await resolveSession(readCookie(socket.handshake.headers.cookie, 'token'));
        socket.data.user = session ? session.user : null;
        socket.data.mfaVerified = Boolean(session?.decoded?.mfaVerified);
    } catch {
        socket.data.user = null;
    }
    next();
});

// Room access rules:
//   order:<id>  -> only the order's owner or an MFA-verified admin
//   <userId>    -> only that user (wishlist updates)
//   <productId> -> anyone (public reviews / AI summary updates)
const canJoinRoom = async (socket, room) => {
    if (typeof room !== 'string' || !room || room.length > 100) return false;
    const user = socket.data.user;

    if (room.startsWith('order:')) {
        if (!user) return false;
        const isAdmin = user.role === 'admin' && socket.data.mfaVerified;
        if (isAdmin) return true;
        const order = await Order.findById(room.slice('order:'.length)).select('user').lean();
        return Boolean(order) && String(order.user) === String(user._id);
    }

    if (user && room === String(user._id)) return true;

    return Boolean(await Product.exists({ _id: room }));
};

const joinIfAllowed = socket => async room => {
    try {
        if (await canJoinRoom(socket, room)) socket.join(room);
    } catch (err) {
        console.error('Socket join check failed:', err.message);
    }
};

io.on('connection', socket => {
    // Generic rooms — order status uses room `order:<orderId>`.
    socket.on('joinRoom', joinIfAllowed(socket));
    socket.on('leaveRoom', room => typeof room === 'string' && socket.leave(room));

    // Back-compat with the product page, which joins a room named by productId.
    socket.on('joinProductRoom', joinIfAllowed(socket));
    socket.on('leaveProductRoom', productId => typeof productId === 'string' && socket.leave(productId));
});

app.set('socketio', io);
app.set('redisClient', redisClient);

//connecting to database
connectDB();

// Initialise the Elasticsearch products index (non-fatal if ES is unreachable).
const { ensureIndex } = require("./services/searchService");
ensureIndex().catch(err => console.error("Elasticsearch index init failed:", err.message));

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

// Unhandled promise rejection safety net. Log instead of exiting: the app
// fires several best-effort background promises (emails, push, search
// indexing, cache), and one of those failing shouldn't take the API down.
process.on('unhandledRejection', err => {
    console.error('Unhandled Rejection:', err);
});
