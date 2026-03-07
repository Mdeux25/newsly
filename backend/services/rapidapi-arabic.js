const axios = require('axios');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'arabic-news-api.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

/**
 * Fetch news from Arabic News API on RapidAPI
 * Docs: https://rapidapi.com/ruamazi/api/arabic-news-api
 *
 * @param {string} topic - Search topic/query (optional)
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Array of articles
 */
async function fetchNews(topic = null, limit = 20) {
  if (!RAPIDAPI_KEY) {
    console.error('❌ RAPIDAPI_KEY not configured');
    return [];
  }

  try {
    console.log(`📰 RapidAPI Arabic News: Fetching ${topic || 'latest'}`);

    const params = {};
    if (topic) params.q = topic;

    // Primary endpoint: /akhbar (Arabic for "news")
    const response = await axios.get(`${BASE_URL}/akhbar`, {
      params,
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      }
    });

    const data = response.data;
    const items = Array.isArray(data) ? data : (data.articles || data.results || data.news || []);

    const articles = items.slice(0, limit).map(item => ({
      title: item.title || item.headline || null,
      description: item.description || item.summary || item.excerpt || null,
      url: item.url || item.link || null,
      image: item.image || item.imageUrl || item.image_url || item.thumbnail || null,
      source: item.source || item.publisher || 'Arabic News',
      author: item.author || null,
      content: item.content || item.body || null,
      publishedAt: item.publishedAt || item.published_at || item.date || new Date().toISOString(),
      language: 'ar',
      country: item.country || null,
      region: 'middleeast',
      category: item.category || 'general'
    })).filter(a => a.title && a.url);

    console.log(`✅ RapidAPI Arabic News: Retrieved ${articles.length} articles`);
    return articles;
  } catch (error) {
    console.error('❌ RapidAPI Arabic News error:', error.message);

    if (error.response?.status === 429) {
      console.warn('⚠️  RapidAPI Arabic News rate limit exceeded');
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('❌ RapidAPI authentication failed - check your RAPIDAPI_KEY');
    } else if (error.response?.status === 404) {
      console.error('❌ RapidAPI endpoint not found - verify API endpoints at rapidapi.com/ruamazi/api/arabic-news-api');
    }

    return [];
  }
}

function getRateLimitStatus() {
  return {
    tier: 'rapidapi',
    dailyLimit: 100,
    resetTime: 'monthly (RapidAPI billing cycle)'
  };
}

module.exports = { fetchNews, getRateLimitStatus };
