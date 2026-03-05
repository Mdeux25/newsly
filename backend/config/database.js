const { Pool } = require('pg');
require('dotenv').config();

// Render (and most PaaS) provides DATABASE_URL; fall back to individual DB_* vars for local dev
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // required for Render/Aiven hosted PostgreSQL
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'news_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'news_aggregator',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool({ ...poolConfig, max: 10, idleTimeoutMillis: 30000 });

// Convert MySQL ? placeholders to PostgreSQL $1, $2, ...
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Compatibility wrapper that mimics the mysql2/promise API so models need minimal changes:
//   - SELECT  → returns [rows]
//   - INSERT  → returns [{insertId, affectedRows}]  (auto-appends RETURNING id)
//   - UPDATE/DELETE/TRUNCATE → returns [{affectedRows}]
const db = {
  async query(sql, params = []) {
    const isInsert = /^\s*INSERT/i.test(sql);
    const isWrite = /^\s*(UPDATE|DELETE|TRUNCATE)/i.test(sql);

    let pgSql = convertPlaceholders(sql);

    // Auto-add RETURNING id to plain INSERTs so we can return insertId
    if (isInsert && !/RETURNING/i.test(pgSql)) {
      pgSql += ' RETURNING id';
    }

    const result = await pool.query(pgSql, params);

    if (isInsert) {
      return [{ insertId: result.rows[0]?.id ?? null, affectedRows: result.rowCount }];
    }
    if (isWrite) {
      return [{ affectedRows: result.rowCount }];
    }
    return [result.rows];
  },

  async getConnection() {
    const client = await pool.connect();
    return {
      release: () => client.release(),
      query: (sql, params) => db.query(sql, params)
    };
  }
};

// Test connection on startup
pool.query('SELECT 1')
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('Please ensure PostgreSQL is running and credentials are correct in .env file');
  });

module.exports = db;
