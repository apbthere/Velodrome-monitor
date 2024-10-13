// db.js
//import { Pool } from 'pg';
const { Pool } = require('pg');

// Load configuration
const config = require('./config.json');

const pool = new Pool({
  user: config.db.user,
  host: config.db.host,
  database: config.db.database,
  password: config.db.password,
  port: config.db.port,
});

module.exports = pool;
