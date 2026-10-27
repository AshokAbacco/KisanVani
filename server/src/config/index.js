require('dotenv').config();
const { z } = require('zod');

const bool = (def) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : v === true || v === 'true' || v === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  COOKIE_SECURE: bool(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  PUBLIC_SERVER_URL: z.string().default('http://localhost:5000'),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('KisanVani <no-reply@kisanvani.local>'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('ap-south-1'),
  S3_ENDPOINT: z.string().optional().default(''),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_PUBLIC_BASE_URL: z.string().optional().default(''),

  TRACKING_MIN_INTERVAL_SEC: z.coerce.number().min(1).default(5),
  TRACKING_STALE_AFTER_SEC: z.coerce.number().min(10).default(120),

  LOG_LEVEL: z.string().default('info'),
  LOG_TO_FILE: bool(true),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const weak = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].filter(
    (k) => env[k].length < 32 || /replace_me|dev_only/i.test(env[k])
  );
  if (weak.length) {
    // eslint-disable-next-line no-console
    console.error(`Refusing to start: ${weak.join(', ')} must be strong random values (>= 32 chars) in production.`);
    process.exit(1);
  }
}

const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  clientUrls: env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean),
  publicServerUrl: env.PUBLIC_SERVER_URL.replace(/\/$/, ''),
  jwt: {
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
  },
  bcryptRounds: env.NODE_ENV === 'test' ? 4 : env.BCRYPT_ROUNDS,
  cookieSecure: env.COOKIE_SECURE || env.COOKIE_SAME_SITE === 'none',
  cookieSameSite: env.COOKIE_SAME_SITE,
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.SMTP_FROM,
    enabled: Boolean(env.SMTP_HOST),
  },
  storage: {
    driver: env.STORAGE_DRIVER,
    uploadDir: env.UPLOAD_DIR,
    maxBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),
    s3: {
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      publicBaseUrl: env.S3_PUBLIC_BASE_URL,
    },
  },
  tracking: {
    minIntervalSec: env.TRACKING_MIN_INTERVAL_SEC,
    staleAfterSec: env.TRACKING_STALE_AFTER_SEC,
  },
  log: { level: env.LOG_LEVEL, toFile: env.LOG_TO_FILE && env.NODE_ENV !== 'test' },
};

module.exports = config;
