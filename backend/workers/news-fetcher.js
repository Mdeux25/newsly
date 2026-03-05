const Article = require('../models/Article');
const FetchLog = require('../models/FetchLog');
const ApiQuota = require('../models/ApiQuota');
const { fetchNews: fetchFromNewsAPI } = require('../services/newsapi');
const { fetchNews: fetchFromNewsData } = require('../services/newsdata');

// Configuration
const FETCH_TOPICS = [
  { topic: 'breaking news', priority: 1 },
  { topic: 'technology', priority: 2 },
  { topic: 'politics', priority: 2 },
  { topic: 'business', priority: 3 },
  { topic: 'health', priority: 3 },
  { topic: 'science', priority: 3 },
  { topic: 'sports', priority: 4 }
];

const FETCH_COUNTRIES = ['us', 'gb', 'sa', 'ae', 'eg', 'in', 'cn', 'jp', 'de', 'fr'];
const FETCH_LANGUAGES = ['en', 'ar'];

// Determine region from country
function getRegion(country) {
  const regionMap = {
    us: 'us',
    gb: 'eu',
    de: 'eu',
    fr: 'eu',
    sa: 'middleeast',
    ae: 'middleeast',
    eg: 'middleeast',
    in: 'asia',
    cn: 'asia',
    jp: 'asia'
  };
  return regionMap[country] || 'other';
}

// Determine category from topic
function getCategory(topic) {
  const categoryMap = {
    'breaking news': 'breaking',
    'technology': 'technology',
    'politics': 'politics',
    'business': 'business',
    'health': 'health',
    'science': 'science',
    'sports': 'sports'
  };
  return categoryMap[topic.toLowerCase()] || 'general';
}

/**
 * Fetch news for a specific topic and country from BOTH APIs
 */
async function fetchNewsForTopic(topic, country, language = 'en') {
  let allArticles = [];
  let totalFetched = 0;
  let totalStored = 0;

  // Try NewsData.io first (200 requests/day)
  const newsDataResult = await fetchFromSingleAPI('NewsData', topic, country, language);
  if (newsDataResult.articles.length > 0) {
    allArticles = allArticles.concat(newsDataResult.articles);
    totalFetched += newsDataResult.fetched;
    totalStored += newsDataResult.stored;
  }

  // Also try NewsAPI (100 requests/day) for more coverage
  const newsAPIResult = await fetchFromSingleAPI('NewsAPI', topic, country, language);
  if (newsAPIResult.articles.length > 0) {
    allArticles = allArticles.concat(newsAPIResult.articles);
    totalFetched += newsAPIResult.fetched;
    totalStored += newsAPIResult.stored;
  }

  console.log(`✅ Combined: Fetched ${totalFetched} articles, Stored ${totalStored} articles`);

  return { fetched: totalFetched, stored: totalStored };
}

/**
 * Fetch from a single API source
 */
async function fetchFromSingleAPI(apiName, topic, country, language = 'en') {
  const startTime = Date.now();

  try {
    // Check if we have quota available
    const canFetch = await ApiQuota.canMakeRequest(apiName);
    if (!canFetch) {
      console.log(`⚠️  ${apiName} quota exhausted, skipping`);
      await FetchLog.create({
        api_name: apiName,
        endpoint: apiName === 'NewsData' ? '/api/1/news' : '/v2/top-headlines',
        country,
        topic,
        language,
        status: 'rate_limit',
        error_message: 'Daily quota exhausted'
      });
      return { fetched: 0, stored: 0, articles: [] };
    }

    // Fetch from the appropriate API
    console.log(`📰 [${apiName}] Fetching: ${topic} | ${country} | ${language}`);

    let articles = [];
    if (apiName === 'NewsData') {
      articles = await fetchFromNewsData(topic, country, language, 10);
    } else if (apiName === 'NewsAPI') {
      articles = await fetchFromNewsAPI(topic, getRegion(country), 50, language, country);
    }

    // Increment quota usage
    await ApiQuota.incrementUsage(apiName, 1);

    const responseTime = Date.now() - startTime;

    // Store articles in database
    let stored = 0;
    if (articles && articles.length > 0) {
      const articlesWithMetadata = articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        image_url: article.image,
        source: article.source,
        author: article.author || null,
        content: article.content || null,
        published_at: article.publishedAt || new Date(),
        country: country,
        language: language,
        region: getRegion(country),
        category: getCategory(topic)
      }));

      const result = await Article.bulkCreate(articlesWithMetadata);
      stored = result.inserted;

      console.log(`✅ [${apiName}] Stored ${stored}/${articles.length} articles (${result.skipped} duplicates)`);
    }

    // Log the fetch
    const endpoint = apiName === 'NewsData' ? '/api/1/news' : '/v2/top-headlines';
    await FetchLog.create({
      api_name: apiName,
      endpoint,
      country,
      topic,
      language,
      articles_fetched: articles.length,
      articles_stored: stored,
      status: 'success',
      response_time_ms: responseTime
    });

    return { fetched: articles.length, stored, articles };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    console.error(`❌ [${apiName}] Error fetching ${topic} for ${country}:`, error.message);

    // Log the error
    const endpoint = apiName === 'NewsData' ? '/api/1/news' : '/v2/top-headlines';
    await FetchLog.create({
      api_name: apiName,
      endpoint,
      country,
      topic,
      language,
      status: 'error',
      error_message: error.message,
      response_time_ms: responseTime
    });

    return { fetched: 0, stored: 0, articles: [] };
  }
}

/**
 * Main fetch function - fetches news for all topics and countries
 */
async function fetchAllNews() {
  console.log('\n🔄 ===== Starting News Fetch Cycle =====');
  console.log(`Time: ${new Date().toISOString()}`);

  const overallStart = Date.now();
  let totalFetched = 0;
  let totalStored = 0;

  // Check quota status before starting
  const quotas = await ApiQuota.getAllQuotas();
  console.log('\n📊 API Quota Status:');
  quotas.forEach(quota => {
    console.log(`  ${quota.apiName}: ${quota.remaining}/${quota.dailyLimit} remaining (${quota.percentUsed.toFixed(1)}% used)`);
  });

  // Fetch for each country and topic combination
  // Priority-based: High priority topics first
  const sortedTopics = FETCH_TOPICS.sort((a, b) => a.priority - b.priority);

  for (const { topic } of sortedTopics) {
    // Fetch for English-speaking countries
    for (const country of FETCH_COUNTRIES) {
      const language = ['sa', 'ae', 'eg'].includes(country) ? 'ar' : 'en';

      const result = await fetchNewsForTopic(topic, country, language);
      totalFetched += result.fetched;
      totalStored += result.stored;

      // Small delay to avoid hammering the API
      await sleep(2000);
    }
  }

  const totalTime = ((Date.now() - overallStart) / 1000).toFixed(2);

  console.log('\n✅ ===== Fetch Cycle Complete =====');
  console.log(`Total articles fetched: ${totalFetched}`);
  console.log(`Total articles stored: ${totalStored}`);
  console.log(`Duration: ${totalTime}s`);

  // Get updated quota status
  const updatedQuotas = await ApiQuota.getAllQuotas();
  console.log('\n📊 Updated Quota Status:');
  updatedQuotas.forEach(quota => {
    console.log(`  ${quota.apiName}: ${quota.remaining}/${quota.dailyLimit} remaining`);
  });

  console.log('=====================================\n');

  return { totalFetched, totalStored };
}

/**
 * Cleanup old articles (called daily)
 */
async function cleanupOldArticles() {
  console.log('🧹 Starting article cleanup...');

  const daysToKeep = parseInt(process.env.ARTICLE_RETENTION_DAYS || '7');
  const deleted = await Article.deleteOldArticles(daysToKeep);

  console.log(`🗑️  Deleted ${deleted} articles older than ${daysToKeep} days`);

  return deleted;
}

/**
 * Cleanup old fetch logs (called daily)
 */
async function cleanupOldLogs() {
  console.log('🧹 Starting log cleanup...');

  const deleted = await FetchLog.deleteOldLogs(30); // Keep 30 days of logs

  console.log(`🗑️  Deleted ${deleted} fetch logs older than 30 days`);

  return deleted;
}

/**
 * Get worker status
 */
async function getWorkerStatus() {
  const stats = await Article.getStats();
  const quotas = await ApiQuota.getAllQuotas();
  const recentLogs = await FetchLog.getRecentLogs(1);
  const errorRate = await FetchLog.getErrorRate('NewsAPI', 24);

  return {
    database: stats,
    quotas,
    recentActivity: recentLogs,
    errorRate
  };
}

// Helper function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  fetchAllNews,
  fetchNewsForTopic,
  cleanupOldArticles,
  cleanupOldLogs,
  getWorkerStatus
};
