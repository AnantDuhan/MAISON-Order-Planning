const pino = require('pino');

// Structured logger. In development it pretty-prints; in production it emits
// JSON lines suitable for aggregation (Grafana Loki, Sentry, etc.). Replace
// ad-hoc console.log calls with logger.info / logger.error over time.
const isProd = process.env.NODE_ENV === 'production';

// Under `node --test` each test file reports its results to the runner over
// stdout. Async log lines written to stdout can land mid-report and corrupt it
// ("Unable to deserialize cloned data"), failing a whole file at random. Node
// sets NODE_TEST_CONTEXT in test processes, so stay silent there unless
// LOG_LEVEL asks otherwise.
const isTestRun = Boolean(process.env.NODE_TEST_CONTEXT);

const logger = pino({
    level: process.env.LOG_LEVEL || (isTestRun ? 'silent' : isProd ? 'info' : 'debug'),
    transport: isProd || isTestRun
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } },
    redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
        remove: true,
    },
});

module.exports = logger;
