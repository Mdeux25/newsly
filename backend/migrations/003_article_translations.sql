-- Add pre-computed Arabic translation columns to articles table
-- Translations are generated on-demand by Gemini and cached here permanently
ALTER TABLE articles ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS description_ar TEXT;

-- Index for quickly finding untranslated articles (background jobs can use this)
CREATE INDEX IF NOT EXISTS idx_articles_needs_translation
  ON articles (id)
  WHERE title_ar IS NULL AND language = 'en';
