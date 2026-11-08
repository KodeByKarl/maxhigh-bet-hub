const fs = require('node:fs');
const path = require('node:path');
const release = path.resolve(__dirname, '../..');
const root = path.resolve(release, '../..');
if (process.platform !== 'linux' || root !== '/var/www/maxhigh/staging') throw Error('Wrong preview target');
process.loadEnvFile(path.join(root, '.env.preview'));
const manifest = JSON.parse(fs.readFileSync(path.join(release, 'release-validation.json')));
module.exports = { apps: [{
  name: 'maxhigh-staging-preview', cwd: root, script: path.join(__dirname, 'run.mjs'),
  interpreter: process.execPath, instances: 1, exec_mode: 'fork', wait_ready: true,
  listen_timeout: 30000, kill_timeout: 45000, shutdown_with_message: true,
  node_args: ['--max-old-space-size=1024'], max_memory_restart: '1536M',
  min_uptime: '30s', max_restarts: 5, exp_backoff_restart_delay: 1000,
  env: { NODE_ENV: 'production', STAGING_READ_ONLY: '1',
    HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1', PORT: '18080', NITRO_PORT: '18080',
    MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '3306', MYSQL_DATABASE: process.env.MYSQL_DATABASE,
    MYSQL_USER: process.env.MYSQL_USER, MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
    DOTENV_CONFIG_PATH: path.join(root, '.env.preview'), OPERATION_COMPRESSION: '0',
    RELEASE_SHA: manifest.sha, DB_POOL_LIMIT: '6', DB_POOL_QUEUE_LIMIT: '30', DB_POOL_MAX_IDLE: '3',
    APP_MAX_ACTIVE_REQUESTS: '64', APP_DRAIN_TIMEOUT_MS: '30000', SERVER_SHUTDOWN_TIMEOUT: '35',
  },
  out_file: path.join(root, 'logs/preview-out.log'), error_file: path.join(root, 'logs/preview-error.log'),
  merge_logs: true, time: true,
}] };
