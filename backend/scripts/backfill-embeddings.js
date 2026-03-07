/**
 * Backfill embeddings for all existing articles that don't have one yet.
 * Run once: node scripts/backfill-embeddings.js
 *
 * Uses Gemini text-embedding-004 (768 dims). Processes in batches of 10
 * with a small delay to stay within API rate limits.
 */
require('dotenv').config();
const db = require('../config/database');
const llm = require('../services/llm');

const BATCH_SIZE = 10;
const DELAY_MS = 500; // 500ms between batches (~20 req/s max)

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const [countRows] = await db.query('SELECT COUNT(*)::int AS total FROM articles WHERE embedding IS NULL');
  const total = countRows[0].total;
  console.log(`Found ${total} articles without embeddings. Starting backfill...`);

  let processed = 0;
  let failed = 0;

  while (true) {
    const [batch] = await db.query(
      'SELECT id, title, description FROM articles WHERE embedding IS NULL LIMIT ?',
      [BATCH_SIZE]
    );
    if (batch.length === 0) break;

    await Promise.all(batch.map(async (article) => {
      try {
        await llm.embedArticle(article.id, article.title, article.description);
        processed++;
      } catch (e) {
        console.warn(`  Failed id=${article.id}: ${e.message}`);
        failed++;
      }
    }));

    console.log(`  Progress: ${processed}/${total} (${failed} failed)`);
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ${processed} embedded, ${failed} failed.`);
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
