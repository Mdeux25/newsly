-- Migration 004: Facebook posting tracking
ALTER TABLE articles ADD COLUMN IF NOT EXISTS fb_posted_at TIMESTAMP DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_articles_fb_not_posted ON articles(published_at DESC)
  WHERE fb_posted_at IS NULL;
