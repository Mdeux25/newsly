/**
 * LLM Service - Google Gemini Integration for Smart News Features
 *
 * Features:
 * - Cross-language query translation (e.g., "iran" → "إيران")
 * - Semantic variation generation (e.g., "war" → ["conflict", "military"])
 * - Smart trending topic extraction with recency weights
 * - 3-tier caching: Memory → Database → API (95%+ hit rate target)
 * - Cost monitoring and budget controls
 */

const { GoogleGenAI } = require('@google/genai');
const NodeCache = require('node-cache');
const LLMCache = require('../models/LLMCache');

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
 * Estimate cost for Gemini 2.0 Flash
 * Input:  $0.10 / 1M tokens
 * Output: $0.40 / 1M tokens
 */
function estimateCost(inputTokens, outputTokens) {
  const inputCost  = (inputTokens  / 1_000_000) * 0.10;
  const outputCost = (outputTokens / 1_000_000) * 0.40;
  return inputCost + outputCost;
}

/**
 * Call Gemini and return parsed text
 */
async function callGemini(prompt, { temperature = 0.4, maxOutputTokens = 300, jsonMode = true, systemInstruction = null } = {}) {
  const config = {
    temperature,
    maxOutputTokens,
    // Disable thinking for structured output calls — thinking tokens eat the budget
    thinkingConfig: { thinkingBudget: 0 },
    ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    ...(systemInstruction ? { systemInstruction } : {})
  };
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config
  });
  return response;
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
 */
async function translateQuery(searchTerm, targetLanguages = ['en', 'ar']) {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return { original: '', translations: {}, variations: [] };
  }

  if (isBudgetExceeded()) {
    return { original: searchTerm, translations: { en: searchTerm, ar: searchTerm }, variations: [] };
  }

  const cacheKey = `translate:${searchTerm}:${targetLanguages.join(',')}`;

  return await getCachedOrCompute(cacheKey, 'translation', async () => {
    try {
      const prompt = `Translate the search term "${searchTerm}" to ${targetLanguages.join(' and ')}.
Also provide 2-3 semantic variations or synonyms for each language.

Return a JSON object with this exact structure:
{
  "original": "${searchTerm}",
  "translations": {
    "en": "english translation",
    "ar": "arabic translation"
  },
  "variations": ["synonym1", "synonym2", "related term"]
}

Rules:
- Keep translations concise (1-3 words max)
- Variations should be semantically similar (not just grammatical)
- For Arabic, use Modern Standard Arabic`;

      const startTime = Date.now();
      const result = await callGemini(prompt, { temperature: 0.3, maxOutputTokens: 200, jsonMode: true, systemInstruction: 'You are a multilingual translation expert specialising in news search optimisation.' });
      const responseTime = Date.now() - startTime;

      const usage = result.usageMetadata;
      const cost = estimateCost(usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0);
      dailyCost += cost;
      totalCalls++;

      console.log(`🔤 Translation: "${searchTerm}" → ${responseTime}ms, $${cost.toFixed(6)}`);

      return JSON.parse(result.text);

    } catch (error) {
      console.error('Translation failed:', error.message);
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
 */
async function generateSemanticVariations(term, count = 5) {
  if (!term || isBudgetExceeded()) {
    return [];
  }

  const cacheKey = `semantic:${term}:${count}`;

  return await getCachedOrCompute(cacheKey, 'semantic', async () => {
    try {
      const prompt = `Generate ${count} semantic variations or related terms for: "${term}"

These are for news search, so include synonyms, related topics, common abbreviations, and alternative phrasings.

Return a JSON array of strings: ["term1", "term2", ...]`;

      const result = await callGemini(prompt, { temperature: 0.4, maxOutputTokens: 150, jsonMode: true, systemInstruction: 'You are a news search expert.' });

      const usage = result.usageMetadata;
      const cost = estimateCost(usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0);
      dailyCost += cost;
      totalCalls++;

      return JSON.parse(result.text);

    } catch (error) {
      console.error('Semantic variation generation failed:', error.message);
      return [];
    }
  });
}

/**
 * Extract trending insights from articles with recency weighting
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
      const sampleSize = Math.min(50, articles.length);
      const sample = articles
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
        .slice(0, sampleSize);

      const articleSummary = sample.map(a => ({
        title: a.title,
        country: a.country,
        hours_old: Math.round((Date.now() - new Date(a.published_at)) / (1000 * 60 * 60))
      }));

      const prompt = `Analyse these ${sampleSize} recent news articles and identify the top ${topN} trending topics.

Articles:
${JSON.stringify(articleSummary, null, 2)}

Return a JSON array with this structure:
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
- Prioritise recent topics (lower avgHoursOld)
- Countries should list where this topic is prominent`;

      const result = await callGemini(prompt, { temperature: 0.5, maxOutputTokens: 500, jsonMode: true, systemInstruction: 'You are a news trend analyser.' });

      const usage = result.usageMetadata;
      const cost = estimateCost(usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0);
      dailyCost += cost;
      totalCalls++;

      console.log(`📊 Trending analysis: ${sampleSize} articles → $${cost.toFixed(6)}`);

      const trends = JSON.parse(result.text);

      // Recency score: frequency × recencyWeight (exponential decay)
      trends.forEach(t => {
        t.score = t.count * Math.pow(2, -t.avgHoursOld / 6);
      });

      trends.sort((a, b) => b.score - a.score);
      return trends.slice(0, topN);

    } catch (error) {
      console.error('Trending extraction failed:', error.message);
      return extractTrendingSimple(articles, topN);
    }
  });
}

/**
 * Simple trending fallback (no LLM) — keyword frequency analysis
 */
function extractTrendingSimple(articles, topN = 10) {
  const wordCounts = {};
  const stopWords = new Set([
    // Articles / prepositions / conjunctions
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'into', 'over', 'about', 'after',
    'before', 'between', 'through', 'against', 'during', 'without', 'within',
    'amid', 'across', 'upon', 'than', 'while', 'since', 'until', 'under',
    // Common verbs
    'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'says', 'said', 'say', 'tells', 'told', 'call', 'calls', 'called',
    'makes', 'made', 'make', 'gets', 'got', 'give', 'gives', 'given',
    'take', 'takes', 'took', 'goes', 'went', 'come', 'comes', 'came',
    'show', 'shows', 'shown', 'report', 'reports', 'reported',
    'announces', 'announced', 'announce', 'confirms', 'confirmed',
    'plans', 'plan', 'planned', 'seeks', 'seek', 'warns', 'warn',
    // Pronouns / determiners
    'this', 'that', 'these', 'those', 'their', 'they', 'them', 'its',
    'his', 'her', 'our', 'your', 'who', 'what', 'which', 'when', 'where',
    'how', 'all', 'more', 'most', 'some', 'such', 'both', 'each', 'other',
    'many', 'much', 'same', 'just', 'also', 'than', 'then', 'even', 'only',
    'first', 'last', 'next', 'long', 'high', 'large', 'great', 'good',
    'know', 'knew', 'does', 'doing', 'done', 'puts', 'set', 'sets',
    // News jargon with no topic signal
    'news', 'breaking', 'live', 'watch', 'read', 'latest', 'update',
    'today', 'week', 'year', 'month', 'time', 'days', 'hours',
    'free', 'online', 'stream', 'video', 'photo', 'photos',
    'local', 'national', 'global', 'world', 'new', 'full',
    // Years
    '2023', '2024', '2025', '2026', '2027',
  ]);

  articles.forEach(article => {
    const words = article.title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w));

    const hoursOld = (Date.now() - new Date(article.published_at)) / (1000 * 60 * 60);
    const weight = Math.pow(2, -hoursOld / 6);

    words.forEach(word => {
      if (!wordCounts[word]) {
        wordCounts[word] = { count: 0, totalWeight: 0, countries: new Set(), totalHours: 0 };
      }
      wordCounts[word].count++;
      wordCounts[word].totalWeight += weight;
      wordCounts[word].totalHours += hoursOld;
      if (article.country) wordCounts[word].countries.add(article.country);
    });
  });

  return Object.entries(wordCounts)
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      score: data.totalWeight,
      avgHoursOld: data.totalHours / data.count,
      countries: Array.from(data.countries)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Generate a bilingual (EN + AR) bullet-point briefing for a set of articles.
 * Returns 10–15 key points covering trends, events, and developments.
 *
 * @param {Array}  articles
 * @param {Object} opts - { topic, country }
 * @returns {Promise<{ en: string[], ar: string[] }>}
 */
async function summarizeArticles(articles, { topic = null, country = null } = {}) {
  if (!articles || articles.length === 0) return null;

  const hourSlot = new Date().toISOString().slice(0, 13);
  const countryStr = Array.isArray(country) ? country.join(',') : (country || '');
  const cacheKey = `trending:brief:${topic || ''}:${countryStr}:${hourSlot}`;

  if (isBudgetExceeded()) return summaryFallback(articles);

  const raw = await getCachedOrCompute(cacheKey, 'trending', async () => {
    try {
      // Use up to 30 articles for better coverage
      const top = articles.slice(0, 30);
      const articleText = top.map((a, i) =>
        `${i + 1}. [${a.source || 'Unknown'}] ${a.title}. ${a.description || ''}`
      ).join('\n');

      const locationStr = Array.isArray(country) ? country.join(', ') : country;
      const contextStr = [
        topic ? `Topic: "${topic}"` : null,
        locationStr ? `Region: ${locationStr}` : null
      ].filter(Boolean).join(' | ') || 'General news';

      const prompt = `You are a senior news analyst. Analyse these ${top.length} recent news articles (${contextStr}) and extract the most important trends, developments, and key facts.

Generate 10 to 15 concise bullet points. Each bullet should be a distinct, informative insight — not a repeat of a headline.

Return ONLY a JSON object with this exact structure:
{
  "en": ["Point 1 in English", "Point 2 in English", ...],
  "ar": ["النقطة الأولى بالعربية", "النقطة الثانية بالعربية", ...]
}

Rules:
- Each bullet: 1 sentence, max 20 words
- Cover different angles: events, trends, reactions, statistics if available
- Arabic bullets should be proper Modern Standard Arabic translations
- Do not number the bullets in the text

Articles:
${articleText}`;

      const result = await callGemini(prompt, { temperature: 0.4, maxOutputTokens: 2048, jsonMode: true });

      const usage = result.usageMetadata;
      const cost = estimateCost(usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0);
      dailyCost += cost;
      totalCalls++;

      console.log(`📰 Briefing: ${contextStr} (${top.length} articles) → $${cost.toFixed(6)}`);

      const parsed = JSON.parse(result.text);

      return parsed;
    } catch (error) {
      console.error('summarizeArticles failed:', error.message);
      return summaryFallback(articles);
    }
  });

  // Normalise after cache retrieval too (handles old cached string format)
  if (raw && !Array.isArray(raw.en)) raw.en = raw.en ? [raw.en] : [];
  if (raw && !Array.isArray(raw.ar)) raw.ar = raw.ar ? [raw.ar] : [];
  return raw;
}

/**
 * Fallback when budget exceeded or API fails — returns article titles as bullet points
 */
function summaryFallback(articles) {
  const points = articles.slice(0, 10).map(a => a.title).filter(Boolean);
  return { en: points, ar: points };
}

/**
 * Batch translate multiple terms
 */
async function batchTranslate(terms, targetLang = 'ar') {
  if (!terms || terms.length === 0 || isBudgetExceeded()) {
    return {};
  }

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

  if (uncached.length > 0) {
    try {
      const prompt = `Translate these terms to ${targetLang}:
${uncached.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return a JSON object: { "term1": "translation1", "term2": "translation2", ... }`;

      const result = await callGemini(prompt, { temperature: 0.3, maxOutputTokens: 300, jsonMode: true, systemInstruction: 'You are a translator.' });

      const usage = result.usageMetadata;
      const cost = estimateCost(usage?.promptTokenCount || 0, usage?.candidatesTokenCount || 0);
      dailyCost += cost;
      totalCalls++;

      const translations = JSON.parse(result.text);
      Object.assign(results, translations);

      for (const [term, translation] of Object.entries(translations)) {
        const cacheKey = `translate:${term}:${targetLang}`;
        const cacheValue = { original: term, translations: { [targetLang]: translation }, variations: [] };
        memoryCache.set(cacheKey, cacheValue);
        await LLMCache.set(cacheKey, 'translation', term, cacheValue, 7 * 24 * 60 * 60);
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
    provider: 'gemini',
    model: MODEL,
    totalCalls,
    cacheHitRate: totalRequests > 0 ? cacheHits / totalRequests : 0,
    costToday: dailyCost,
    budgetRemaining: Math.max(0, DAILY_BUDGET - dailyCost),
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
