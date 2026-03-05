// Production migration script — called by start.sh on Render startup
// Uses the same pg-based database config as the rest of the app
const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USER || 'news_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'news_aggregator',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🔄 Running PostgreSQL migrations...');
  const client = new Pool(poolConfig);

  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`   Running: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`   ✓ ${file} done`);
    }

    const { rows } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    console.log(`✅ Migration complete — tables: ${rows.map(r => r.tablename).join(', ')}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
