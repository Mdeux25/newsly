const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 5 minutes
const cache = new NodeCache({ stdTTL: 300 });

const GNEWS_KEY = process.env.GNEWS_KEY;
const GNEWS_URL = 'https://gnews.io/api/v4';

async function fetchNews(topic, region = 'all', pageSize = 10, language = 'en') {
  const cacheKey = `gnews_${topic}_${region}_${pageSize}_${language}`;

  // Check cache first (but only if it has results)
  const cached = cache.get(cacheKey);
  if (cached && cached.length > 0) {
    console.log('Returning cached GNews results');
    return cached;
  }

  try {
    const params = {
      apikey: GNEWS_KEY,
      q: topic,
      lang: language === 'ar' ? 'ar' : 'en',
      max: pageSize,
      sortby: 'publishedAt'
    };

    // GNews supports country filtering
    if (region === 'us') {
      params.country = 'us';
    } else if (region === 'eu') {
      params.country = 'gb'; // UK as EU representative
    } else if (language === 'ar') {
      params.country = 'sa'; // Saudi Arabia for Arabic news
    }

    const response = await axios.get(`${GNEWS_URL}/search`, { params });

    if (response.data.articles) {
      const articles = response.data.articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        image: article.image,
        source: article.source.name,
        publishedAt: article.publishedAt,
        region: determineRegion(article.source.name),
        language: language
      }));

      cache.set(cacheKey, articles);
      return articles;
    }

    return [];
  } catch (error) {
    console.error('GNews error:', error.message);
    if (error.response?.status === 429) {
      console.warn('GNews rate limit exceeded');
    }
    return [];
  }
}

function determineRegion(sourceName) {
  const source = sourceName.toLowerCase();
  if (source.includes('cnn') || source.includes('fox') || source.includes('nyt') || source.includes('washington')) {
    return 'us';
  }
  if (source.includes('bbc') || source.includes('reuters') || source.includes('guardian')) {
    return 'eu';
  }
  if (source.includes('jazeera') || source.includes('arabiya')) {
    return 'middleeast';
  }
  return 'other';
}

module.exports = { fetchNews };
