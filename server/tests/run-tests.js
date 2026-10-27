/* eslint-disable no-console */
/**
 * Test runner: points the API at a dedicated test database, applies migrations, then runs Jest.
 *
 *   TEST_DATABASE_URL=postgresql://postgres:pass@localhost:5432/kisanvani_test npm test
 *
 * If TEST_DATABASE_URL is not set, the database name in DATABASE_URL gets a "_test" suffix.
 * The test database is wiped between test files — never point it at real data.
 * Set SKIP_MIGRATE=1 if the test database schema is already up to date.
 */
require('dotenv').config();
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const deriveTestUrl = (url) => {
  if (!url) return null;
  const u = new URL(url);
  const db = u.pathname.replace(/^\//, '');
  u.pathname = `/${db.endsWith('_test') ? db : `${db}_test`}`;
  return u.toString();
};

const testUrl = process.env.TEST_DATABASE_URL || deriveTestUrl(process.env.DATABASE_URL);
if (!testUrl) {
  console.error('Set TEST_DATABASE_URL (or DATABASE_URL) before running tests.');
  process.exit(1);
}
if (!new URL(testUrl).pathname.endsWith('_test')) {
  console.error(`Refusing to run tests against "${new URL(testUrl).pathname}" — the test database name must end with "_test".`);
  process.exit(1);
}

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testUrl,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'test_access_secret_value',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_value',
  LOG_TO_FILE: 'false',
  TRACKING_MIN_INTERVAL_SEC: '2',
};

const root = path.join(__dirname, '..');
const bin = (name) => path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);

if (process.env.SKIP_MIGRATE !== '1') {
  console.log('Applying migrations to the test database…');
  const m = spawnSync(bin('prisma'), ['migrate', 'deploy'], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (m.status !== 0) {
    console.error('Could not migrate the test database. Create it first, e.g.:  CREATE DATABASE kisanvani_test;');
    process.exit(m.status || 1);
  }
}

const r = spawnSync(bin('jest'), ['--runInBand', '--forceExit', ...process.argv.slice(2)], { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
