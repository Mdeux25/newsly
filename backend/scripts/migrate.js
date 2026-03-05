#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
  console.log('🚀 Starting PostgreSQL database migration...\n');

  // Step 1: Connect without specifying database to create it if needed
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'news_user',
    password: process.env.DB_PASSWORD,
    database: 'postgres', // connect to default db first
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  const dbName = process.env.DB_NAME || 'news_aggregator';

  try {
    console.log('📡 Connecting to PostgreSQL server...');
    await adminClient.connect();
    console.log('✅ Connected\n');

    // Create database if it doesn't exist
    console.log(`📦 Creating database "${dbName}" if not exists...`);
    const exists = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (exists.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created\n`);
    } else {
      console.log(`✅ Database "${dbName}" already exists\n`);
    }
    await adminClient.end();
  } catch (err) {
    // If connecting to 'postgres' fails (e.g. Render provides only the target DB),
    // skip creation and connect directly to the target database.
    console.log('ℹ️  Skipping DB creation step, connecting directly to target database...');
    try { await adminClient.end(); } catch (_) {}
  }

  // Step 2: Connect to the target database and run migrations
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'news_user',
    password: process.env.DB_PASSWORD,
    database: dbName,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to target database\n');

    // Run all migration files
    console.log('📄 Running migrations...');
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`   Running: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      console.log(`   ✓ ${file} completed`);
    }
    console.log('✅ All migrations complete\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const { rows: tables } = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    const tableNames = tables.map(t => t.tablename);
    console.log('✅ Tables created:');
    tableNames.forEach(t => console.log(`   - ${t}`));
    console.log('');

    // Row counts
    const expected = ['articles', 'fetch_logs', 'api_quotas', 'tweets', 'llm_cache', 'trending_locations'];
    console.log('📊 Row counts:');
    for (const table of expected) {
      if (tableNames.includes(table)) {
        const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
        console.log(`   ${table}: ${rows[0].count} rows`);
      }
    }
    console.log('');

    // Show API quotas
    const { rows: quotas } = await client.query('SELECT * FROM api_quotas ORDER BY api_name');
    console.log('🔑 API Quotas:');
    quotas.forEach(q => console.log(`   ${q.api_name}: ${q.current_usage}/${q.daily_limit} (resets: ${q.reset_time})`));

    console.log('\n✅ ===================================');
    console.log('✅ Migration completed successfully!');
    console.log('✅ ===================================\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
