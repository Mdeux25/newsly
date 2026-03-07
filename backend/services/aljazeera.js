const Parser = require('rss-parser');

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure']
    ]
  }
});

const FEEDS = {
  en: 'https://www.aljazeera.com/xml/rss/all.xml',
  ar: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9'
};

/**
 * Fetch news from Al Jazeera RSS feeds
 * @param {string} language - 'en' or 'ar'
 * @param {number} limit - Max articles to return
 * @returns {Promise<Array>} Array of articles
 */
async function fetchNews(language = 'en', limit = 30) {
  const feedUrl = FEEDS[language] || FEEDS.en;

  try {
    console.log(`📰 Al Jazeera RSS: Fetching ${language === 'ar' ? 'Arabic' : 'English'} feed`);

    const feed = await parser.parseURL(feedUrl);

    const articles = feed.items.slice(0, limit).map(item => {
      const image =
        item.media?.$?.url ||
        item.mediaThumbnail?.$?.url ||
        item.enclosure?.url ||
        null;

      return {
        title: item.title || null,
        description: item.contentSnippet || item.summary || null,
        url: item.link || null,
        image,
        source: language === 'ar' ? 'الجزيرة' : 'Al Jazeera',
        author: null,
        content: item.content || null,
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        language,
        country: 'qa',
        region: 'middleeast',
        category: 'general'
      };
    }).filter(a => a.title && a.url);

    console.log(`✅ Al Jazeera RSS: Retrieved ${articles.length} articles (${language})`);
    return articles;
  } catch (error) {
    console.error(`❌ Al Jazeera RSS error (${language}):`, error.message);
    return [];
  }
}

function getRateLimitStatus() {
  return {
    tier: 'free',
    dailyLimit: null,
    resetTime: 'N/A'
  };
}

module.exports = { fetchNews, getRateLimitStatus };
