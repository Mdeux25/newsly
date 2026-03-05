/**
 * LLM Cache Model
 *
 * Manages database-level caching for LLM API responses
 * Part of 3-tier cache strategy: Memory → Database (this) → API
 */

const db = require('../config/database');

class LLMCache {
  /**
   * Get cached LLM result from database
   *
   * @param {string} cacheKey - Cache key
   * @param {string} cacheType - Type: 'translation', 'semantic', 'trending'
   * @returns {Promise<Object|null>} - Cached result or null
   */
  static async get(cacheKey, cacheType) {
    try {
      const [rows] = await db.query(
        `SELECT output_json, hit_count, expires_at
         FROM llm_cache
         WHERE cache_key = ? AND cache_type = ?
         LIMIT 1`,
        [cacheKey, cacheType]
      );

      if (rows.length === 0) {
        return null;
      }

      const cached = rows[0];

      // Check if expired
      if (cached.expires_at && new Date(cached.expires_at) < new Date()) {
        // Delete expired entry
        await this.delete(cacheKey);
        return null;
      }

      // Increment hit count and update last accessed
      await db.query(
        `UPDATE llm_cache
         SET hit_count = hit_count + 1,
             last_accessed = NOW()
         WHERE cache_key = ?`,
        [cacheKey]
      );

      // Parse and return JSON
      return JSON.parse(cached.output_json);

    } catch (error) {
      console.error('LLMCache.get error:', error.message);
      return null;
    }
  }

  /**
   * Store LLM result in database cache
   *
   * @param {string} cacheKey - Cache key
   * @param {string} cacheType - Type: 'translation', 'semantic', 'trending'
   * @param {string} inputText - Original input text
   * @param {Object} outputData - Result to cache
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {Promise<boolean>} - Success status
   */
  static async set(cacheKey, cacheType, inputText, outputData, expiresIn = 604800) {
    try {
      const outputJson = JSON.stringify(outputData);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await db.query(
        `INSERT INTO llm_cache (cache_key, cache_type, input_text, output_json, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           output_json = VALUES(output_json),
           expires_at = VALUES(expires_at),
           last_accessed = NOW()`,
        [cacheKey, cacheType, inputText, outputJson, expiresAt]
      );

      return true;

    } catch (error) {
      console.error('LLMCache.set error:', error.message);
      return false;
    }
  }

  /**
   * Increment hit count for a cache entry
   *
   * @param {string} cacheKey - Cache key
   * @returns {Promise<void>}
   */
  static async incrementHitCount(cacheKey) {
    try {
      await db.query(
        `UPDATE llm_cache
         SET hit_count = hit_count + 1,
             last_accessed = NOW()
         WHERE cache_key = ?`,
        [cacheKey]
      );
    } catch (error) {
      console.error('LLMCache.incrementHitCount error:', error.message);
    }
  }

  /**
   * Delete a specific cache entry
   *
   * @param {string} cacheKey - Cache key
   * @returns {Promise<void>}
   */
  static async delete(cacheKey) {
    try {
      await db.query(
        'DELETE FROM llm_cache WHERE cache_key = ?',
        [cacheKey]
      );
    } catch (error) {
      console.error('LLMCache.delete error:', error.message);
    }
  }

  /**
   * Clean up expired cache entries
   * Should be run periodically (e.g., daily cron job)
   *
   * @returns {Promise<number>} - Number of deleted entries
   */
  static async cleanupExpired() {
    try {
      const [result] = await db.query(
        'DELETE FROM llm_cache WHERE expires_at < NOW()'
      );

      const deletedCount = result.affectedRows || 0;
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} expired LLM cache entries`);
      }

      return deletedCount;

    } catch (error) {
      console.error('LLMCache.cleanupExpired error:', error.message);
      return 0;
    }
  }

  /**
   * Get cache statistics
   *
   * @returns {Promise<Object>} - { totalEntries, totalHits, byType: {} }
   */
  static async getStats() {
    try {
      const [rows] = await db.query(
        `SELECT
           cache_type,
           COUNT(*) as entry_count,
           SUM(hit_count) as total_hits,
           AVG(hit_count) as avg_hits,
           MIN(created_at) as oldest_entry,
           MAX(last_accessed) as last_access
         FROM llm_cache
         GROUP BY cache_type`
      );

      const byType = {};
      let totalEntries = 0;
      let totalHits = 0;

      rows.forEach(row => {
        byType[row.cache_type] = {
          entryCount: row.entry_count,
          totalHits: row.total_hits,
          avgHits: parseFloat(row.avg_hits).toFixed(2),
          oldestEntry: row.oldest_entry,
          lastAccess: row.last_access
        };
        totalEntries += row.entry_count;
        totalHits += row.total_hits;
      });

      return {
        totalEntries,
        totalHits,
        byType
      };

    } catch (error) {
      console.error('LLMCache.getStats error:', error.message);
      return { totalEntries: 0, totalHits: 0, byType: {} };
    }
  }

  /**
   * Clear all cache entries of a specific type
   *
   * @param {string} cacheType - Type to clear
   * @returns {Promise<number>} - Number of deleted entries
   */
  static async clearType(cacheType) {
    try {
      const [result] = await db.query(
        'DELETE FROM llm_cache WHERE cache_type = ?',
        [cacheType]
      );

      return result.affectedRows || 0;

    } catch (error) {
      console.error('LLMCache.clearType error:', error.message);
      return 0;
    }
  }

  /**
   * Get most popular cached items
   *
   * @param {number} limit - Number of items to return
   * @returns {Promise<Array>} - Top cached items by hit count
   */
  static async getTopCached(limit = 10) {
    try {
      const [rows] = await db.query(
        `SELECT cache_type, input_text, hit_count, created_at, last_accessed
         FROM llm_cache
         ORDER BY hit_count DESC
         LIMIT ?`,
        [limit]
      );

      return rows;

    } catch (error) {
      console.error('LLMCache.getTopCached error:', error.message);
      return [];
    }
  }
}

module.exports = LLMCache;
