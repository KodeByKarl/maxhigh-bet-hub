import 'dotenv/config';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

assert.equal(process.env.MYSQL_DATABASE, 'maxhigh_demo', 'This bootstrap is limited to maxhigh_demo.');
const connection = await mysql.createConnection({
  host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE, multipleStatements: true,
});
try {
  const [tables] = await connection.query("SHOW TABLES LIKE 'users'");
  if (tables.length) {
    const [rows] = await connection.query('SELECT COUNT(*) AS count FROM users');
    assert.equal(Number(rows[0].count), 0, 'Refusing to bootstrap over existing user data.');
  }
  const schema = fs.readFileSync('scripts/schema.sql', 'utf8').split(/\r?\n/)
    .filter(line => !/^\s*(CREATE DATABASE|USE\s)/i.test(line)).join('\n');
  assert.doesNotMatch(schema, /\b(DROP|TRUNCATE)\s+(TABLE|DATABASE)/i);
  await connection.query(schema);
  await connection.query('ALTER TABLE users ALTER COLUMN failed_attempts SET DEFAULT 0');
  console.log('Created the demo tables from the checked-in schema snapshot.');
} finally { await connection.end(); }
