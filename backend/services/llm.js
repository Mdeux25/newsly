/**
 * LLM Service - OpenAI Integration for Smart News Features
 *
 * Features:
 * - Cross-language query translation (e.g., "iran" → "إيران")
 * - Semantic variation generation (e.g., "war" → ["conflict", "military"])
 * - Smart trending topic extraction with recency weights
 * - 3-tier caching: Memory → Database → API (95%+ hit rate target)
 * - Cost monitoring and budget controls
 */

const OpenAI = require('openai');
const NodeCache = require('node-cache');
const LLMCache = require('../models/LLMCache');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const CACHE_ENABLED = process.env.LLM_CACHE_ENABLED !== 'false';
const DAILY_BUDGET = parseFloat(process.env.LLM_DAILY_BUDGET || '1.00');

// In-memory cache (Level 1): 1 hour TTL
const memoryCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Cost tracking
let dailyCost = 0.0;
let totalCalls = 0;
let cacheHits = 0;
let cacheMisses = 0;
let lastResetDate = new Date().toISOString().split('T')[0];

/**
 * Reset daily cost counter at midnight
 */
function resetDailyStats() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== lastResetDate) {
    console.log(`📊 LLM Stats Reset - Previous day: ${dailyCost.toFixed(4)} USD, ${totalCalls} calls, ${(cacheHits / (cacheHits + cacheMisses) * 100).toFixed(1)}% cache hit rate`);
    dailyCost = 0.0;
    totalCalls = 0;
    cacheHits = 0;
    cacheMisses = 0;
    lastResetDate = today;
  }
}

/**
 * Check if daily budget is exceeded
 */
function isBudgetExceeded() {
  resetDailyStats();
  if (dailyCost >= DAILY_BUDGET) {
    console.warn(`⚠️  LLM daily budget exceeded: $${dailyCost.toFixed(4)} / $${DAILY_BUDGET.toFixed(2)}`);
    return true;
  }
  return false;
}

/**
 * Estimate cost for API call (GPT-4o-mini pricing)
 * Input: $0.150 / 1M tokens
 * Output: $0.600 / 1M tokens
 */
function estimateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * 0.150;
  const outputCost = (outputTokens / 1_000_000) * 0.600;
  return inputCost + outputCost;
}

/**
 * 3-tier cache retrieval: Memory → Database → Compute
 */
async function getCachedOrCompute(cacheKey, cacheType, computeFn) {
  if (!CACHE_ENABLED) {
    return await computeFn();
  }

  // Level 1: Memory cache (fastest)
  const memCached = memoryCache.get(cacheKey);
  if (memCached) {
    cacheHits++;
    return memCached;
  }

  // Level 2: Database cache
  try {
    const dbCached = await LLMCache.get(cacheKey, cacheType);
    if (dbCached) {
      cacheHits++;
      // Populate memory cache
      memoryCache.set(cacheKey, dbCached);
      return dbCached;
    }
  } catch (error) {
    console.warn('Database cache read failed:', error.message);
  }

  // Level 3: Compute (API call)
  cacheMisses++;
  const result = await computeFn();

  // Store in both caches
  try {
    memoryCache.set(cacheKey, result);
    await LLMCache.set(cacheKey, cacheType, cacheKey, result, 7 * 24 * 60 * 60); // 7 days
  } catch (error) {
    console.warn('Cache write failed:', error.message);
  }

  return result;
}

/**
 * Translate query to target languages
 *
 * @param {string} searchTerm - Original search term
 * @param {string[]} targetLanguages - Target languages (e.g., ['en', 'ar'])
 * @returns {Promise<Object>} - { original, translations: { en, ar }, variations: [] }
 */
async function translateQuery(searchTerm, targetLanguages = ['en', 'ar']) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return { original: '', translations: {}, variations: [] };
  }

  if (isBudgetExceeded()) {
    console.warn('Budget exceeded, returning simple translation fallback');
    return { original: searchTerm, translations: { en: searchTerm, ar: searchTerm }, variations: [] };
  }

  const cacheKey = `translate:${searchTerm}:${targetLanguages.join(',')}`;

  return await getCachedOrCompute(cacheKey, 'translation', async () => {
    try {
      const prompt = `Translate the search term "${searchTerm}" to ${targetLanguages.join(' and ')}.
Also provide 2-3 semantic variations or synonyms for each language.

Return ONLY a JSON object with this exact structure:
{
  "original": "${searchTerm}",
  "translations": {
    "en": "english translation",
    "ar": "arabic translation"
  },
  "variations": ["synonym1", "synonym2", "related term"]
}

Important:
- Keep translations concise (1-3 words max)
- Variations should be semantically similar (not just grammatical)
- For Arabic, use Modern Standard Arabic
- Return only the JSON, no markdown or explanation`;

      const startTime = Date.now();
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a multilingual translation expert specializing in news search optimization. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const responseTime = Date.now() - startTime;
      const usage = completion.usage;
      const cost = estimateCost(usage.prompt_tokens, usage.completion_tokens);

      dailyCost += cost;
      totalCalls++;

      console.log(`🔤 Translation: "${searchTerm}" → ${responseTime}ms, $${cost.toFixed(6)}`);

      // Parse response
      const content = completion.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from LLM');
      }

      const result = JSON.parse(jsonMatch[0]);
      return result;

    } catch (error) {
      console.error('Translation failed:', error.message);
      // Fallback: return original term
      return {
        original: searchTerm,
        translations: targetLanguages.reduce((acc, lang) => ({ ...acc, [lang]: searchTerm }), {}),
        variations: []
      };
    }
  });
}

/**
 * Generate semantic variations for a search term
 *
 * @param {string} term - Search term
 * @param {number} count - Number of variations
 * @returns {Promise<string[]>} - Array of semantic variations
 */
async function generateSemanticVariations(term, count = 5) {
  if (!term || isBudgetExceeded()) {
    return [];
  }

  const cacheKey = `semantic:${term}:${count}`;

  return await getCachedOrCompute(cacheKey, 'semantic', async () => {
    try {
      const prompt = `Generate ${count} semantic variations or related terms for: "${term}"

These are for news search, so include:
- Synonyms
- Related topics
- Common abbreviations
- Alternative phrasings

Return ONLY a JSON array of strings: ["term1", "term2", ...]`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a news search expert. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 150
      });

      const usage = completion.usage;
      const cost = estimateCost(usage.prompt_tokens, usage.completion_tokens);
      dailyCost += cost;
      totalCalls++;

      const content = completion.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      return JSON.parse(jsonMatch[0]);

    } catch (error) {
      console.error('Semantic variation generation failed:', error.message);
      return [];
    }
  });
}

/**
 * Extract trending insights from articles with recency weighting
 *
 * @param {Array} articles - Array of article objects
 * @param {number} topN - Number of top topics to return
 * @returns {Promise<Array>} - [{ topic, count, score, avgHoursOld, countries: [] }]
 */
async function extractTrendingInsights(articles, topN = 10) {
  if (!articles || articles.length === 0) {
    return [];
  }

  if (isBudgetExceeded()) {
    console.warn('Budget exceeded, using simple trending fallback');
    return extractTrendingSimple(articles, topN);
  }

  const cacheKey = `trending:${articles.length}:${topN}:${Date.now() - 3600000}`; // 1 hour cache

  return await getCachedOrCompute(cacheKey, 'trending', async () => {
    try {
      // Sample articles for LLM analysis (to reduce token usage)
      const sampleSize = Math.min(50, articles.length);
      const sample = articles
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
        .slice(0, sampleSize);

      // Create compact article summary
      const articleSummary = sample.map(a => ({
        title: a.title,
        country: a.country,
        hours_old: Math.round((Date.now() - new Date(a.published_at)) / (1000 * 60 * 60))
      }));

      const prompt = `Analyze these ${sampleSize} recent news articles and identify the top ${topN} trending topics.

Articles:
${JSON.stringify(articleSummary, null, 2)}

Return ONLY a JSON array with this structure:
[
  {
    "topic": "topic keyword (lowercase)",
    "count": estimated_article_count,
    "avgHoursOld": average_hours_since_published,
    "countries": ["us", "gb", ...]
  }
]

Rules:
- Topics should be single words or short phrases (2-3 words max)
- Focus on newsworthy events, not generic categories
- Prioritize recent topics (lower avgHoursOld)
- Count should reflect frequency in the sample
- Countries should list where this topic is prominent`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a news trend analyzer. Return only valid JSON arrays.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      const usage = completion.usage;
      const cost = estimateCost(usage.prompt_tokens, usage.completion_tokens);
      dailyCost += cost;
      totalCalls++;

      console.log(`📊 Trending analysis: ${sampleSize} articles → $${cost.toFixed(6)}`);

      const content = completion.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return extractTrendingSimple(articles, topN);
      }

      const trends = JSON.parse(jsonMatch[0]);

      // Calculate recency score: frequency * recencyWeight
      // recencyWeight = 2^(-avgHoursOld/6) -> exponential decay
      trends.forEach(t => {
        t.score = t.count * Math.pow(2, -t.avgHoursOld / 6);
      });

      // Sort by score
      trends.sort((a, b) => b.score - a.score);

      return trends.slice(0, topN);

    } catch (error) {
      console.error('Trending extraction failed:', error.message);
      return extractTrendingSimple(articles, topN);
    }
  });
}

/**
 * Simple trending fallback (no LLM)
 * Extracts keywords from titles using frequency analysis
 */
function extractTrendingSimple(articles, topN = 10) {
  const wordCounts = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'this', 'that', 'these', 'those']);

  articles.forEach(article => {
    const words = article.title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    const hoursOld = (Date.now() - new Date(article.published_at)) / (1000 * 60 * 60);
    const weight = Math.pow(2, -hoursOld / 6);

    words.forEach(word => {
      if (!wordCounts[word]) {
        wordCounts[word] = { count: 0, totalWeight: 0, countries: new Set(), totalHours: 0 };
      }
      wordCounts[word].count++;
      wordCounts[word].totalWeight += weight;
      wordCounts[word].totalHours += hoursOld;
      if (article.country) {
        wordCounts[word].countries.add(article.country);
      }
    });
  });

  // Convert to array and sort by weighted count
  const trending = Object.entries(wordCounts)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      score: data.totalWeight,
      avgHoursOld: data.totalHours / data.count,
      countries: Array.from(data.countries)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return trending;
}

/**
 * Generate a bilingual (EN + AR) summary for a set of articles
 *
 * @param {Array} articles - Array of article objects
 * @param {Object} opts - { topic, country }
 * @returns {Promise<{en: string, ar: string}>}
 */
async function summarizeArticles(articles, { topic = null, country = null } = {}) {
  if (!articles || articles.length === 0) return null;

  // Cache key rotates every hour so summaries stay fresh
  const hourSlot = new Date().toISOString().slice(0, 13); // "2026-03-06T14"
  const countryStr = Array.isArray(country) ? country.join(',') : (country || '');
  const cacheKey = `summary:${topic || ''}:${countryStr}:${hourSlot}`;

  if (isBudgetExceeded()) return summaryFallback(articles);

  return await getCachedOrCompute(cacheKey, 'summary', async () => {
    try {
      const top = articles.slice(0, 15);
      const articleText = top.map((a, i) =>
        `${i + 1}. [${a.source}] ${a.title}. ${a.description || ''}`
      ).join('\n');

      const locationStr = Array.isArray(country) ? country.join(', ') : country;
      const prompt = `You are a news analyst. Given these recent news articles${topic ? ` about "${topic}"` : ''}${locationStr ? ` from ${locationStr}` : ''}, write a concise 2-3 sentence summary of what is happening. Respond ONLY with valid JSON: {"en": "English summary here", "ar": "Arabic summary here"}\n\nArticles:\n${articleText}`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const usage = completion.usage;
      const cost = estimateCost(usage.prompt_tokens, usage.completion_tokens);
      dailyCost += cost;
      totalCalls++;

      console.log(`📰 Summary: topic="${topic}", country="${countryStr}" → $${cost.toFixed(6)}`);

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('summarizeArticles failed:', error.message);
      return summaryFallback(articles);
    }
  });
}

/**
 * Fallback summary when budget is exceeded — returns first 3 article titles
 */
function summaryFallback(articles) {
  const titles = articles.slice(0, 3).map(a => a.title).join(' | ');
  return { en: titles, ar: titles };
}

/**
 * Batch translate multiple terms (cost optimization)
 *
 * @param {string[]} terms - Array of terms to translate
 * @param {string} targetLang - Target language code
 * @returns {Promise<Object>} - { term1: translation1, term2: translation2, ... }
 */
async function batchTranslate(terms, targetLang = 'ar') {
  if (!terms || terms.length === 0 || isBudgetExceeded()) {
    return {};
  }

  // Check cache for each term first
  const results = {};
  const uncached = [];

  for (const term of terms) {
    const cacheKey = `translate:${term}:${targetLang}`;
    const cached = memoryCache.get(cacheKey) || await LLMCache.get(cacheKey, 'translation');
    if (cached && cached.translations && cached.translations[targetLang]) {
      results[term] = cached.translations[targetLang];
    } else {
      uncached.push(term);
    }
  }

  // Batch translate uncached terms
  if (uncached.length > 0) {
    try {
      const prompt = `Translate these terms to ${targetLang}:
${uncached.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return ONLY a JSON object: { "term1": "translation1", "term2": "translation2", ... }`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a translator. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const usage = completion.usage;
      const cost = estimateCost(usage.prompt_tokens, usage.completion_tokens);
      dailyCost += cost;
      totalCalls++;

      const content = completion.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const translations = JSON.parse(jsonMatch[0]);
        Object.assign(results, translations);

        // Cache results
        for (const [term, translation] of Object.entries(translations)) {
          const cacheKey = `translate:${term}:${targetLang}`;
          const cacheValue = { original: term, translations: { [targetLang]: translation }, variations: [] };
          memoryCache.set(cacheKey, cacheValue);
          await LLMCache.set(cacheKey, 'translation', term, cacheValue, 7 * 24 * 60 * 60);
        }
      }
    } catch (error) {
      console.error('Batch translation failed:', error.message);
    }
  }

  return results;
}

/**
 * Get current LLM service statistics
 */
function getStats() {
  resetDailyStats();
  const totalRequests = cacheHits + cacheMisses;
  return {
    totalCalls,
    cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
    costToday: dailyCost,
    budgetRemaining: Math.max(0, DAILY_BUDGET - dailyCost),
    errorRate: 0, // TODO: track errors
    averageResponseTime: 0, // TODO: track response times
    memCacheSize: memoryCache.keys().length
  };
}

module.exports = {
  translateQuery,
  generateSemanticVariations,
  extractTrendingInsights,
  summarizeArticles,
  batchTranslate,
  getStats,
  isBudgetExceeded
};
