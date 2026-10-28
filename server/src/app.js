const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./config/logger');
const routes = require('./routes');
const { apiLimiter } = require('./middlewares/rateLimit');
const { notFound, errorHandler } = require('./middlewares/error');
const { uploadRoot } = require('./services/storage.service');
const { health } = require('./controllers/health.controller');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // Uploaded images are shown by the client app on another origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || config.clientUrls.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());

if (!config.isTest) {
  app.use(morgan(config.isProd ? 'combined' : 'dev', { stream: { write: (m) => logger.http?.(m.trim()) ?? logger.info(m.trim()) } }));
}

app.use(
  '/uploads',
  express.static(uploadRoot, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  })
);

app.get('/health', health);

app.use('/api/v1', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
