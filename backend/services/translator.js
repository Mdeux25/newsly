const axios = require('axios');
const NodeCache = require('node-cache');

// Cache translations for 1 hour
const cache = new NodeCache({ stdTTL: 3600 });

// Using LibreTranslate (free, open-source translation API)
const LIBRE_TRANSLATE_URL = 'https://libretranslate.com/translate';

// Fallback: Using MyMemory Translation API (free, no key required)
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

async function translateText(text, targetLang = 'ar', sourceLang = 'en') {
  if (!text || text.trim() === '') return text;

  const cacheKey = `translate_${sourceLang}_${targetLang}_${text.substring(0, 50)}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Returning cached translation');
    return cached;
  }

  try {
    // Try LibreTranslate first
    const result = await translateWithLibre(text, targetLang, sourceLang);
    if (result) {
      cache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error('LibreTranslate error:', error.message);
  }

  try {
    // Fallback to MyMemory
    const result = await translateWithMyMemory(text, targetLang, sourceLang);
    if (result) {
      cache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    console.error('MyMemory translation error:', error.message);
  }

  // If all fails, return original text
  return text;
}

async function translateWithLibre(text, targetLang, sourceLang) {
  try {
    const response = await axios.post(LIBRE_TRANSLATE_URL, {
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text'
    }, {
      timeout: 5000
    });

    return response.data.translatedText;
  } catch (error) {
    throw error;
  }
}

async function translateWithMyMemory(text, targetLang, sourceLang) {
  try {
    const response = await axios.get(MYMEMORY_URL, {
      params: {
        q: text,
        langpair: `${sourceLang}|${targetLang}`
      },
      timeout: 5000
    });

    if (response.data.responseStatus === 200) {
      return response.data.responseData.translatedText;
    }
    throw new Error('Translation failed');
  } catch (error) {
    throw error;
  }
}

// Batch translate article fields
async function translateArticle(article, targetLang = 'ar') {
  try {
    const [translatedTitle, translatedDescription] = await Promise.all([
      translateText(article.title, targetLang),
      translateText(article.description, targetLang)
    ]);

    return {
      ...article,
      title: translatedTitle,
      description: translatedDescription,
      originalTitle: article.title,
      originalDescription: article.description,
      translated: true,
      translatedTo: targetLang
    };
  } catch (error) {
    console.error('Error translating article:', error);
    return article;
  }
}

module.exports = { translateText, translateArticle };
