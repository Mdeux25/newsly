-- News Aggregator Database Schema (PostgreSQL)
-- Version: 1.0

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  url VARCHAR(1000) NOT NULL UNIQUE,
  image_url VARCHAR(1000),
  source VARCHAR(200) NOT NULL,
  author VARCHAR(200),
  content TEXT,
  search_vector TEXT,
  published_at TIMESTAMP NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  country VARCHAR(2),
  language VARCHAR(2) DEFAULT 'en',
  region VARCHAR(20),
  category VARCHAR(50),

  is_translated BOOLEAN DEFAULT FALSE,
  original_language VARCHAR(2),
  translation_quality FLOAT
);

CREATE INDEX IF NOT EXISTS idx_country_published ON articles(country, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_language_published ON articles(language, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_region_published ON articles(region, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_category_published ON articles(category, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_fetched_at ON articles(fetched_at);
CREATE INDEX IF NOT EXISTS idx_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_lang_pub ON articles(language, published_at DESC);

CREATE TABLE IF NOT EXISTS fetch_logs (
  id SERIAL PRIMARY KEY,
  api_name VARCHAR(50) NOT NULL,
  endpoint VARCHAR(200),
  country VARCHAR(2),
  topic VARCHAR(100),
  language VARCHAR(2),
  articles_fetched INT DEFAULT 0,
  articles_stored INT DEFAULT 0,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  response_time_ms INT,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fetch_logs_api_status ON fetch_logs(api_name, status);
CREATE INDEX IF NOT EXISTS idx_fetch_logs_fetched_at ON fetch_logs(fetched_at);
CREATE INDEX IF NOT EXISTS idx_fetch_logs_status ON fetch_logs(status);

CREATE TABLE IF NOT EXISTS api_quotas (
  id SERIAL PRIMARY KEY,
  api_name VARCHAR(50) UNIQUE NOT NULL,
  daily_limit INT NOT NULL,
  current_usage INT DEFAULT 0,
  reset_time TIMESTAMP NOT NULL,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tweets (
  id BIGINT PRIMARY KEY,
  text TEXT NOT NULL,
  author_id BIGINT NOT NULL,
  author_name VARCHAR(200),
  author_username VARCHAR(200),
  author_verified BOOLEAN DEFAULT FALSE,
  like_count INT DEFAULT 0,
  retweet_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  related_topic VARCHAR(200)
);

CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_author ON tweets(author_username);
CREATE INDEX IF NOT EXISTS idx_tweets_topic ON tweets(related_topic);

-- Seed initial API quota data
INSERT INTO api_quotas (api_name, daily_limit, current_usage, reset_time) VALUES
('NewsAPI',  100, 0, CURRENT_DATE + INTERVAL '1 day'),
('NewsData', 200, 0, CURRENT_DATE + INTERVAL '1 day'),
('GNews',    100, 0, CURRENT_DATE + INTERVAL '1 day'),
('Twitter',  500, 0, CURRENT_DATE + INTERVAL '1 day')
ON CONFLICT (api_name) DO UPDATE SET
  daily_limit = EXCLUDED.daily_limit,
  reset_time  = EXCLUDED.reset_time;
