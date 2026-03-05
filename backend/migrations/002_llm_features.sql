-- LLM Features Migration (PostgreSQL)
-- Version: 2.0

CREATE TABLE IF NOT EXISTS llm_cache (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) UNIQUE NOT NULL,
  cache_type VARCHAR(20) NOT NULL CHECK (cache_type IN ('translation', 'semantic', 'trending')),
  input_text VARCHAR(500) NOT NULL,
  output_json TEXT NOT NULL,
  hit_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_key_type ON llm_cache(cache_key, cache_type);
CREATE INDEX IF NOT EXISTS idx_llm_expires ON llm_cache(expires_at);

CREATE TABLE IF NOT EXISTS trending_locations (
  id SERIAL PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  topic VARCHAR(200) NOT NULL,
  article_count INT DEFAULT 0,
  recency_score FLOAT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trending_country_score ON trending_locations(country_code, recency_score DESC);
CREATE INDEX IF NOT EXISTS idx_trending_updated ON trending_locations(last_updated);

-- Seed OpenAI quota
INSERT INTO api_quotas (api_name, daily_limit, current_usage, reset_time) VALUES
('OpenAI', 1000, 0, CURRENT_DATE + INTERVAL '1 day')
ON CONFLICT (api_name) DO UPDATE SET
  daily_limit = EXCLUDED.daily_limit,
  reset_time  = EXCLUDED.reset_time;
