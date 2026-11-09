import fs from 'node:fs';
import crypto from 'node:crypto';
import { parse } from 'dotenv';

const file = '.env';
const previous = fs.readFileSync(file, 'utf8');
const values = parse(previous);
if (values.MYSQL_DATABASE === 'maxhigh_demo' && values.DEMO_DB_ROOT_PASSWORD) {
  console.log('Local demo database configuration already present.');
  process.exit(0);
}
fs.mkdirSync('output/database-demo', { recursive: true });
if (!fs.existsSync('output/database-demo/.env.previous')) {
  fs.writeFileSync('output/database-demo/.env.previous', previous);
}
const updates = {
  MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '3306', MYSQL_USER: 'maxhigh_demo',
  MYSQL_PASSWORD: crypto.randomBytes(24).toString('hex'), MYSQL_DATABASE: 'maxhigh_demo',
  DEMO_DB_ROOT_PASSWORD: crypto.randomBytes(32).toString('hex'),
};
const retained = previous.split(/\r?\n/).filter(line => !/^\s*(MYSQL_HOST|MYSQL_PORT|MYSQL_USER|MYSQL_PASSWORD|MYSQL_DATABASE|DATABASE_URL|DEMO_DB_ROOT_PASSWORD)\s*=/.test(line));
fs.writeFileSync(file, retained.join('\n').trimEnd() + '\n\n# Local Docker demo database\n' + Object.entries(updates).map(([key, value]) => `${key}=${value}`).join('\n') + '\n');
console.log('Configured isolated local demo database. Previous .env retained in an ignored backup.');
