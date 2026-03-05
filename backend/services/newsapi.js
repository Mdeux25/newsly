const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 5 minutes to avoid rate limits
const cache = new NodeCache({ stdTTL: 300 });

const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const NEWSAPI_URL = 'https://newsapi.org/v2';

// Region-based source mapping
const SOURCES_BY_REGION = {
  us: 'cnn,fox-news,the-washington-post,the-wall-street-journal',
  eu: 'bbc-news,reuters,the-guardian-uk',
  middleeast: 'al-jazeera-english'
};

// Arabic sources (will use country filter instead)
const ARABIC_COUNTRIES = ['sa', 'ae', 'eg'];

async function fetchNews(topic, region = 'all', pageSize = 20, language = 'en', countries = null) {
  const cacheKey = `newsapi_${topic}_${region}_${pageSize}_${language}_${countries || 'all'}`;

  // Check cache first (but only if it has results)
  const cached = cache.get(cacheKey);
  if (cached && cached.length > 0) {
    console.log('Returning cached NewsAPI results');
    return cached;
  }

  try {
    let sources = '';
    // Only use region-based sources if no countries are selected (user's requirement #1)
    if (region !== 'all' && SOURCES_BY_REGION[region] && language === 'en' && !countries) {
      sources = SOURCES_BY_REGION[region];
    }

    // If specific countries are selected, use top-headlines endpoint (supports country filter)
    // Otherwise use everything endpoint
    const endpoint = (countries && countries.length > 0) ? 'top-headlines' : 'everything';

    const params = {
      apiKey: NEWSAPI_KEY,
      pageSize: pageSize
    };

    if (endpoint === 'top-headlines' && countries) {
      // top-headlines endpoint: supports country but only one at a time
      // NewsAPI limitation: top-headlines doesn't support language filter
      // So we fetch by country and note the language preference
      const countryCode = countries.split(',')[0]; // Take first country if multiple selected
      params.country = countryCode;

      // For top-headlines, query is optional - if topic is too specific, get general headlines
      if (topic && topic !== 'breaking news') {
        params.q = topic;
      }

      console.log(`Fetching top headlines for country: ${countryCode}, language: ${language}, topic: ${topic || 'general'}`);
    } else {
      // everything endpoint: supports sources and language but not country
      params.q = topic;
      params.language = language;
      params.sortBy = 'publishedAt';

      if (sources) {
        params.sources = sources;
      }
    }

    const response = await axios.get(`${NEWSAPI_URL}/${endpoint}`, { params });

    if (response.data.status === 'ok') {
      const articles = response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        image: article.urlToImage,
        source: article.source.name,
        publishedAt: article.publishedAt,
        region: determineRegion(article.source.name),
        // For country-based queries, detect language from source or default to user's preference
        language: endpoint === 'top-headlines' ? detectLanguageFromSource(article.source.name, language) : language,
        country: endpoint === 'top-headlines' ? params.country : null
      }));

      // Only cache if we have results
      if (articles.length > 0) {
        cache.set(cacheKey, articles);
      }
      return articles;
    }

    return [];
  } catch (error) {
    console.error('NewsAPI error:', error.message);
    if (error.response?.status === 429) {
      console.warn('⚠️  NewsAPI rate limit exceeded (100 requests/day limit reached)');
    } else if (error.response?.status === 401) {
      console.error('❌ NewsAPI authentication failed - check your API key');
    }
    return [];
  }
}

// Detect article language from source name
// For example: Arab News (Saudi Arabia) publishes in English, Al Arabiya in Arabic
function detectLanguageFromSource(sourceName, defaultLang = 'en') {
  const source = sourceName.toLowerCase();

  // English sources from Arab countries
  const englishSources = ['arab news', 'saudi gazette', 'khaleej times', 'gulf news', 'the national'];
  if (englishSources.some(s => source.includes(s))) {
    return 'en';
  }

  // Arabic sources
  const arabicSources = ['الجزيرة', 'العربية', 'al jazeera', 'al arabiya', 'alarabiya'];
  if (arabicSources.some(s => source.includes(s))) {
    return 'ar';
  }

  return defaultLang;
}

// Add endpoint to check rate limit status
function getRateLimitStatus() {
  // NewsAPI free tier: 100 requests/day
  return {
    tier: 'free',
    dailyLimit: 100,
    resetTime: 'midnight UTC'
  };
}

function determineRegion(sourceName) {
  const source = sourceName.toLowerCase();
  if (source.includes('cnn') || source.includes('fox') || source.includes('washington') || source.includes('wall street')) {
    return 'us';
  }
  if (source.includes('bbc') || source.includes('reuters') || source.includes('guardian')) {
    return 'eu';
  }
  if (source.includes('jazeera') || source.includes('arabiya') || source.includes('haaretz')) {
    return 'middleeast';
  }
  return 'other';
}

module.exports = { fetchNews, getRateLimitStatus, detectLanguageFromSource };
