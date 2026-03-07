const express = require('express');
const router = express.Router();
const newsapi = require('../services/newsapi');
const gnews = require('../services/gnews');
const translator = require('../services/translator');
const twitter = require('../services/twitter');
const Article = require('../models/Article');
const ApiQuota = require('../models/ApiQuota');

// Get news articles
router.get('/news', async (req, res) => {
  try {
    const {
      topic = 'breaking news',
      limit = 20,
      offset = 0,
      language = 'en',
      hours = 168,
      smartSearch = 'false'
    } = req.query;

    const countryArray = null; // geographic filtering now done via topic/smart-search
    const useSmartSearch = smartSearch === 'true' && topic && topic !== 'breaking news';

    console.log(`Fetching news: topic="${topic}", language="${language}", hours=${hours}, offset=${offset}, limit=${limit}, smartSearch=${useSmartSearch}`);

    let articles = [];
    let totalCount = 0;
    let source = 'database'; // Track where articles came from

    // Detect cross-language search: English query with Arabic language filter
    // In this case, remove language restriction from DB query and prioritize Arabic in sort
    const hasTopic = topic && topic !== 'breaking news';
    const isEnglishQuery = hasTopic && /^[\x20-\x7E]+$/.test(topic.trim());
    const isCrossLangSearch = isEnglishQuery && language === 'ar';

    // TRY DATABASE FIRST (fast, no rate limits!)
    try {
      const filters = {
        // Cross-language: search all articles, sort Arabic first after
        language: (language === 'both' || isCrossLangSearch) ? null : language,
        minDate: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000)
      };

      // Always use smart search for cross-language or when checkbox enabled
      const shouldSmartSearch = (useSmartSearch || isCrossLangSearch) && hasTopic;

      let dbArticles;

      if (shouldSmartSearch) {
        console.log(`🔍 Smart search: "${topic}" (cross-language + weighted ranking)`);
        try {
          dbArticles = await Article.smartSearch(topic, filters, parseInt(limit), parseInt(offset));
          totalCount = await Article.countSmartSearch(topic, filters);
          source = 'smart-search';
        } catch (smartError) {
          console.warn('⚠️  Smart search failed, falling back to simple search:', smartError.message);
          filters.topic = topic;
          dbArticles = await Article.findRecent(filters, parseInt(limit), parseInt(offset));
          totalCount = await Article.countArticles(filters);
        }
      } else {
        // Simple search (original behavior)
        filters.topic = hasTopic ? topic : null;
        dbArticles = await Article.findRecent(filters, parseInt(limit), parseInt(offset));
        totalCount = await Article.countArticles(filters);
      }

      // For cross-language: sort Arabic articles first, then English
      if (isCrossLangSearch && dbArticles) {
        dbArticles.sort((a, b) => {
          const aAr = a.language === 'ar' ? 0 : 1;
          const bAr = b.language === 'ar' ? 0 : 1;
          return aAr - bAr;
        });
      }

      if (dbArticles && dbArticles.length > 0) {
        // Convert database format to API format
        articles = dbArticles.map(article => ({
          title: article.title,
          description: article.description,
          title_ar: article.title_ar || null,
          description_ar: article.description_ar || null,
          url: article.url,
          image: article.image_url,
          source: article.source,
          author: article.author,
          content: article.content,
          publishedAt: article.published_at,
          region: article.region,
          language: article.language,
          country: article.country,
          category: article.category
        }));

        console.log(`✅ Returned ${articles.length} articles from database (fast!)`);
      }
    } catch (dbError) {
      console.warn('⚠️  Database query failed, falling back to API:', dbError.message);
    }

    // FALLBACK TO API if database is empty or has insufficient articles
    if (articles.length < limit / 2) {
      console.log(`📡 Database has ${articles.length} articles, fetching from API to supplement...`);

      // If Arabic is selected, fetch both Arabic and English news, then translate English
      if (language === 'ar' || language === 'both') {
        // Fetch Arabic news
        const arabicArticles = await newsapi.fetchNews(topic, 'all', Math.floor(limit / 2), 'ar', null);

        // Fetch English news
        const englishArticles = await newsapi.fetchNews(topic, 'all', Math.floor(limit / 2), 'en', null);

        // Auto-translate English articles to Arabic
        console.log(`Auto-translating ${englishArticles.length} English articles to Arabic...`);
        const translatedArticles = await Promise.all(
          englishArticles.map(article => translator.translateArticle(article, 'ar'))
        );

        // Combine both
        articles = [...articles, ...arabicArticles, ...translatedArticles];
      } else {
        // English only - fetch English news
        let apiArticles = await newsapi.fetchNews(topic, 'all', limit, language, null);

        // IMPORTANT: When countries are selected, filter results by language (user's requirement #2)
        // This is needed because top-headlines endpoint doesn't support language filter
        {
          articles = [...articles, ...apiArticles];
        }

        // If still no results, try GNews as backup
        if (articles.length === 0 && process.env.GNEWS_KEY) {
          console.log('Falling back to GNews API');
          const gnewsArticles = await gnews.fetchNews(topic, 'all', Math.min(limit, 10), language);
          articles = [...articles, ...gnewsArticles];
        }
      }

      source = 'api+database';
    }

    // Deduplicate by title (simple similarity check)
    const uniqueArticles = deduplicateArticles(articles);

    // When language is "both", Arabic articles come first, then sort by date within each group
    if (language === 'both') {
      uniqueArticles.sort((a, b) => {
        const aAr = a.language === 'ar' ? 0 : 1;
        const bAr = b.language === 'ar' ? 0 : 1;
        if (aAr !== bAr) return aAr - bAr;
        return new Date(b.publishedAt || b.published_at) - new Date(a.publishedAt || a.published_at);
      });
    } else {
      // Sort by publication date
      uniqueArticles.sort((a, b) => new Date(b.publishedAt || b.published_at) - new Date(a.publishedAt || a.published_at));
    }

    res.json({
      success: true,
      count: uniqueArticles.length,
      totalCount: totalCount, // Total number of articles matching filters (for pagination)
      articles: uniqueArticles.slice(0, limit),
      source: source, // Let frontend know where data came from
      smartSearchUsed: useSmartSearch, // NEW: Indicate if smart search was used
      note: uniqueArticles.length === 0 ? 'No articles found. This may be due to API rate limits or no news available for the selected filters.' : null
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news articles'
    });
  }
});

// Get trending topics (simple keyword extraction)
router.get('/trending', async (req, res) => {
  try {
    let articles = [];

    // TRY DATABASE FIRST (get articles from last 24 hours)
    try {
      const dbArticles = await Article.findRecent({
        minDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }, 100);

      if (dbArticles && dbArticles.length > 0) {
        articles = dbArticles.map(article => ({
          title: article.title,
          category: article.category
        }));
        console.log(`✅ Using ${articles.length} articles from database for trending analysis`);
      }
    } catch (dbError) {
      console.warn('⚠️  Database query failed:', dbError.message);
    }

    // FALLBACK TO API if database is empty
    if (articles.length === 0) {
      console.log('📡 Fetching from API for trending analysis...');
      articles = await newsapi.fetchNews('world news', 'all', 30);
    }

    // Get trending categories from database
    const trendingCategories = await Article.getTrendingTopics(24, 10);

    // Extract common words from titles (simple trending detection)
    const keywords = extractKeywords(articles);

    res.json({
      success: true,
      trending: keywords.slice(0, 10),
      categories: trendingCategories,
      source: articles.length > 30 ? 'database' : 'api'
    });
  } catch (error) {
    console.error('Error fetching trending:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending topics'
    });
  }
});

// Translate article to Arabic via Gemini LLM (DB-cached permanently)
router.post('/translate', async (req, res) => {
  try {
    const { article } = req.body;

    if (!article || !article.title) {
      return res.status(400).json({ success: false, error: 'Article data required' });
    }

    // 1. Check articles table first — translation already computed
    if (article.url) {
      const dbArticle = await Article.findByUrl(article.url);
      if (dbArticle && dbArticle.title_ar) {
        console.log(`📚 Translation DB hit for: ${article.url.slice(0, 60)}`);
        return res.json({
          success: true,
          article: { title: dbArticle.title_ar, description: dbArticle.description_ar || '' }
        });
      }
    }

    // 2. Translate via Gemini (also uses LLM 3-tier cache)
    const llm = require('../services/llm');
    const translated = await llm.translateArticle(article.title, article.description, article.url);

    // 3. Persist back to articles row so next click is instant (best-effort)
    if (article.url) {
      Article.saveTranslation(article.url, translated.title, translated.description)
        .catch(err => console.warn('Could not save translation to DB:', err.message));
    }

    res.json({ success: true, article: translated });
  } catch (error) {
    console.error('Error translating article:', error);
    res.status(500).json({ success: false, error: 'Translation failed' });
  }
});

// Helper: Deduplicate articles by title similarity
function deduplicateArticles(articles) {
  const unique = [];
  const seen = new Set();

  for (const article of articles) {
    const normalizedTitle = article.title?.toLowerCase().trim();
    if (!normalizedTitle || seen.has(normalizedTitle)) continue;

    // Check if very similar title exists
    const isDuplicate = Array.from(seen).some(title => {
      return similarity(title, normalizedTitle) > 0.8;
    });

    if (!isDuplicate) {
      seen.add(normalizedTitle);
      unique.push(article);
    }
  }

  return unique;
}

// Simple string similarity (Dice coefficient)
function similarity(str1, str2) {
  const words1 = new Set(str1.split(' '));
  const words2 = new Set(str2.split(' '));
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  return (2 * intersection.size) / (words1.size + words2.size);
}

// Get tweets by topic/keyword
router.get('/tweets/search', async (req, res) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter required'
      });
    }

    console.log(`Searching tweets: query="${query}"`);
    const tweets = await twitter.searchTweets(query, limit);

    res.json({
      success: true,
      count: tweets.length,
      tweets: tweets
    });
  } catch (error) {
    console.error('Error fetching tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tweets'
    });
  }
});

// Get tweets from specific user
router.get('/tweets/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const { limit = 10 } = req.query;

    console.log(`Fetching tweets from @${username}`);
    const tweets = await twitter.getUserTweets(username, limit);

    res.json({
      success: true,
      count: tweets.length,
      tweets: tweets
    });
  } catch (error) {
    console.error('Error fetching user tweets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user tweets'
    });
  }
});

// Extract keywords from articles
function extractKeywords(articles) {
  const wordCount = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'as', 'by', 'is', 'are', 'was', 'were']);

  articles.forEach(article => {
    if (!article.title) return;
    const words = article.title.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
      if (word.length > 3 && !stopWords.has(word)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCount)
    .sort(([, a], [, b]) => b - a)
    .map(([word]) => word);
}

// Get system status (database stats, API quotas, worker status)
router.get('/status', async (req, res) => {
  try {
    const stats = await Article.getStats();
    const quotas = await ApiQuota.getAllQuotas();
    const FetchLog = require('../models/FetchLog');
    const recentLogs = await FetchLog.getSummary(24);

    // Get LLM service stats
    let llmStats = null;
    try {
      const llm = require('../services/llm');
      llmStats = llm.getStats();
    } catch (err) {
      console.warn('LLM stats unavailable:', err.message);
    }

    res.json({
      success: true,
      database: {
        totalArticles: stats.total,
        articlesToday: stats.today,
        topSources: stats.topSources,
        articlesByCountry: stats.byCountry
      },
      apiQuotas: quotas,
      fetchActivity: recentLogs,
      llm: llmStats, // NEW: LLM service statistics
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system status'
    });
  }
});

// Enhanced trending with LLM analysis and recency weighting
router.get('/trending/smart', async (req, res) => {
  try {
    const { hours = 24, limit = 10 } = req.query;

    // Get recent articles grouped by country
    const articles = await Article.findRecent({
      minDate: new Date(Date.now() - hours * 60 * 60 * 1000)
    }, 500);

    if (articles.length === 0) {
      return res.json({
        success: true,
        trending: [],
        source: 'database'
      });
    }

    // Use LLM to extract topics with recency weights
    const llm = require('../services/llm');
    const trendingTopics = await llm.extractTrendingInsights(articles, parseInt(limit));

    res.json({
      success: true,
      trending: trendingTopics,
      source: 'llm+database',
      articleCount: articles.length
    });
  } catch (error) {
    console.error('Error fetching smart trending:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch smart trending topics'
    });
  }
});

// Trending topics by map location (for alarm bell visualization)
router.get('/trending/locations', async (req, res) => {
  try {
    const db = require('../config/database');
    const [rows] = await db.query(`
      SELECT country_code, topic, article_count, recency_score
      FROM trending_locations
      WHERE last_updated >= NOW() - INTERVAL '1 hour'
      ORDER BY country_code, recency_score DESC
    `);

    // Group by country
    const grouped = {};
    rows.forEach(row => {
      if (!grouped[row.country_code]) {
        grouped[row.country_code] = [];
      }
      grouped[row.country_code].push({
        topic: row.topic,
        count: row.article_count,
        score: row.recency_score
      });
    });

    // Convert to array format
    const locations = Object.entries(grouped).map(([code, topics]) => ({
      countryCode: code,
      topics: topics.slice(0, 3) // Top 3 per country
    }));

    res.json({
      success: true,
      locations: locations,
      source: 'database'
    });
  } catch (error) {
    console.error('Error fetching trending locations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending locations'
    });
  }
});

// Bilingual summary for a map country click or trending topic click
router.get('/news/summary', async (req, res) => {
  try {
    const { topic, countries, hours = 6 } = req.query;
    const countryArray = countries ? countries.split(',') : null;

    const filters = {
      country: countryArray,
      topic: topic || null,
      minDate: new Date(Date.now() - hours * 60 * 60 * 1000)
    };

    const articles = await Article.findRecent(filters, 20);
    if (articles.length === 0) {
      return res.json({ success: true, summary: null, reason: 'no_articles' });
    }

    const llm = require('../services/llm');
    const summary = await llm.summarizeArticles(articles, {
      topic: topic || null,
      country: countryArray
    });

    res.json({ success: true, summary, articleCount: articles.length });
  } catch (error) {
    console.error('Summary error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate summary' });
  }
});

// Semantic search endpoint — query by meaning, not keywords
router.get('/news/semantic', async (req, res) => {
  try {
    const { query, language, hours = 168, limit = 20, offset = 0 } = req.query;
    if (!query) return res.status(400).json({ success: false, error: 'query is required' });

    const llm = require('../services/llm');
    const queryVector = await llm.embedText(query);
    if (!queryVector) return res.status(500).json({ success: false, error: 'Embedding failed' });

    const filters = {
      language: language === 'both' ? null : (language || null),
      minDate: new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000)
    };

    const articles = await Article.semanticSearch(queryVector, filters, parseInt(limit), parseInt(offset));
    const totalCount = await Article.countSemantic(queryVector, filters);

    const formatted = articles.map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.image_url,
      source: a.source,
      author: a.author,
      publishedAt: a.published_at,
      language: a.language,
      country: a.country,
      category: a.category,
      relevanceScore: a.distance ? +(1 - a.distance).toFixed(3) : null
    }));

    res.json({ success: true, articles: formatted, totalCount, count: formatted.length });
  } catch (error) {
    console.error('Semantic search error:', error.message);
    res.status(500).json({ success: false, error: 'Semantic search failed' });
  }
});

// Live RSS feed endpoint — returns latest Al Jazeera articles directly from RSS
router.get('/rss', async (req, res) => {
  try {
    const { language = 'en', limit = 15 } = req.query;
    const { fetchNews } = require('../services/aljazeera');
    const articles = await fetchNews(language, parseInt(limit));
    res.json({ success: true, articles });
  } catch (error) {
    console.error('RSS fetch error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch RSS feed' });
  }
});

// Fetch a single article by its original URL or title slug (used for Newsly share-link detail pages)
router.get('/article', async (req, res) => {
  try {
    const { url, slug } = req.query;
    if (!url && !slug) return res.status(400).json({ success: false, error: 'url or slug is required' });

    const article = slug
      ? await Article.findBySlug(decodeURIComponent(slug))
      : await Article.findByUrl(decodeURIComponent(url));
    if (!article) return res.status(404).json({ success: false, error: 'Article not found' });

    res.json({
      success: true,
      article: {
        title: article.title,
        description: article.description,
        title_ar: article.title_ar || null,
        description_ar: article.description_ar || null,
        url: article.url,
        image: article.image_url,
        source: article.source,
        author: article.author,
        publishedAt: article.published_at,
        language: article.language,
        country: article.country,
        category: article.category
      }
    });
  } catch (error) {
    console.error('Article fetch error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch article' });
  }
});

module.exports = router;
