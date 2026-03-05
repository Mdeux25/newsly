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
      if (error.code === 'ER_DUP_ENTRY') {
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
   * Find recent articles with filters
   * @param {Object} filters - Filter options
   * @param {number} limit - Max number of articles
   * @param {number} offset - Number of articles to skip (for pagination)
   * @returns {Promise<Array>} Array of articles
   */
  static async findRecent(filters = {}, limit = 50, offset = 0) {
    const { country, language, region, category, topic, minDate } = filters;

    let query = 'SELECT * FROM articles WHERE 1=1';
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
      query += ' AND (title LIKE ? OR description LIKE ?)';
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

    let query = 'SELECT COUNT(*) as total FROM articles WHERE 1=1';
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
      query += ' AND (title LIKE ? OR description LIKE ?)';
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
      `SELECT category, COUNT(*) as count
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
    const [totalRows] = await db.query('SELECT COUNT(*) as total FROM articles');
    const [todayRows] = await db.query(
      'SELECT COUNT(*) as today FROM articles WHERE DATE(created_at) = CURDATE()'
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
      const { translations, variations } = await llm.translateQuery(query, ['en', 'ar']);

      // Build search terms for each language
      const enTerms = [translations.en, ...variations.filter(v => this._isEnglish(v))].filter(Boolean);
      const arTerms = [translations.ar, ...variations.filter(v => !this._isEnglish(v))].filter(Boolean);

      // Build weighted SQL query
      let scoreSQL = '(0'; // Start with 0 and add scores

      // English title matches (weight: 4)
      if (enTerms.length > 0) {
        enTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "en" AND title LIKE ? THEN 4 ELSE 0 END)';
        });
      }

      // English description matches (weight: 3)
      if (enTerms.length > 0) {
        enTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "en" AND description LIKE ? THEN 3 ELSE 0 END)';
        });
      }

      // Arabic title matches (weight: 2)
      if (arTerms.length > 0) {
        arTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "ar" AND title LIKE ? THEN 2 ELSE 0 END)';
        });
      }

      // Arabic description matches (weight: 1)
      if (arTerms.length > 0) {
        arTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "ar" AND description LIKE ? THEN 1 ELSE 0 END)';
        });
      }

      scoreSQL += ')'; // Close the score calculation

      // Add recency boost: score * (1.0 + (1 - daysSincePublished/7) * 0.5)
      // Recent articles (< 1 day) get up to 50% boost
      scoreSQL = `(${scoreSQL}) * (1.0 + GREATEST(0, (1 - DATEDIFF(NOW(), published_at) / 7)) * 0.5)`;

      // Build complete query
      let sqlQuery = `SELECT *, ${scoreSQL} AS relevance_score FROM articles WHERE 1=1`;
      const params = [];

      // Add all search term parameters (in order matching the SQL)
      enTerms.forEach(term => params.push(`%${term}%`)); // English titles
      enTerms.forEach(term => params.push(`%${term}%`)); // English descriptions
      arTerms.forEach(term => params.push(`%${term}%`)); // Arabic titles
      arTerms.forEach(term => params.push(`%${term}%`)); // Arabic descriptions

      // Add filters
      if (filters.language) {
        sqlQuery += ' AND language = ?';
        params.push(filters.language);
      }

      if (filters.country) {
        if (Array.isArray(filters.country)) {
          sqlQuery += ` AND country IN (${filters.country.map(() => '?').join(',')})`;
          params.push(...filters.country);
        } else {
          sqlQuery += ' AND country = ?';
          params.push(filters.country);
        }
      }

      if (filters.region) {
        sqlQuery += ' AND region = ?';
        params.push(filters.region);
      }

      if (filters.minDate) {
        sqlQuery += ' AND published_at >= ?';
        params.push(filters.minDate);
      }

      // Only include articles with relevance score > 0
      sqlQuery += ' HAVING relevance_score > 0';
      sqlQuery += ' ORDER BY relevance_score DESC, published_at DESC';
      sqlQuery += ' LIMIT ? OFFSET ?';
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
      const { translations, variations } = await llm.translateQuery(query, ['en', 'ar']);

      const enTerms = [translations.en, ...variations.filter(v => this._isEnglish(v))].filter(Boolean);
      const arTerms = [translations.ar, ...variations.filter(v => !this._isEnglish(v))].filter(Boolean);

      // Build score SQL (same as smartSearch)
      let scoreSQL = '(0';
      if (enTerms.length > 0) {
        enTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "en" AND title LIKE ? THEN 4 ELSE 0 END)';
        });
        enTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "en" AND description LIKE ? THEN 3 ELSE 0 END)';
        });
      }
      if (arTerms.length > 0) {
        arTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "ar" AND title LIKE ? THEN 2 ELSE 0 END)';
        });
        arTerms.forEach(() => {
          scoreSQL += ' + (CASE WHEN language = "ar" AND description LIKE ? THEN 1 ELSE 0 END)';
        });
      }
      scoreSQL += ')';
      scoreSQL = `(${scoreSQL}) * (1.0 + GREATEST(0, (1 - DATEDIFF(NOW(), published_at) / 7)) * 0.5)`;

      let sqlQuery = `SELECT COUNT(*) as total FROM (SELECT ${scoreSQL} AS relevance_score FROM articles WHERE 1=1`;
      const params = [];

      enTerms.forEach(term => params.push(`%${term}%`));
      enTerms.forEach(term => params.push(`%${term}%`));
      arTerms.forEach(term => params.push(`%${term}%`));
      arTerms.forEach(term => params.push(`%${term}%`));

      if (filters.language) {
        sqlQuery += ' AND language = ?';
        params.push(filters.language);
      }

      if (filters.country) {
        if (Array.isArray(filters.country)) {
          sqlQuery += ` AND country IN (${filters.country.map(() => '?').join(',')})`;
          params.push(...filters.country);
        } else {
          sqlQuery += ' AND country = ?';
          params.push(filters.country);
        }
      }

      if (filters.region) {
        sqlQuery += ' AND region = ?';
        params.push(filters.region);
      }

      if (filters.minDate) {
        sqlQuery += ' AND published_at >= ?';
        params.push(filters.minDate);
      }

      sqlQuery += ' HAVING relevance_score > 0) AS scored_articles';

      const [rows] = await db.query(sqlQuery, params);
      return rows[0].total;

    } catch (error) {
      console.error('Smart search count error:', error.message);
      return this.countArticles({ ...filters, topic: query });
    }
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
