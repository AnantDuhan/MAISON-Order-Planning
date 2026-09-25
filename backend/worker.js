const { Worker } = require('bullmq');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, 'config/config.env'), quiet: true });

const connection = require('./config/queueConnection');
const connectDB = require('./config/database');
const logger = require('./config/logger');
const runWeeklyNewsletter = require('./newsletterJob');
const runWishlistReminders = require('./wishlistJob');

// The worker needs its own DB connection — it runs as a separate process.
connectDB();

const handlers = {
    newsletter: runWeeklyNewsletter,
    wishlist: runWishlistReminders,
};

const worker = new Worker('email', async job => {
    const handler = handlers[job.name];
    if (!handler) throw new Error(`No handler registered for job: ${job.name}`);
    await handler();
}, { connection, concurrency: 2 });

worker.on('completed', job => logger.info({ job: job.name }, 'job completed'));
worker.on('failed', (job, err) => logger.error({ job: job?.name, err: err.message }, 'job failed'));

const shutdown = async signal => {
    logger.info({ signal }, 'worker shutting down');
    await worker.close();
    await connection.quit();
    process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info('email worker started');
