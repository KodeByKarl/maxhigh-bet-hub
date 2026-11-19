const path = require('node:path');
const root = '/var/www/maxhigh/production';
process.loadEnvFile(path.join(root, '.env.production'));
module.exports = { apps: [{
  name: 'maxhigh-production', cwd: root, script: path.join(root, 'run.mjs'), interpreter: process.execPath,
  instances: 1, exec_mode: 'fork', wait_ready: true, listen_timeout: 40000, kill_timeout: 45000,
  shutdown_with_message: true, node_args: ['--max-old-space-size=1024'], max_memory_restart: '1536M',
  min_uptime: '30s', max_restarts: 5, exp_backoff_restart_delay: 1000,
  env: {
    NODE_ENV: 'production', PUBLIC_URL: 'https://maxhigh.online',
    MYSQL_HOST: process.env.MYSQL_HOST, MYSQL_PORT: process.env.MYSQL_PORT,
    MYSQL_DATABASE: process.env.MYSQL_DATABASE, MYSQL_USER: process.env.MYSQL_USER,
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
    DB_POOL_LIMIT: '6', DB_POOL_QUEUE_LIMIT: '30', DB_POOL_MAX_IDLE: '3',
    APP_MAX_ACTIVE_REQUESTS: '64', APP_DRAIN_TIMEOUT_MS: '30000', SERVER_SHUTDOWN_TIMEOUT: '35',
  },
  out_file: path.join(root, 'logs/production-out.log'), error_file: path.join(root, 'logs/production-error.log'),
  merge_logs: true, time: true,
}] };
