-- Newsly Database Migrations for Aiven MySQL
-- Run this file to create all necessary tables

USE news_aggregator;

-- 1. Articles Table
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  url VARCHAR(1000) NOT NULL UNIQUE,
  image_url VARCHAR(1000),
  published_at DATETIME,
  source VARCHAR(100),
  author VARCHAR(200),
  content TEXT,
  language VARCHAR(10) DEFAULT 'en',
  country VARCHAR(2),
  region VARCHAR(50),
  category VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_published (published_at DESC),
  INDEX idx_language (language),
  INDEX idx_country (country),
  INDEX idx_region (region),
  INDEX idx_category (category),
  FULLTEXT INDEX idx_title (title),
  FULLTEXT INDEX idx_description (description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Fetch Logs Table
CREATE TABLE IF NOT EXISTS fetch_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source VARCHAR(50) NOT NULL,
  articles_fetched INT DEFAULT 0,
  articles_saved INT DEFAULT 0,
  duplicates_skipped INT DEFAULT 0,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  fetch_duration_ms INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_source (source),
  INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. API Quotas Table
CREATE TABLE IF NOT EXISTS api_quotas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_name VARCHAR(50) NOT NULL UNIQUE,
  daily_limit INT NOT NULL,
  requests_today INT DEFAULT 0,
  last_reset DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_request DATETIME,
  INDEX idx_api_name (api_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. LLM Cache Table
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

-- 5. Trending Locations Table
CREATE TABLE IF NOT EXISTS trending_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  article_count INT DEFAULT 0,
  recency_score FLOAT DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_country_score (country_code, recency_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify tables were created
SHOW TABLES;

-- Check table structures
SELECT 'Articles table created' as status;
SELECT COUNT(*) as article_count FROM articles;
