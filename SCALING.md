# Scaling News Aggregator to 100k Users

## Architecture Overview

Instead of fetching news on every user request, use a **background worker** that fetches news periodically and stores it in a database. Users read from the database, not the API.

```
┌─────────────────┐
│  Background     │ ──fetches every 15min──> ┌──────────────┐
│  Worker (Cron)  │                           │  News APIs   │
└─────────────────┘                           └──────────────┘
        │
        │ stores articles
        ▼
┌─────────────────┐
│   PostgreSQL    │
│   or MongoDB    │
└─────────────────┘
        │
        │ reads cached articles
        ▼
┌─────────────────┐
│  100k Users     │
│  via API        │
└─────────────────┘
```

## Implementation Plan

### **Phase 1: Add Database Layer**

**Install Dependencies:**
```bash
npm install pg sequelize
# or
npm install mongodb mongoose
```

**Database Schema:**
```sql
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500),
  description TEXT,
  url VARCHAR(1000) UNIQUE,
  image_url VARCHAR(1000),
  source VARCHAR(200),
  published_at TIMESTAMP,
  country VARCHAR(2),
  language VARCHAR(2),
  category VARCHAR(50),
  content TEXT,
  fetched_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_country (country),
  INDEX idx_published_at (published_at),
  INDEX idx_language (language)
);

CREATE TABLE fetch_logs (
  id SERIAL PRIMARY KEY,
  api_name VARCHAR(50),
  country VARCHAR(2),
  topic VARCHAR(100),
  articles_count INT,
  status VARCHAR(20),
  error_message TEXT,
  fetched_at TIMESTAMP DEFAULT NOW()
);
```

### **Phase 2: Background Worker**

**Create Worker Script:** `backend/workers/news-fetcher.js`

```javascript
const cron = require('node-cron');
const { fetchAndStoreNews } = require('./fetch-news');

// Fetch news every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('🔄 Starting news fetch cycle...');

  const topics = ['technology', 'politics', 'business', 'world', 'health'];
  const countries = ['us', 'gb', 'sa', 'ae', 'eg', 'in', 'cn', 'jp'];

  for (const country of countries) {
    for (const topic of topics) {
      try {
        await fetchAndStoreNews(country, topic);
        await sleep(2000); // Avoid rate limits
      } catch (error) {
        console.error(`Error fetching ${topic} for ${country}:`, error);
      }
    }
  }

  console.log('✅ News fetch cycle complete');
});

// Cleanup old articles (keep last 7 days)
cron.schedule('0 2 * * *', async () => {
  await cleanupOldArticles(7);
});
```

### **Phase 3: API Rate Optimization**

**Smart Fetching Strategy:**

1. **Prioritize Popular Topics**
   - Fetch "breaking news" more frequently (every 5 min)
   - Fetch niche topics less frequently (every hour)

2. **Use Multiple APIs**
   ```javascript
   const API_POOL = [
     { name: 'NewsAPI', key: process.env.NEWSAPI_KEY, limit: 100 },
     { name: 'GNews', key: process.env.GNEWS_KEY, limit: 100 },
     { name: 'Currents', key: process.env.CURRENTS_KEY, limit: 600 },
     { name: 'NewsData', key: process.env.NEWSDATA_KEY, limit: 200 }
   ];
   ```

3. **Round-Robin API Selection**
   - Distribute requests across multiple APIs
   - Track usage per API
   - Switch to next API when limit reached

### **Phase 4: Caching Strategy**

**Multi-Layer Caching:**

```javascript
// Layer 1: In-Memory Cache (Node.js)
const NodeCache = require('node-cache');
const memCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

// Layer 2: Redis (Distributed)
const redis = require('redis');
const redisClient = redis.createClient();

// Layer 3: Database (Persistent)
const db = require('./database');

async function getArticles(country, topic) {
  // Try memory cache first
  let articles = memCache.get(`${country}_${topic}`);
  if (articles) return articles;

  // Try Redis cache
  articles = await redisClient.get(`${country}_${topic}`);
  if (articles) {
    memCache.set(`${country}_${topic}`, JSON.parse(articles));
    return JSON.parse(articles);
  }

  // Load from database
  articles = await db.getArticles({ country, topic, limit: 50 });

  // Cache in Redis and memory
  await redisClient.set(`${country}_${topic}`, JSON.stringify(articles), 'EX', 600);
  memCache.set(`${country}_${topic}`, articles);

  return articles;
}
```

### **Phase 5: CDN for Static Content**

**Use Cloudflare or AWS CloudFront:**
- Cache API responses at edge locations
- Serve 90% of requests from CDN
- Only 10% hit your origin server

**Example with Cloudflare:**
```javascript
// Add cache headers
res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
res.set('CDN-Cache-Control', 'max-age=600'); // 10 minutes for CDN
res.json({ articles });
```

## Cost Analysis for 100k Users

### **Scenario: 100k daily active users**

**Assumptions:**
- Each user loads news 5 times/day
- Total requests: 500k/day
- Unique topics/countries: 100 combinations

### **Option 1: Background Worker + Database (Recommended)**

**Costs:**
- Database (PostgreSQL): $25/month (DigitalOcean/Render)
- Redis Cache: $15/month (Redis Cloud)
- Server (2GB RAM): $12/month (DigitalOcean)
- NewsAPI Developer: $449/month (250k requests/month)
- Additional APIs: $100/month (aggregated)
- **Total: ~$600/month**

**API Usage:**
- Fetch 100 topic/country combos every 15 minutes
- = 100 × 96 (per day) = 9,600 API calls/day
- = ~290k API calls/month
- Well within paid tier limits!

### **Option 2: Multiple Free APIs + RSS Feeds (Budget)**

**Costs:**
- Database: $25/month
- Redis: $15/month
- Server: $12/month
- APIs: **FREE** (multiple free accounts + RSS)
- **Total: ~$52/month**

**Strategy:**
- 5 NewsAPI free accounts (5 × 100 = 500 requests/day)
- 3 GNews free accounts (3 × 100 = 300 requests/day)
- RSS feeds from major news sites (unlimited)
- = ~800 API requests + unlimited RSS
- Fetch every 30 minutes = 48 cycles/day
- = 16 requests per cycle (very manageable!)

### **Option 3: Web Scraping (Use with Caution)**

**Costs:**
- Same as Option 2: ~$52/month
- No API costs!

**Legal Considerations:**
- Only scrape sites that allow it (check robots.txt)
- Respect rate limits
- Add attribution
- Consider terms of service

## Recommended Architecture for Production

```javascript
// backend/config/news-sources.js
module.exports = {
  sources: [
    // Paid APIs (priority)
    { type: 'api', name: 'NewsAPI', quota: 250000 },

    // Free APIs (backup)
    { type: 'api', name: 'GNews1', quota: 100 },
    { type: 'api', name: 'GNews2', quota: 100 },

    // RSS Feeds (unlimited)
    { type: 'rss', url: 'https://rss.cnn.com/rss/edition.rss' },
    { type: 'rss', url: 'https://feeds.bbci.co.uk/news/rss.xml' },
    { type: 'rss', url: 'https://www.aljazeera.com/xml/rss/all.xml' }
  ]
};

// backend/workers/smart-fetcher.js
class SmartNewsFetcher {
  async fetchNews(country, topic) {
    // 1. Check if we have recent data in DB
    const cached = await db.getRecentArticles(country, topic, 15); // 15 min old
    if (cached.length >= 10) {
      return cached; // Fresh enough, return cached
    }

    // 2. Try RSS feeds first (free, unlimited)
    let articles = await this.fetchFromRSS(country, topic);

    // 3. If not enough articles, use APIs
    if (articles.length < 10) {
      articles = [...articles, ...await this.fetchFromAPIs(country, topic)];
    }

    // 4. Store in database
    await db.saveArticles(articles);

    return articles;
  }
}
```

## Performance Optimizations

### **1. Database Indexing**
```sql
CREATE INDEX idx_country_published ON articles(country, published_at DESC);
CREATE INDEX idx_topic_published ON articles(category, published_at DESC);
```

### **2. Query Optimization**
```javascript
// Bad: Fetch all, filter in memory
const articles = await db.getAllArticles();
const filtered = articles.filter(a => a.country === 'us');

// Good: Filter in database
const articles = await db.query(
  'SELECT * FROM articles WHERE country = $1 ORDER BY published_at DESC LIMIT 50',
  ['us']
);
```

### **3. Connection Pooling**
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});
```

## Monitoring & Alerts

**Track Key Metrics:**
- API quota usage per source
- Database query times
- Cache hit rates
- Articles freshness
- Error rates

**Set up alerts:**
```javascript
if (apiQuotaUsed > 80%) {
  alert('⚠️ NewsAPI quota at 80%, switch to backup sources');
}

if (articlesFreshness > 30minutes) {
  alert('⚠️ Articles getting stale, check worker');
}
```

## Quick Start Implementation

Run this to add background worker support:

```bash
cd ~/projects/news-aggregator/backend
npm install node-cron pg sequelize
```

I can help implement:
1. Database setup
2. Background worker
3. Redis caching
4. RSS feed integration
5. Multi-API load balancing

Which would you like me to implement first?
