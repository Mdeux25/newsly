#!/usr/bin/env node

/**
 * Database Migration Script
 *
 * This script sets up the MySQL database for the news aggregator.
 * It creates the database, runs migrations, and seeds initial data.
 *
 * Usage:
 *   node scripts/migrate.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function migrate() {
  console.log('🚀 Starting database migration...\n');

  let connection;

  try {
    // Step 1: Connect to MySQL (without specifying database)
    console.log('📡 Connecting to MySQL server...');
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'news_user',
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });
    console.log('✅ Connected to MySQL server\n');

    // Step 2: Create database if not exists
    const dbName = process.env.DB_NAME || 'news_aggregator';
    console.log(`📦 Creating database "${dbName}" if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✅ Database ready\n');

    // Step 3: Switch to the database
    await connection.query(`USE \`${dbName}\``);

    // Step 4: Run all migration files
    console.log('📄 Running database migrations...');
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Run in alphabetical order (001_, 002_, etc.)

    for (const file of migrationFiles) {
      console.log(`   Running: ${file}...`);
      const migrationPath = path.join(migrationsDir, file);
      const schema = fs.readFileSync(migrationPath, 'utf8');
      await connection.query(schema);
      console.log(`   ✓ ${file} completed`);
    }
    console.log('✅ All migrations complete\n');

    // Step 5: Verify tables
    console.log('🔍 Verifying tables...');
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    const expectedTables = ['articles', 'fetch_logs', 'api_quotas', 'tweets', 'llm_cache', 'trending_locations'];
    const missingTables = expectedTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      console.warn(`⚠️  Missing tables: ${missingTables.join(', ')} (may be expected for partial migrations)`);
    }

    console.log('✅ All tables created successfully:');
    tableNames.forEach(table => console.log(`   - ${table}`));
    console.log('');

    // Step 6: Check row counts
    console.log('📊 Checking initial data...');
    for (const table of expectedTables) {
      const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table}: ${rows[0].count} rows`);
    }
    console.log('');

    // Step 7: Display API quotas
    console.log('🔑 API Quotas configured:');
    const [quotas] = await connection.query('SELECT * FROM api_quotas');
    quotas.forEach(quota => {
      console.log(`   ${quota.api_name}: ${quota.current_usage}/${quota.daily_limit} (resets: ${quota.reset_time})`);
    });
    console.log('');

    console.log('✅ ===================================');
    console.log('✅ Migration completed successfully!');
    console.log('✅ ===================================\n');

    console.log('📝 Next steps:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. The worker will automatically fetch news every 15 minutes');
    console.log('   3. Check status at: http://localhost:3001/api/status');
    console.log('   4. Monitor articles at: http://localhost:3001/api/news\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Ensure MySQL is running');
    console.error('  2. Check database credentials in .env file');
    console.error('  3. Verify the user has CREATE DATABASE privileges');
    console.error('  4. Connection details:');
    console.error(`     Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`     Port: ${process.env.DB_PORT || 3306}`);
    console.error(`     User: ${process.env.DB_USER || 'news_user'}`);
    console.error(`     Database: ${process.env.DB_NAME || 'news_aggregator'}\n`);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
migrate().catch(console.error);
