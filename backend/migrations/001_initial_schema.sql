-- News Aggregator Database Schema
-- Version: 1.0
-- Description: Initial schema with articles, fetch logs, API quotas, and tweets

-- Table: articles
-- Stores all fetched news articles with metadata and classification
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  url VARCHAR(1000) NOT NULL,
  image_url VARCHAR(1000),
  source VARCHAR(200) NOT NULL,
  author VARCHAR(200),
  content TEXT,
  published_at DATETIME NOT NULL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Classification
  country VARCHAR(2),            -- us, gb, sa, etc.
  language VARCHAR(2) DEFAULT 'en',  -- en, ar
  region VARCHAR(20),            -- us, eu, middleeast
  category VARCHAR(50),          -- technology, politics, etc.

  -- Metadata
  is_translated BOOLEAN DEFAULT FALSE,
  original_language VARCHAR(2),
  translation_quality FLOAT,

  -- Indexing for fast queries
  UNIQUE INDEX idx_url (url(768)),  -- Prefix index for URL uniqueness (768 chars * 4 bytes = 3072 bytes max)
  INDEX idx_country_published (country, published_at DESC),
  INDEX idx_language_published (language, published_at DESC),
  INDEX idx_region_published (region, published_at DESC),
  INDEX idx_category_published (category, published_at DESC),
  INDEX idx_source (source),
  INDEX idx_fetched_at (fetched_at),
  INDEX idx_published_at (published_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: fetch_logs
-- Logs every fetch attempt for monitoring and debugging
CREATE TABLE IF NOT EXISTS fetch_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_name VARCHAR(50) NOT NULL,      -- NewsAPI, GNews, RSS, Twitter
  endpoint VARCHAR(200),               -- /v2/top-headlines, etc.
  country VARCHAR(2),
  topic VARCHAR(100),
  language VARCHAR(2),

  articles_fetched INT DEFAULT 0,
  articles_stored INT DEFAULT 0,      -- After deduplication
  status VARCHAR(20) NOT NULL,        -- success, error, rate_limit
  error_message TEXT,
  response_time_ms INT,

  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_api_status (api_name, status),
  INDEX idx_fetched_at (fetched_at),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: api_quotas
-- Tracks API usage and rate limits
CREATE TABLE IF NOT EXISTS api_quotas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_name VARCHAR(50) UNIQUE NOT NULL,
  daily_limit INT NOT NULL,
  current_usage INT DEFAULT 0,
  reset_time DATETIME NOT NULL,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_api_name (api_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: tweets
-- Stores tweets related to news topics
CREATE TABLE IF NOT EXISTS tweets (
  id BIGINT PRIMARY KEY,              -- Twitter tweet ID
  text TEXT NOT NULL,
  author_id BIGINT NOT NULL,
  author_name VARCHAR(200),
  author_username VARCHAR(200),
  author_verified BOOLEAN DEFAULT FALSE,

  like_count INT DEFAULT 0,
  retweet_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,

  created_at DATETIME NOT NULL,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Association with news topic
  related_topic VARCHAR(200),

  INDEX idx_created_at (created_at DESC),
  INDEX idx_author (author_username),
  INDEX idx_topic (related_topic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed initial API quota data
INSERT INTO api_quotas (api_name, daily_limit, current_usage, reset_time) VALUES
('NewsAPI', 100, 0, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)),
('GNews', 100, 0, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)),
('Twitter', 500, 0, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE
  daily_limit = VALUES(daily_limit),
  reset_time = VALUES(reset_time);
