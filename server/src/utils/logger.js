const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, simple } = format;

// In production (Docker) we emit newline-delimited JSON to stdout so container
// log collectors (docker logs, Loki, CloudWatch, etc.) can parse each entry.
// In development we use a human-readable coloured format.
const isDev = process.env.NODE_ENV !== 'production';

const logger = createLogger({
  level: isDev ? 'debug' : 'info',
  format: isDev
    ? combine(colorize(), simple())
    : combine(timestamp(), errors({ stack: true }), json()),
  transports: [new transports.Console()],
});

// Provides a stream interface for Morgan HTTP logging.
logger.stream = {
  write: (message) => logger.http(message.trimEnd()),
};

module.exports = logger;
