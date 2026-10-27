// Prisma 7 configuration (CommonJS). Connection URLs live here and in the runtime adapter,
// not in schema.prisma.
require('dotenv').config();
const path = require('node:path');
const { defineConfig, env } = require('prisma/config');

module.exports = defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma', 'migrations'),
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
