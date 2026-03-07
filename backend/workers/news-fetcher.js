const Article = require('../models/Article');
const FetchLog = require('../models/FetchLog');
const ApiQuota = require('../models/ApiQuota');
const { fetchNews: fetchFromNewsAPI } = require('../services/newsapi');
const { fetchNews: fetchFromNewsData } = require('../services/newsdata');
const { fetchNews: fetchFromAJRSS } = require('../services/aljazeera');
const { fetchNews: fetchFromRapidAPIArabic } = require('../services/rapidapi-arabic');

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
    let canFetch = true;
    try {
      canFetch = await ApiQuota.canMakeRequest(apiName);
    } catch (err) {
      console.warn(`⚠️  Quota check failed (${err.message}), allowing fetch`);
    }

    if (!canFetch) {
      console.log(`⚠️  ${apiName} quota exhausted, skipping`);
      return { fetched: 0, stored: 0, articles: [] };
    }

    // Fetch from the appropriate API
    console.log(`📰 [${apiName}] Fetching: ${topic} | ${country} | ${language}`);

    let articles = [];
    if (apiName === 'NewsData') {
      articles = await fetchFromNewsData(topic, country, language, 10);
    } else if (apiName === 'NewsAPI') {
      articles = await fetchFromNewsAPI(topic, getRegion(country), 50, language, country);
    } else if (apiName === 'RapidAPIArabic') {
      articles = await fetchFromRapidAPIArabic(topic, 20);
    }

    // Increment quota usage
    try {
      await ApiQuota.incrementUsage(apiName, 1);
    } catch (err) {
      console.warn(`⚠️  Quota increment failed (${err.message}), continuing`);
    }

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
    const endpointMap = {
      NewsData: '/api/1/news',
      NewsAPI: '/v2/top-headlines',
      RapidAPIArabic: '/akhbar'
    };
    const endpoint = endpointMap[apiName] || '/unknown';
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
    const endpointMap = {
      NewsData: '/api/1/news',
      NewsAPI: '/v2/top-headlines',
      RapidAPIArabic: '/akhbar'
    };
    const endpoint = endpointMap[apiName] || '/unknown';
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
  try {
    const quotas = await ApiQuota.getAllQuotas();
    console.log('\n📊 API Quota Status:');
    quotas.forEach(quota => {
      console.log(`  ${quota.apiName}: ${quota.remaining}/${quota.dailyLimit} remaining (${quota.percentUsed.toFixed(1)}% used)`);
    });
  } catch (err) {
    console.warn(`⚠️  Quota status unavailable (${err.message})`);
  }

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

  // Fetch from Al Jazeera RSS (EN + AR) — free, no quota
  console.log('\n📡 Fetching from Al Jazeera RSS...');
  const ajStored = await fetchFromRSSSources();
  totalStored += ajStored;

  // Fetch from RapidAPI Arabic News for top topics
  console.log('\n📡 Fetching from RapidAPI Arabic News...');
  for (const { topic } of sortedTopics.slice(0, 3)) { // top 3 priority topics only
    const result = await fetchFromSingleAPI('RapidAPIArabic', topic, null, 'ar');
    totalFetched += result.fetched;
    totalStored += result.stored;
    await sleep(1000);
  }

  const totalTime = ((Date.now() - overallStart) / 1000).toFixed(2);

  console.log('\n✅ ===== Fetch Cycle Complete =====');
  console.log(`Total articles fetched: ${totalFetched}`);
  console.log(`Total articles stored: ${totalStored}`);
  console.log(`Duration: ${totalTime}s`);

  // Get updated quota status
  try {
    const updatedQuotas = await ApiQuota.getAllQuotas();
    console.log('\n📊 Updated Quota Status:');
    updatedQuotas.forEach(quota => {
    console.log(`  ${quota.apiName}: ${quota.remaining}/${quota.dailyLimit} remaining`);
  });
  } catch (err) {
    console.warn(`⚠️  Updated quota status unavailable (${err.message})`);
  }

  console.log('=====================================\n');

  return { totalFetched, totalStored };
}

/**
 * Fetch from RSS sources (Al Jazeera EN + AR) — called once per cycle
 */
async function fetchFromRSSSources() {
  const startTime = Date.now();
  let totalStored = 0;

  for (const language of ['en', 'ar']) {
    try {
      let articles = await fetchFromAJRSS(language, 30);
      if (!articles.length) continue;

      // English: skip photoless articles (placeholder cards look bad in the grid)
      // Arabic: keep all — Arabic content is scarce and placeholders are acceptable
      if (language === 'en') {
        const before = articles.length;
        articles = articles.filter(a => a.image);
        if (before !== articles.length)
          console.log(`🖼️  [AlJazeeraRSS] Dropped ${before - articles.length} English articles with no image`);
      }

      if (!articles.length) continue;

      const articlesWithMetadata = articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        image_url: article.image,
        source: article.source,
        author: article.author || null,
        content: article.content || null,
        published_at: article.publishedAt || new Date(),
        country: article.country,
        language: article.language,
        region: article.region,
        category: article.category
      }));

      const result = await Article.bulkCreate(articlesWithMetadata);
      totalStored += result.inserted;

      console.log(`✅ [AlJazeeraRSS] Stored ${result.inserted}/${articles.length} articles (${language})`);

      await FetchLog.create({
        api_name: 'AlJazeeraRSS',
        endpoint: `/xml/rss/all.xml`,
        country: 'qa',
        topic: 'general',
        language,
        articles_fetched: articles.length,
        articles_stored: result.inserted,
        status: 'success',
        response_time_ms: Date.now() - startTime
      });
    } catch (error) {
      console.error(`❌ [AlJazeeraRSS] Error (${language}):`, error.message);
      await FetchLog.create({
        api_name: 'AlJazeeraRSS',
        endpoint: `/xml/rss/all.xml`,
        country: 'qa',
        topic: 'general',
        language,
        status: 'error',
        error_message: error.message,
        response_time_ms: Date.now() - startTime
      });
    }
  }

  return totalStored;
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
  let quotas = [];
  try {
    quotas = await ApiQuota.getAllQuotas();
  } catch (err) {
    console.warn(`⚠️  Quota status unavailable (${err.message})`);
  }
  let recentLogs = [];
  try {
    recentLogs = await FetchLog.getRecentLogs(1);
  } catch (err) {
    console.warn(`⚠️  Recent logs unavailable (${err.message})`);
  }
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
