const db = require('../config/database');

class FetchLog {
  /**
   * Create a fetch log entry
   * @param {Object} logData - Log data
   * @returns {Promise<Object>} Created log with ID
   */
  static async create(logData) {
    const {
      api_name,
      endpoint,
      country,
      topic,
      language,
      articles_fetched = 0,
      articles_stored = 0,
      status,
      error_message,
      response_time_ms
    } = logData;

    try {
      const [result] = await db.query(
        `INSERT INTO fetch_logs
        (api_name, endpoint, country, topic, language, articles_fetched, articles_stored,
         status, error_message, response_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [api_name, endpoint, country, topic, language, articles_fetched, articles_stored,
         status, error_message, response_time_ms]
      );

      return { id: result.insertId, ...logData };
    } catch (error) {
      console.error('Error creating fetch log:', error.message);
      throw error;
    }
  }

  /**
   * Get recent fetch logs
   * @param {number} hours - Look back period in hours
   * @param {string} apiName - Optional filter by API name
   * @returns {Promise<Array>} Array of fetch logs
   */
  static async getRecentLogs(hours = 24, apiName = null) {
    const minDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    let query = 'SELECT * FROM fetch_logs WHERE fetched_at >= ?';
    const params = [minDate];

    if (apiName) {
      query += ' AND api_name = ?';
      params.push(apiName);
    }

    query += ' ORDER BY fetched_at DESC LIMIT 100';

    const [rows] = await db.query(query, params);
    return rows;
  }

  /**
   * Get error rate for an API
   * @param {string} apiName - API name
   * @param {number} hours - Look back period in hours
   * @returns {Promise<Object>} Error rate statistics
   */
  static async getErrorRate(apiName, hours = 24) {
    const minDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [rows] = await db.query(
      `SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN status = 'rate_limit' THEN 1 ELSE 0 END) as rate_limits,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
        AVG(response_time_ms) as avg_response_time,
        SUM(articles_fetched) as total_articles_fetched,
        SUM(articles_stored) as total_articles_stored
       FROM fetch_logs
       WHERE api_name = ? AND fetched_at >= ?`,
      [apiName, minDate]
    );

    const result = rows[0];
    return {
      apiName,
      totalRequests: result.total_requests,
      errors: result.errors,
      rateLimits: result.rate_limits,
      successes: result.successes,
      errorRate: result.total_requests > 0 ? (result.errors / result.total_requests) * 100 : 0,
      avgResponseTime: Math.round(result.avg_response_time || 0),
      totalArticlesFetched: result.total_articles_fetched,
      totalArticlesStored: result.total_articles_stored
    };
  }

  /**
   * Get summary statistics for all APIs
   * @param {number} hours - Look back period in hours
   * @returns {Promise<Array>} Array of API statistics
   */
  static async getSummary(hours = 24) {
    const minDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const [rows] = await db.query(
      `SELECT
        api_name,
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN status = 'rate_limit' THEN 1 ELSE 0 END) as rate_limits,
        AVG(response_time_ms) as avg_response_time,
        SUM(articles_fetched) as total_articles_fetched,
        SUM(articles_stored) as total_articles_stored
       FROM fetch_logs
       WHERE fetched_at >= ?
       GROUP BY api_name
       ORDER BY total_requests DESC`,
      [minDate]
    );

    return rows.map(row => ({
      apiName: row.api_name,
      totalRequests: row.total_requests,
      successes: row.successes,
      errors: row.errors,
      rateLimits: row.rate_limits,
      successRate: row.total_requests > 0 ? (row.successes / row.total_requests) * 100 : 0,
      avgResponseTime: Math.round(row.avg_response_time || 0),
      totalArticlesFetched: row.total_articles_fetched,
      totalArticlesStored: row.total_articles_stored
    }));
  }

  /**
   * Clean up old logs (keep only recent history)
   * @param {number} daysOld - Delete logs older than this many days
   * @returns {Promise<number>} Number of deleted logs
   */
  static async deleteOldLogs(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const [result] = await db.query(
      'DELETE FROM fetch_logs WHERE fetched_at < ?',
      [cutoffDate]
    );

    return result.affectedRows;
  }
}

module.exports = FetchLog;
