const cron = require('node-cron');
const { fetchAllNews, cleanupOldArticles, cleanupOldLogs } = require('./news-fetcher');
const ApiQuota = require('../models/ApiQuota');
const Article = require('../models/Article');
const db = require('../config/database');

let isInitialized = false;

/**
 * Update trending locations table for map visualization
 * Extracts trending topics by country with recency scores
 */
async function updateTrendingLocations() {
  console.log('📊 Updating trending locations...');

  try {
    // Get recent articles (last 24 hours)
    const articles = await Article.findRecent({
      minDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }, 500);

    if (articles.length === 0) {
      console.log('⚠️  No recent articles found for trending analysis');
      return;
    }

    // Extract trending topics with LLM
    const llm = require('../services/llm');
    const trending = await llm.extractTrendingInsights(articles, 20);

    if (trending.length === 0) {
      console.log('⚠️  No trending topics extracted');
      return;
    }

    // Clear old trending locations
    await db.query('TRUNCATE TABLE trending_locations');

    // Insert new trending topics by country
    let insertCount = 0;
    for (const item of trending) {
      if (!item.countries || item.countries.length === 0) continue;

      for (const country of item.countries) {
        try {
          await db.query(
            'INSERT INTO trending_locations (country_code, topic, article_count, recency_score) VALUES (?, ?, ?, ?)',
            [country, item.topic, item.count, item.score]
          );
          insertCount++;
        } catch (err) {
          console.warn(`Failed to insert trending location: ${err.message}`);
        }
      }
    }

    console.log(`✅ Updated ${insertCount} trending locations from ${trending.length} topics`);

  } catch (error) {
    console.error('Error updating trending locations:', error.message);
  }
}

/**
 * Initialize and start all cron jobs
 */
function startScheduler() {
  if (isInitialized) {
    console.log('⚠️  Scheduler already initialized');
    return;
  }

  console.log('🚀 Starting news aggregator scheduler...\n');

  // Job 1: Fetch news every 15 minutes
  // Cron: */15 * * * * (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    console.log('\n⏰ Cron: News fetch triggered (every 15 minutes)');
    try {
      await fetchAllNews();
    } catch (error) {
      console.error('❌ News fetch failed:', error.message);
    }
  });

  console.log('✅ Scheduled: News fetch (every 15 minutes)');

  // Job 2: Cleanup old articles daily at 2 AM
  // Cron: 0 2 * * * (2:00 AM every day)
  cron.schedule('0 2 * * *', async () => {
    console.log('\n⏰ Cron: Article cleanup triggered (daily at 2 AM)');
    try {
      await cleanupOldArticles();
      await cleanupOldLogs();
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  });

  console.log('✅ Scheduled: Article cleanup (daily at 2 AM)');

  // Job 3: Reset API quotas daily at midnight UTC
  // Cron: 0 0 * * * (midnight every day)
  cron.schedule('0 0 * * *', async () => {
    console.log('\n⏰ Cron: API quota reset triggered (midnight UTC)');
    try {
      await ApiQuota.resetAllQuotas();
      console.log('✅ All API quotas reset successfully');
    } catch (error) {
      console.error('❌ Quota reset failed:', error.message);
    }
  });

  console.log('✅ Scheduled: API quota reset (midnight UTC)');

  // Job 4: Status report every hour
  // Cron: 0 * * * * (every hour)
  cron.schedule('0 * * * *', async () => {
    try {
      const Article = require('../models/Article');
      const stats = await Article.getStats();
      const quotas = await ApiQuota.getAllQuotas();

      console.log('\n📊 Hourly Status Report:');
      console.log(`  Total articles: ${stats.total}`);
      console.log(`  Articles today: ${stats.today}`);
      console.log('  API Quotas:');
      quotas.forEach(q => {
        console.log(`    ${q.apiName}: ${q.remaining}/${q.dailyLimit} remaining`);
      });
      console.log('');
    } catch (error) {
      console.error('❌ Status report failed:', error.message);
    }
  });

  console.log('✅ Scheduled: Status report (every hour)');

  // Job 5: Update trending locations every 15 minutes
  // Cron: */15 * * * * (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    console.log('\n⏰ Cron: Trending locations update triggered (every 15 minutes)');
    try {
      await updateTrendingLocations();
    } catch (error) {
      console.error('❌ Trending locations update failed:', error.message);
    }
  });

  console.log('✅ Scheduled: Trending locations update (every 15 minutes)');

  // Job 6: Cleanup expired LLM cache daily at 3 AM
  // Cron: 0 3 * * * (3:00 AM every day)
  cron.schedule('0 3 * * *', async () => {
    console.log('\n⏰ Cron: LLM cache cleanup triggered (daily at 3 AM)');
    try {
      const LLMCache = require('../models/LLMCache');
      const deletedCount = await LLMCache.cleanupExpired();
      console.log(`✅ Cleaned up ${deletedCount} expired LLM cache entries`);
    } catch (error) {
      console.error('❌ LLM cache cleanup failed:', error.message);
    }
  });

  console.log('✅ Scheduled: LLM cache cleanup (daily at 3 AM)');

  // Run initial fetch after 10 seconds (give server time to fully start)
  setTimeout(async () => {
    console.log('\n🎬 Running initial news fetch...');
    try {
      await fetchAllNews();
    } catch (error) {
      console.error('❌ Initial fetch failed:', error.message);
    }
  }, 10000);

  console.log('✅ Scheduled: Initial fetch (in 10 seconds)\n');

  isInitialized = true;
  console.log('🎉 Scheduler initialized successfully!\n');
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
function stopScheduler() {
  if (!isInitialized) {
    return;
  }

  console.log('⏹️  Stopping scheduler...');
  // Note: node-cron doesn't provide a way to stop all tasks at once
  // Tasks will naturally stop when process exits
  isInitialized = false;
  console.log('✅ Scheduler stopped');
}

module.exports = {
  startScheduler,
  stopScheduler
};
