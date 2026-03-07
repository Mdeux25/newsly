const db = require('../config/database');

class Article {
  /**
   * Create a new article
   * @param {Object} articleData - Article data
   * @returns {Promise<Object>} Created article with ID
   */
  static async create(articleData) {
    const {
      title,
      description,
      url,
      image_url,
      source,
      author,
      content,
      published_at,
      country,
      language = 'en',
      region,
      category,
      is_translated = false,
      original_language,
      translation_quality
    } = articleData;

    try {
      const [result] = await db.query(
        `INSERT INTO articles
        (title, description, url, image_url, source, author, content, published_at,
         country, language, region, category, is_translated, original_language, translation_quality)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, url, image_url, source, author, content, published_at,
         country, language, region, category, is_translated, original_language, translation_quality]
      );

      return { id: result.insertId, ...articleData };
    } catch (error) {
      // Duplicate URL - ignore
      if (error.code === '23505') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Bulk create articles (efficient for batch inserts)
   * @param {Array<Object>} articles - Array of article data
   * @returns {Promise<Object>} Result with inserted and skipped counts
   */
  static async bulkCreate(articles) {
    if (!articles || articles.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    let inserted = 0;
    let skipped = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < articles.length; i += batchSize) {
      const batch = articles.slice(i, i + batchSize);

      for (const article of batch) {
        try {
          const result = await this.create(article);
          if (result) {
            inserted++;
            // Generate embedding asynchronously — never blocks ingestion
            const llm = require('../services/llm');
            llm.embedArticle(result.id, article.title, article.description)
              .catch(e => console.warn(`⚠️  Embedding failed for ${result.id}:`, e.message));
          } else {
            skipped++; // Duplicate URL
          }
        } catch (error) {
          console.error('Error inserting article:', error.message);
          skipped++;
        }
      }
    }

    return { inserted, skipped };
  }

  /**
   * Find article by URL
   * @param {string} url - Article URL
   * @returns {Promise<Object|null>} Article or null
   */
  static async findByUrl(url) {
    const [rows] = await db.query(
      'SELECT * FROM articles WHERE url = ? LIMIT 1',
      [url]
    );
    return rows[0] || null;
  }

  /**
   * Semantic search using cosine similarity on embedding vectors.
   * Falls back gracefully if no embeddings exist yet.
   */
  static async semanticSearch(queryVector, filters = {}, limit = 20, offset = 0) {
    const { language, minDate } = filters;
    const vectorStr = `[${queryVector.join(',')}]`;

    const conditions = ['embedding IS NOT NULL'];
    const filterParams = [];

    if (language) { conditions.push('language = ?'); filterParams.push(language); }
    if (minDate)   { conditions.push('published_at >= ?'); filterParams.push(minDate); }

    // Param order: vectorStr (for SELECT distance), filter params, limit, offset
    const params = [vectorStr, ...filterParams, limit, offset];

    const [rows] = await db.query(
      `SELECT *, (embedding <=> ?) AS distance
       FROM articles
       WHERE ${conditions.join(' AND ')}
       ORDER BY distance ASC
       LIMIT ? OFFSET ?`,
      params
    );
    return rows;
  }

  static async countSemantic(queryVector, filters = {}) {
    const { language, minDate } = filters;
    const vectorStr = `[${queryVector.join(',')}]`;

    const conditions = ['embedding IS NOT NULL'];
    const filterParams = [];

    if (language) { conditions.push('language = ?'); filterParams.push(language); }
    if (minDate)   { conditions.push('published_at >= ?'); filterParams.push(minDate); }

    // Param order: filter params, vectorStr (for WHERE distance), threshold
    const params = [...filterParams, vectorStr, 0.6];

    const [rows] = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM articles
       WHERE ${conditions.join(' AND ')} AND (embedding <=> ?) < ?`,
      params
    );
    return rows[0]?.total || 0;
  }

  static async findBySlug(slug) {
    const terms = slug.split('-').filter(w => w.length > 2);
    if (terms.length === 0) return null;
    const conditions = terms.map(() => 'title ILIKE ?').join(' AND ');
    const params = terms.map(t => `%${t}%`);
    const [rows] = await db.query(
      `SELECT * FROM articles WHERE ${conditions} ORDER BY published_at DESC LIMIT 1`,
      params
    );
    return rows[0] || null;
  }

  /**
   * Find recent articles with filters
   * @param {Object} filters - Filter options
   * @param {number} limit - Max number of articles
   * @param {number} offset - Number of articles to skip (for pagination)
   * @returns {Promise<Array>} Array of articles
   */
  static async findRecent(filters = {}, limit = 50, offset = 0) {
    const { country, language, region, category, topic, minDate } = filters;

    let query = "SELECT * FROM articles WHERE NOT (source = 'Al Jazeera' AND language = 'en' AND (image_url IS NULL OR image_url = ''))";
    const params = [];

    if (country) {
      if (Array.isArray(country)) {
        query += ` AND country IN (${country.map(() => '?').join(',')})`;
        params.push(...country);
      } else {
        query += ' AND country = ?';
        params.push(country);
      }
    }

    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (topic) {
      query += ' AND (title ILIKE ? OR description ILIKE ?)';
      const searchTerm = `%${topic}%`;
      params.push(searchTerm, searchTerm);
    }

    if (minDate) {
      query += ' AND published_at >= ?';
      params.push(minDate);
    }

    query += ' ORDER BY published_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Count articles matching filters (for pagination)
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total count of matching articles
   */
  static async countArticles(filters = {}) {
    const { country, language, region, category, topic, minDate } = filters;

    let query = 'SELECT COUNT(*)::int AS total FROM articles WHERE 1=1';
    const params = [];

    if (country) {
      if (Array.isArray(country)) {
        query += ` AND country IN (${country.map(() => '?').join(',')})`;
        params.push(...country);
      } else {
        query += ' AND country = ?';
        params.push(country);
      }
    }

    if (language) {
      query += ' AND language = ?';
      params.push(language);
    }

    if (region) {
      query += ' AND region = ?';
      params.push(region);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (topic) {
      query += ' AND (title ILIKE ? OR description ILIKE ?)';
      const searchTerm = `%${topic}%`;
      params.push(searchTerm, searchTerm);
    }

    if (minDate) {
      query += ' AND published_at >= ?';
      params.push(minDate);
    }

    const [rows] = await db.query(query, params);
    return rows[0].total;
  }

  /**
   * Find articles by country
   * @param {string} country - Country code (e.g., 'us', 'gb')
   * @param {number} limit - Max number of articles
   * @returns {Promise<Array>} Array of articles
   */
  static async findByCountry(country, limit = 50) {
    const [rows] = await db.query(
      'SELECT * FROM articles WHERE country = ? ORDER BY published_at DESC LIMIT ?',
      [country, limit]
    );
    return rows;
  }

  /**
   * Find articles by topic (searches title and description)
   * @param {string} topic - Search term
   * @param {number} limit - Max number of articles
   * @returns {Promise<Array>} Array of articles
   */
  static async findByTopic(topic, limit = 50) {
    const searchTerm = `%${topic}%`;
    const [rows] = await db.query(
      `SELECT * FROM articles
       WHERE title LIKE ? OR description LIKE ?
       ORDER BY published_at DESC LIMIT ?`,
      [searchTerm, searchTerm, limit]
    );
    return rows;
  }

  /**
   * Get trending topics (most frequent keywords in recent articles)
   * @param {number} hours - Look back period in hours
   * @param {number} limit - Max number of topics
   * @returns {Promise<Array>} Array of trending topics with counts
   */
  static async getTrendingTopics(hours = 24, limit = 10) {
    const minDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [rows] = await db.query(
      `SELECT category, COUNT(*)::int AS count
       FROM articles
       WHERE published_at >= ? AND category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC
       LIMIT ?`,
      [minDate, limit]
    );
    return rows;
  }

  /**
   * Get article statistics
   * @returns {Promise<Object>} Statistics object
   */
  static async getStats() {
    const [totalRows] = await db.query('SELECT COUNT(*)::int AS total FROM articles');
    const [todayRows] = await db.query(
      'SELECT COUNT(*)::int AS today FROM articles WHERE DATE(fetched_at) = CURRENT_DATE'
    );
    const [sourceRows] = await db.query(
      'SELECT source, COUNT(*) as count FROM articles GROUP BY source ORDER BY count DESC LIMIT 10'
    );
    const [countryRows] = await db.query(
      'SELECT country, COUNT(*) as count FROM articles WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC'
    );

    return {
      total: totalRows[0].total,
      today: todayRows[0].today,
      topSources: sourceRows,
      byCountry: countryRows
    };
  }

  /**
   * Delete old articles
   * @param {number} daysOld - Delete articles older than this many days
   * @returns {Promise<number>} Number of deleted articles
   */
  static async deleteOldArticles(daysOld = 7) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const [result] = await db.query(
      'DELETE FROM articles WHERE published_at < ?',
      [cutoffDate]
    );

    return result.affectedRows;
  }

  /**
   * Check if database has recent articles (for staleness check)
   * @param {number} minutes - Freshness threshold in minutes
   * @returns {Promise<boolean>} True if has recent articles
   */
  static async hasRecentArticles(minutes = 30) {
    const minDate = new Date(Date.now() - minutes * 60 * 1000);

    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM articles WHERE fetched_at >= ?',
      [minDate]
    );

    return rows[0].count > 0;
  }

  /**
   * Smart cross-language search with weighted ranking
   * Uses LLM to translate query and find articles in multiple languages
   *
   * Ranking weights:
   * - English title match: 4
   * - English description match: 3
   * - Arabic title match: 2
   * - Arabic description match: 1
   * - Recency boost: Newer articles score higher
   *
   * @param {string} query - Search term
   * @param {Object} filters - Language, country, region, etc.
   * @param {number} limit - Max results
   * @param {number} offset - Pagination offset
   * @returns {Promise<Array>} Articles with relevance scores
   */
  static async smartSearch(query, filters = {}, limit = 20, offset = 0) {
    if (!query || query.trim().length === 0) {
      return this.findRecent(filters, limit, offset);
    }

    try {
      // Get translations from LLM service
      const llm = require('../services/llm');
      const { translations, variations: rawVariations } = await llm.translateQuery(query, ['en', 'ar']);
      const variations = Array.isArray(rawVariations) ? rawVariations : [];

      // Build search terms for each language
      const enTerms = [translations.en, ...variations.filter(v => this._isEnglish(v))].filter(Boolean);
      const arTerms = [translations.ar, ...variations.filter(v => !this._isEnglish(v))].filter(Boolean);

      // Build weighted SQL query
      let scoreSQL = '(0'; // Start with 0 and add scores

      // English title matches (weight: 4)
      if (enTerms.length > 0) {
        enTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'en' AND title ILIKE ? THEN 4 ELSE 0 END)";
        });
      }

      // English description matches (weight: 3)
      if (enTerms.length > 0) {
        enTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'en' AND description ILIKE ? THEN 3 ELSE 0 END)";
        });
      }

      // Arabic title matches (weight: 2)
      if (arTerms.length > 0) {
        arTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'ar' AND title ILIKE ? THEN 2 ELSE 0 END)";
        });
      }

      // Arabic description matches (weight: 1)
      if (arTerms.length > 0) {
        arTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'ar' AND description ILIKE ? THEN 1 ELSE 0 END)";
        });
      }

      scoreSQL += ')'; // Close the score calculation

      // Add recency boost: score * (1.0 + (1 - daysSincePublished/7) * 0.5)
      // Recent articles (< 1 day) get up to 50% boost
      scoreSQL = `(${scoreSQL}) * (1.0 + GREATEST(0, (1 - EXTRACT(EPOCH FROM (NOW() - published_at)) / 604800.0)) * 0.5)`;

      // Build complete query — use subquery so we can filter on relevance_score alias
      let innerQuery = `SELECT *, ${scoreSQL} AS relevance_score FROM articles WHERE 1=1`;
      const params = [];

      // Add all search term parameters (in order matching the SQL)
      enTerms.forEach(term => params.push(`%${term}%`)); // English titles
      enTerms.forEach(term => params.push(`%${term}%`)); // English descriptions
      arTerms.forEach(term => params.push(`%${term}%`)); // Arabic titles
      arTerms.forEach(term => params.push(`%${term}%`)); // Arabic descriptions

      // Add filters
      if (filters.language) {
        innerQuery += ' AND language = ?';
        params.push(filters.language);
      }

      if (filters.country) {
        if (Array.isArray(filters.country)) {
          innerQuery += ` AND country IN (${filters.country.map(() => '?').join(',')})`;
          params.push(...filters.country);
        } else {
          innerQuery += ' AND country = ?';
          params.push(filters.country);
        }
      }

      if (filters.region) {
        innerQuery += ' AND region = ?';
        params.push(filters.region);
      }

      if (filters.minDate) {
        innerQuery += ' AND published_at >= ?';
        params.push(filters.minDate);
      }

      // Wrap in subquery so we can filter on the alias relevance_score
      const sqlQuery = `SELECT * FROM (${innerQuery}) AS scored WHERE relevance_score > 0 ORDER BY relevance_score DESC, published_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await db.query(sqlQuery, params);
      return rows;

    } catch (error) {
      console.error('Smart search error:', error.message);
      // Fallback to simple search
      return this.findRecent({ ...filters, topic: query }, limit, offset);
    }
  }

  /**
   * Count articles matching smart search criteria
   * @param {string} query - Search term
   * @param {Object} filters - Filter options
   * @returns {Promise<number>} Total count
   */
  static async countSmartSearch(query, filters = {}) {
    if (!query || query.trim().length === 0) {
      return this.countArticles(filters);
    }

    try {
      const llm = require('../services/llm');
      const { translations, variations: rawVariations } = await llm.translateQuery(query, ['en', 'ar']);
      const variations = Array.isArray(rawVariations) ? rawVariations : [];

      const enTerms = [translations.en, ...variations.filter(v => this._isEnglish(v))].filter(Boolean);
      const arTerms = [translations.ar, ...variations.filter(v => !this._isEnglish(v))].filter(Boolean);

      // Build score SQL (same as smartSearch)
      let scoreSQL = '(0';
      if (enTerms.length > 0) {
        enTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'en' AND title ILIKE ? THEN 4 ELSE 0 END)";
        });
        enTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'en' AND description ILIKE ? THEN 3 ELSE 0 END)";
        });
      }
      if (arTerms.length > 0) {
        arTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'ar' AND title ILIKE ? THEN 2 ELSE 0 END)";
        });
        arTerms.forEach(() => {
          scoreSQL += " + (CASE WHEN language = 'ar' AND description ILIKE ? THEN 1 ELSE 0 END)";
        });
      }
      scoreSQL += ')';
      scoreSQL = `(${scoreSQL}) * (1.0 + GREATEST(0, (1 - EXTRACT(EPOCH FROM (NOW() - published_at)) / 604800.0)) * 0.5)`;

      let innerQuery = `SELECT ${scoreSQL} AS relevance_score FROM articles WHERE 1=1`;
      const params = [];

      enTerms.forEach(term => params.push(`%${term}%`));
      enTerms.forEach(term => params.push(`%${term}%`));
      arTerms.forEach(term => params.push(`%${term}%`));
      arTerms.forEach(term => params.push(`%${term}%`));

      if (filters.language) {
        innerQuery += ' AND language = ?';
        params.push(filters.language);
      }

      if (filters.country) {
        if (Array.isArray(filters.country)) {
          innerQuery += ` AND country IN (${filters.country.map(() => '?').join(',')})`;
          params.push(...filters.country);
        } else {
          innerQuery += ' AND country = ?';
          params.push(filters.country);
        }
      }

      if (filters.region) {
        innerQuery += ' AND region = ?';
        params.push(filters.region);
      }

      if (filters.minDate) {
        innerQuery += ' AND published_at >= ?';
        params.push(filters.minDate);
      }

      const sqlQuery = `SELECT COUNT(*)::int AS total FROM (${innerQuery}) AS scored WHERE relevance_score > 0`;

      const [rows] = await db.query(sqlQuery, params);
      return rows[0].total;

    } catch (error) {
      console.error('Smart search count error:', error.message);
      return this.countArticles({ ...filters, topic: query });
    }
  }

  /**
   * Save LLM-generated Arabic translation for an article
   * @param {string} url - Article URL (primary key lookup)
   * @param {string} titleAr - Arabic title
   * @param {string} descriptionAr - Arabic description
   */
  static async saveTranslation(url, titleAr, descriptionAr) {
    await db.query(
      'UPDATE articles SET title_ar = ?, description_ar = ? WHERE url = ?',
      [titleAr || null, descriptionAr || null, url]
    );
  }

  static async markAsPosted(id) {
    await db.query('UPDATE articles SET fb_posted_at = NOW() WHERE id = ?', [id]);
  }

  static async selectForFacebook(limit = 3) {
    const [rows] = await db.query(
      `SELECT * FROM (
         SELECT DISTINCT ON (a.title) a.*,
           CASE WHEN tl.country_code IS NOT NULL THEN 1 ELSE 0 END AS is_trending
         FROM articles a
         LEFT JOIN trending_locations tl
           ON tl.country_code = a.country
           AND tl.last_updated >= NOW() - INTERVAL '1 hour'
         WHERE a.fb_posted_at IS NULL
           AND a.image_url IS NOT NULL
           AND a.published_at > NOW() - INTERVAL '24 hours'
           AND a.language IN ('en', 'ar')
         ORDER BY a.title, is_trending DESC, a.published_at DESC
       ) deduped
       ORDER BY is_trending DESC, published_at DESC
       LIMIT ?`,
      [limit]
    );
    return rows;
  }

  /**
   * Helper: Check if text is primarily English (simple heuristic)
   * @param {string} text - Text to check
   * @returns {boolean} True if appears to be English
   */
  static _isEnglish(text) {
    if (!text) return true;
    // Simple heuristic: if more than 80% of characters are Latin alphabet
    const latinChars = text.match(/[a-zA-Z]/g) || [];
    return latinChars.length / text.length > 0.8;
  }
}

module.exports = Article;
