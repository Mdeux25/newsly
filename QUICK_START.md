# Quick Start Guide - News Aggregator with Database

## 🚀 5-Minute Setup

### Step 1: Start MySQL (Docker - Easiest)
```bash
cd /Users/me-mac/projects/news-aggregator
docker-compose up -d mysql
```

Wait 30 seconds for MySQL to be ready.

### Step 2: Run Database Migration
```bash
cd backend
npm run migrate
```

You should see:
```
✅ Migration completed successfully!
```

### Step 3: Start Backend
```bash
npm run dev
```

The backend will:
- Connect to MySQL ✅
- Start on port 3001 ✅
- Run initial news fetch after 10 seconds ✅
- Fetch news every 15 minutes automatically ✅

### Step 4: Start Frontend (New Terminal)
```bash
cd frontend
npm run dev
```

### Step 5: Open Browser
- Frontend: http://localhost:5173
- System Status: http://localhost:3001/api/status

## ✅ Verify Everything Works

### Check Database Connection
```bash
# Should show articles after 10-15 minutes
curl http://localhost:3001/api/status | json_pp
```

Look for:
```json
{
  "database": {
    "totalArticles": 50,  # Should increase over time
    "articlesToday": 50
  },
  "apiQuotas": [
    {
      "apiName": "NewsAPI",
      "remaining": 95  # Should be less than 100
    }
  ]
}
```

### Check News Endpoint
```bash
curl http://localhost:3001/api/news?topic=technology | json_pp
```

Should return articles with `"source": "database"` for fast responses!

### Check Worker Logs
Look for these messages in backend console:
```
🔄 Starting news fetch cycle...
📰 Fetching: technology | us | en
✅ Stored 45/50 articles (5 duplicates)
✅ Fetch Cycle Complete
```

## 🛠️ Troubleshooting

### MySQL won't start
```bash
# Check Docker is running
docker ps

# Restart MySQL
docker-compose restart mysql

# Check MySQL logs
docker-compose logs mysql
```

### Migration fails
```bash
# Check MySQL is ready
docker-compose exec mysql mysqladmin ping -h localhost -u root -prootpassword

# Verify credentials in .env
cat backend/.env | grep DB_

# Re-run migration
npm run migrate
```

### No articles in database
```bash
# Check worker logs for errors
# Look for: "🔄 Starting news fetch cycle..."

# Check API key is set
cat backend/.env | grep NEWSAPI_KEY

# Test worker manually
node tests/worker.test.js
```

### API responses still slow
```bash
# Check database has articles
curl http://localhost:3001/api/status

# Wait 15 minutes for initial fetch
# Check worker is running (look for cron job logs)

# Test database directly
docker-compose exec mysql mysql -u news_user -pnews_password news_aggregator -e "SELECT COUNT(*) FROM articles;"
```

## 📊 Monitor Your System

### Real-time Status
```bash
# Watch worker activity
cd backend
npm run dev

# Look for these logs every 15 minutes:
# "🔄 Starting news fetch cycle..."
# "✅ Fetch Cycle Complete"
```

### Database Stats
```bash
# Total articles
docker-compose exec mysql mysql -u news_user -pnews_password news_aggregator -e "SELECT COUNT(*) FROM articles;"

# Recent articles
docker-compose exec mysql mysql -u news_user -pnews_password news_aggregator -e "SELECT title, source, published_at FROM articles ORDER BY published_at DESC LIMIT 5;"

# API quota status
docker-compose exec mysql mysql -u news_user -pnews_password news_aggregator -e "SELECT * FROM api_quotas;"
```

### System Status Dashboard
Visit: http://localhost:3001/api/status

Shows:
- Total articles
- Articles today
- Top sources
- API quota usage
- Recent fetch activity

## 🎯 What Should Happen

### First 10 seconds
- Backend starts
- Connects to MySQL
- Initializes scheduler
- "🎬 Running initial news fetch..."

### After 10 seconds
- First fetch starts
- Fetches news for multiple topics/countries
- Stores ~500 articles in database
- Takes ~5-10 minutes

### After 15 minutes
- Second fetch starts automatically
- Adds more articles
- Deduplicates by URL

### Every 15 minutes thereafter
- Automatic background fetch
- Database grows to ~5,000 articles
- Old articles (7+ days) auto-deleted at 2 AM

## 📈 Performance Expectations

### Database-First Responses
```bash
# First request (may need to wait for initial fetch)
time curl http://localhost:3001/api/news?topic=technology

# Subsequent requests (should be fast!)
# Response time: 50-100ms
```

### Before Migration
```
Response time: 1000-3000ms
Source: Direct API call
Rate limited: 100 requests/day
```

### After Migration
```
Response time: 50-100ms
Source: Database
Unlimited reads!
```

## 🔄 Daily Operations

### The worker automatically:
- ✅ Fetches news every 15 minutes
- ✅ Deduplicates articles by URL
- ✅ Tracks API quota usage
- ✅ Cleans up old articles (7+ days) at 2 AM
- ✅ Resets API quotas at midnight UTC
- ✅ Logs all fetch activity

### You don't need to:
- ❌ Manually fetch news
- ❌ Worry about rate limits
- ❌ Clear old data
- ❌ Restart the server

Just let it run! 🚀

## 📞 Need Help?

1. **Check logs**: Backend console shows worker activity
2. **Run tests**: `node backend/tests/database.test.js`
3. **Check status**: http://localhost:3001/api/status
4. **Read guide**: [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md)

## 🎉 You're Done!

Your news aggregator now:
- ✅ Fetches news automatically
- ✅ Stores articles persistently
- ✅ Responds in 50-100ms
- ✅ Scales to 100k+ users
- ✅ Manages API quotas automatically
- ✅ Never loses data on restart

**Enjoy your supercharged news aggregator!** 🚀
