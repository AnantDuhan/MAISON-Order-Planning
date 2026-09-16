const pino = require('pino');

// Structured logger. In development it pretty-prints; in production it emits
// JSON lines suitable for aggregation (Grafana Loki, Sentry, etc.). Replace
// ad-hoc console.log calls with logger.info / logger.error over time.
const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
    level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
    transport: isProd
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
        remove: true,
    },
});

module.exports = logger;
