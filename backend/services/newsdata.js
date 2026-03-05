const axios = require('axios');

const NEWSDATA_KEY = process.env.NEWSDATA_KEY;
const NEWSDATA_URL = 'https://newsdata.io/api/1/news';

/**
 * Fetch news from NewsData.io API
 * @param {string} query - Search query/topic
 * @param {string} country - Country code (us, gb, sa, etc.)
 * @param {string} language - Language code (en, ar)
 * @param {number} limit - Number of results (max 10 for free tier)
 * @returns {Promise<Array>} Array of articles
 */
async function fetchNews(query, country = null, language = 'en', limit = 10) {
  if (!NEWSDATA_KEY) {
    console.error('❌ NEWSDATA_KEY not configured');
    return [];
  }

  try {
    const params = {
      apikey: NEWSDATA_KEY,
      language: language,
      size: Math.min(limit, 10) // Free tier max is 10
    };

    // Add query if specified
    if (query && query !== 'breaking news') {
      params.q = query;
    }

    // Add country if specified
    if (country) {
      params.country = country;
    }

    console.log(`📰 NewsData.io: Fetching ${query || 'news'} for ${country || 'all'} in ${language}`);

    const response = await axios.get(NEWSDATA_URL, { params });

    if (response.data.status === 'success' && response.data.results) {
      const articles = response.data.results.map(article => ({
        title: article.title,
        description: article.description || article.content,
        url: article.link,
        image: article.image_url,
        source: article.source_id || 'NewsData',
        author: article.creator ? article.creator[0] : null,
        content: article.content,
        publishedAt: article.pubDate,
        region: determineRegion(country),
        language: language,
        country: country,
        category: article.category ? article.category[0] : null
      }));

      console.log(`✅ NewsData.io: Retrieved ${articles.length} articles`);
      return articles;
    }

    return [];
  } catch (error) {
    console.error('❌ NewsData.io error:', error.message);

    if (error.response?.status === 429) {
      console.warn('⚠️  NewsData.io rate limit exceeded (200 requests/day limit reached)');
    } else if (error.response?.status === 401) {
      console.error('❌ NewsData.io authentication failed - check your API key');
    } else if (error.response?.data) {
      console.error('❌ NewsData.io response:', error.response.data);
    }

    return [];
  }
}

/**
 * Determine region from country code
 */
function determineRegion(country) {
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

/**
 * Get rate limit info
 */
function getRateLimitStatus() {
  return {
    tier: 'free',
    dailyLimit: 200,
    requestsPerCall: 10, // Free tier max
    resetTime: 'midnight UTC'
  };
}

module.exports = { fetchNews, getRateLimitStatus };
