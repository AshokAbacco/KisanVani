const path = require('node:path');
const fs = require('node:fs');
const winston = require('winston');
const config = require('./index');

const transports = [
  new winston.transports.Console({
    silent: config.isTest,
    format: config.isProd
      ? winston.format.json()
      : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
];

if (config.log.toFile) {
  const dir = path.join(__dirname, '..', '..', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  transports.push(
    new winston.transports.File({ filename: path.join(dir, 'error.log'), level: 'error', maxsize: 5_000_000, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(dir, 'combined.log'), maxsize: 10_000_000, maxFiles: 5 })
  );
}

const logger = winston.createLogger({
  level: config.log.level,
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
  transports,
});

module.exports = logger;
