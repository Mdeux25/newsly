-- LLM Features Migration
-- Version: 2.0
-- Description: Add LLM cache, trending locations, and search optimization

-- Table: llm_cache
-- Caches LLM API responses for cost optimization (3-tier: memory → database → API)
CREATE TABLE IF NOT EXISTS llm_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_type ENUM('translation', 'semantic', 'trending') NOT NULL,
  input_text VARCHAR(500) NOT NULL,
  output_json TEXT NOT NULL,
  hit_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,

  INDEX idx_key_type (cache_key, cache_type),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: trending_locations
-- Stores trending topics by country for map visualization
CREATE TABLE IF NOT EXISTS trending_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  article_count INT DEFAULT 0,
  recency_score FLOAT DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_country_score (country_code, recency_score DESC),
  INDEX idx_updated (last_updated)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add search_vector column to articles for optimized full-text search
-- This will be populated by the smartSearch() method
-- Note: We check if column exists to avoid errors on re-run
SET @dbname = DATABASE();
SET @tablename = 'articles';
SET @columnname = 'search_vector';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE articles ADD COLUMN search_vector TEXT AFTER content'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add fulltext index for search_vector (skip if exists)
SET @indexname = 'idx_search_vector';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE articles ADD FULLTEXT INDEX idx_search_vector (search_vector)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Optimize existing indexes for smart search (weighted ranking)
-- Add composite index for language + published_at for faster filtering
SET @indexname2 = 'idx_lang_pub';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (index_name = @indexname2)
  ) > 0,
  'SELECT 1',
  'ALTER TABLE articles ADD INDEX idx_lang_pub (language, published_at DESC)'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Seed OpenAI quota tracking
INSERT INTO api_quotas (api_name, daily_limit, current_usage, reset_time) VALUES
('OpenAI', 1000, 0, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE
  daily_limit = VALUES(daily_limit),
  reset_time = VALUES(reset_time);
