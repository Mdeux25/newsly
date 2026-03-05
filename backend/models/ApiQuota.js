const db = require('../config/database');

class ApiQuota {
  /**
   * Get quota information for an API
   * @param {string} apiName - API name (e.g., 'NewsAPI', 'GNews')
   * @returns {Promise<Object>} Quota information
   */
  static async getQuota(apiName) {
    const [rows] = await db.query(
      'SELECT * FROM api_quotas WHERE api_name = ? LIMIT 1',
      [apiName]
    );

    if (rows.length === 0) {
      // Create default quota if not exists
      return await this.createQuota(apiName, 100);
    }

    const quota = rows[0];

    // Auto-reset if past reset time
    if (new Date() >= new Date(quota.reset_time)) {
      await this.resetQuota(apiName);
      return await this.getQuota(apiName);
    }

    return {
      apiName: quota.api_name,
      dailyLimit: quota.daily_limit,
      currentUsage: quota.current_usage,
      remaining: quota.daily_limit - quota.current_usage,
      resetTime: quota.reset_time,
      lastUpdated: quota.last_updated
    };
  }

  /**
   * Create a new API quota entry
   * @param {string} apiName - API name
   * @param {number} dailyLimit - Daily request limit
   * @returns {Promise<Object>} Created quota
   */
  static async createQuota(apiName, dailyLimit = 100) {
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    await db.query(
      `INSERT INTO api_quotas (api_name, daily_limit, current_usage, reset_time)
       VALUES (?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE daily_limit = ?`,
      [apiName, dailyLimit, resetTime, dailyLimit]
    );

    return await this.getQuota(apiName);
  }

  /**
   * Check if API can make a request (has quota remaining)
   * @param {string} apiName - API name
   * @param {number} requestCount - Number of requests to check for (default 1)
   * @returns {Promise<boolean>} True if request can be made
   */
  static async canMakeRequest(apiName, requestCount = 1) {
    const quota = await this.getQuota(apiName);
    return quota.remaining >= requestCount;
  }

  /**
   * Increment API usage
   * @param {string} apiName - API name
   * @param {number} count - Number of requests to add (default 1)
   * @returns {Promise<Object>} Updated quota information
   */
  static async incrementUsage(apiName, count = 1) {
    // Check if quota exists
    const quota = await this.getQuota(apiName);

    // Increment usage
    await db.query(
      'UPDATE api_quotas SET current_usage = current_usage + ? WHERE api_name = ?',
      [count, apiName]
    );

    return await this.getQuota(apiName);
  }

  /**
   * Reset quota for an API (usually called at midnight)
   * @param {string} apiName - API name
   * @returns {Promise<Object>} Reset quota information
   */
  static async resetQuota(apiName) {
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    await db.query(
      `UPDATE api_quotas
       SET current_usage = 0, reset_time = ?
       WHERE api_name = ?`,
      [resetTime, apiName]
    );

    return await this.getQuota(apiName);
  }

  /**
   * Reset all quotas (called daily at midnight)
   * @returns {Promise<number>} Number of quotas reset
   */
  static async resetAllQuotas() {
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    const [result] = await db.query(
      'UPDATE api_quotas SET current_usage = 0, reset_time = ?',
      [resetTime]
    );

    console.log(`🔄 Reset ${result.affectedRows} API quotas`);
    return result.affectedRows;
  }

  /**
   * Get all API quotas
   * @returns {Promise<Array>} Array of all quota information
   */
  static async getAllQuotas() {
    const [rows] = await db.query('SELECT * FROM api_quotas ORDER BY api_name');

    return rows.map(quota => ({
      apiName: quota.api_name,
      dailyLimit: quota.daily_limit,
      currentUsage: quota.current_usage,
      remaining: quota.daily_limit - quota.current_usage,
      percentUsed: quota.daily_limit > 0 ? (quota.current_usage / quota.daily_limit) * 100 : 0,
      resetTime: quota.reset_time,
      lastUpdated: quota.last_updated
    }));
  }

  /**
   * Update daily limit for an API
   * @param {string} apiName - API name
   * @param {number} newLimit - New daily limit
   * @returns {Promise<Object>} Updated quota information
   */
  static async updateLimit(apiName, newLimit) {
    await db.query(
      'UPDATE api_quotas SET daily_limit = ? WHERE api_name = ?',
      [newLimit, apiName]
    );

    return await this.getQuota(apiName);
  }

  /**
   * Get quota usage statistics
   * @returns {Promise<Object>} Usage statistics
   */
  static async getUsageStats() {
    const quotas = await this.getAllQuotas();

    const totalLimit = quotas.reduce((sum, q) => sum + q.dailyLimit, 0);
    const totalUsed = quotas.reduce((sum, q) => sum + q.currentUsage, 0);
    const totalRemaining = quotas.reduce((sum, q) => sum + q.remaining, 0);

    return {
      totalLimit,
      totalUsed,
      totalRemaining,
      percentUsed: totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0,
      quotas
    };
  }
}

module.exports = ApiQuota;
