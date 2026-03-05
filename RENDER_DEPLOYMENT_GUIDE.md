# 🚀 Newsly - Render.com Deployment Guide

Complete step-by-step guide to deploy Newsly to Render.com with Aiven MySQL.

---

## 📋 Prerequisites

✅ You have:
- GitHub repository: `https://github.com/Mdeux25/newsly`
- Aiven MySQL database created and running
- Render.com account
- OpenAI API key

---

## 🗄️ Your Aiven MySQL Connection Details

From your Aiven console, you have:

```
Database name: defaultdb (we'll create news_aggregator inside it)
Host:         mysql-128d5e0c-newsly-ai.d.aivencloud.com
Port:         11431
User:         avnadmin
Password:     [Copy from Aiven console - click the eye icon]
SSL mode:     REQUIRED
```

---

## 🔧 Step 1: Create `news_aggregator` Database

Before deploying, connect to your Aiven MySQL and create the database:

```bash
# Install MySQL client if you don't have it
brew install mysql  # macOS
# or: apt-get install mysql-client  # Linux
# or: Download from mysql.com  # Windows

# Connect to Aiven MySQL (copy password from Aiven console)
mysql -h mysql-128d5e0c-newsly-ai.d.aivencloud.com \
      -P 11431 \
      -u avnadmin \
      -p \
      --ssl-mode=REQUIRED

# Once connected, create the database
CREATE DATABASE news_aggregator;
USE news_aggregator;
SHOW DATABASES;  # Verify it's created
EXIT;
```

---

## 🚀 Step 2: Deploy to Render

### Option A: Deploy via Blueprint (Recommended)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git push origin main
   ```

2. **Go to Render Dashboard**: https://dashboard.render.com/

3. **Click "New +"** → **"Blueprint"**

4. **Connect GitHub Repository**:
   - Select: `Mdeux25/newsly`
   - Click "Connect"

5. **Review the Blueprint**:
   - Should show: 1 web service (**newsly**)
   - Plan: **Free**
   - No database service (we're using Aiven)

6. **Add Environment Variables**:

   Render will ask for these **sync: false** variables. Add them:

   **Database Password (REQUIRED)**:
   ```
   DB_PASSWORD = [Paste your Aiven password from the console]
   ```

   **API Keys (REQUIRED)**:
   ```
   NEWSAPI_KEY = [Your NewsAPI key from https://newsapi.org/]
   NEWSDATA_KEY = [Your NewsData key from https://newsdata.io/]
   OPENAI_API_KEY = [Your OpenAI key from https://platform.openai.com/api-keys]
   ```

   *(All other variables like DB_HOST, DB_PORT are already set in render.yaml)*

7. **Click "Apply"**

8. **Wait for Deployment** (5-10 minutes):
   - Render will build your Docker image
   - Connect to Aiven MySQL (via SSL)
   - Run database migrations automatically
   - Deploy the app

9. **Your App is Live!** 🎉
   - URL: `https://newsly-[random].onrender.com`
   - API: `https://newsly-[random].onrender.com/api/status`

---

### Option B: Manual Web Service Creation

If Blueprint doesn't work:

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Click "New +"** → **"Web Service"**

3. **Connect GitHub**:
   - Repository: `Mdeux25/newsly`
   - Branch: `main`

4. **Configure Service**:
   ```
   Name:              newsly
   Environment:       Docker
   Plan:              Free
   Dockerfile Path:   ./Dockerfile
   Health Check Path: /api/status
   ```

5. **Add ALL Environment Variables**:

   **Database (Aiven MySQL)**:
   ```
   DB_HOST = mysql-128d5e0c-newsly-ai.d.aivencloud.com
   DB_PORT = 11431
   DB_USER = avnadmin
   DB_PASSWORD = [Your Aiven password]
   DB_NAME = news_aggregator
   DB_SSL = true
   ```

   **API Keys**:
   ```
   NEWSAPI_KEY = 3c625d41c30049f785169bc0c2a3ac1f
   NEWSDATA_KEY = pub_cb9ac8dd080d42bfa6894eb57f4bad9b
   OPENAI_API_KEY = sk-proj-METP...your-key...
   ```

   **OpenAI Config**:
   ```
   OPENAI_MODEL = gpt-4o-mini
   LLM_CACHE_ENABLED = true
   LLM_DAILY_BUDGET = 1.00
   ```

   **Server Config**:
   ```
   NODE_ENV = production
   PORT = 10000
   ```

   **Worker Config**:
   ```
   FETCH_INTERVAL_MINUTES = 15
   ARTICLE_RETENTION_DAYS = 7
   MAX_ARTICLES_PER_FETCH = 50
   ```

6. **Click "Create Web Service"**

7. **Wait for deployment** (5-10 minutes)

---

## ✅ Step 3: Verify Deployment

Once deployed, test your app:

### 1. Check API Status
```bash
curl https://newsly-[your-url].onrender.com/api/status
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0",
  "llm": {
    "enabled": true,
    "model": "gpt-4o-mini",
    "cacheHitRate": 0.0,
    "totalCalls": 0
  }
}
```

### 2. Visit the App
Open in browser: `https://newsly-[your-url].onrender.com`

You should see:
- ✅ Newsly logo and interface
- ✅ Map with clickable regions
- ✅ Search bar with smart search toggle
- ✅ Trending topics

### 3. Test Smart Search
1. Search for "iran" with smart search enabled
2. You should see both English and Arabic articles
3. Check console logs for LLM cache status

---

## 📊 Step 4: Import Your Existing Data (Optional)

If you want to import your 316 existing articles:

```bash
# From your local machine
mysql -h mysql-128d5e0c-newsly-ai.d.aivencloud.com \
      -P 11431 \
      -u avnadmin \
      -p \
      --ssl-mode=REQUIRED \
      news_aggregator < backups/newsly_backup_latest.sql
```

Or use a compressed backup:
```bash
gunzip -c backups/newsly_backup_*.sql.gz | \
  mysql -h mysql-128d5e0c-newsly-ai.d.aivencloud.com \
        -P 11431 \
        -u avnadmin \
        -p \
        --ssl-mode=REQUIRED \
        news_aggregator
```

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets
Your `.gitignore` already protects `.env`, but double-check:
```bash
git log --all --full-history -- .env
# Should show nothing
```

### 2. Rotate API Keys Regularly
- OpenAI: Monthly rotation recommended
- News APIs: Check usage limits

### 3. Enable Render Notifications
In Render dashboard:
- Settings → Notifications
- Enable deployment failure alerts

---

## 📈 Monitoring & Maintenance

### Check Logs
```bash
# In Render Dashboard → Your Service → Logs
# Or use Render CLI:
render logs -f newsly
```

### Monitor Costs

**OpenAI Usage**:
```bash
# Check LLM stats
curl https://newsly-[your-url].onrender.com/api/status | jq '.llm'
```

Expected costs:
- LLM: ~$0.50/month (with 95% cache hit rate)
- Render: $0/month (free tier)
- Aiven: $0/month (free tier)
- **Total: ~$0.50/month** 🎉

### Database Maintenance

**Check size**:
```sql
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = 'news_aggregator'
ORDER BY (data_length + index_length) DESC;
```

**Manual cleanup** (if needed):
```sql
-- Remove articles older than 30 days
DELETE FROM articles WHERE published_at < DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Clean expired LLM cache
DELETE FROM llm_cache WHERE expires_at < NOW();

-- Clean old trending data
DELETE FROM trending_locations WHERE last_updated < DATE_SUB(NOW(), INTERVAL 1 DAY);
```

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"

**Cause**: SSL connection issue or wrong credentials

**Fix**:
1. Verify DB_SSL=true in Render env vars
2. Check password (copy fresh from Aiven)
3. Ensure `news_aggregator` database exists in Aiven
4. Check Render logs for specific error

### Issue: "LLM service unavailable"

**Cause**: OpenAI API key invalid or budget exceeded

**Fix**:
1. Verify OPENAI_API_KEY is correct
2. Check OpenAI dashboard for API usage
3. Verify budget not exceeded ($1.00 daily limit)

### Issue: "App is slow to respond"

**Cause**: Free tier cold start (15 min inactivity)

**Expected**: First request after sleep takes ~30 seconds
**Solution**: Upgrade to Starter plan ($7/month) for always-on

### Issue: "Port already in use" (local dev)

**Fix**:
```bash
lsof -ti:3001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

---

## 🔄 CI/CD: Auto-Deploy on Git Push

Render automatically deploys when you push to `main` branch:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Render will automatically:
# 1. Detect the push
# 2. Build new Docker image
# 3. Deploy (zero downtime)
# 4. Run migrations if needed
```

**Deployment time**: ~5 minutes

---

## 📊 Cost Breakdown

| Service | Plan | Cost | What You Get |
|---------|------|------|--------------|
| **Render Web** | Free | $0 | 512 MB RAM, sleeps after 15 min |
| **Aiven MySQL** | Hobbyist | $0 | 1 GB storage, SSL, backups |
| **OpenAI API** | Pay-as-you-go | ~$0.50/mo | GPT-4o-mini, 95% cache hit rate |
| **Total** | | **~$0.50/month** | Full-featured news aggregator! |

### Upgrade Options

**Render Starter ($7/month)**:
- 512 MB RAM (shared)
- Always on (no cold starts)
- Worth it if you have regular users

**Aiven Startup ($9/month)**:
- 2 GB storage
- Better performance
- Daily backups
- Only needed if you exceed 1GB

---

## 🎯 Deployment Checklist

- [x] Aiven MySQL created (1GB free)
- [x] `news_aggregator` database created in Aiven
- [ ] Code pushed to GitHub (`git push origin main`)
- [ ] Render Blueprint deployed
- [ ] Environment variables added (DB_PASSWORD, API keys)
- [ ] Deployment successful (check logs)
- [ ] API status endpoint working
- [ ] Frontend loads correctly
- [ ] Smart search works (test "iran")
- [ ] Map shows trending locations
- [ ] (Optional) Existing data imported

---

## 🚀 You're Live!

Your Newsly app is now deployed at:
```
https://newsly-[random].onrender.com
```

**Features working**:
- ✅ Smart cross-language search (English + Arabic)
- ✅ Weighted ranking algorithm
- ✅ Trending topics with alarm bell animation
- ✅ Interactive map with location filters
- ✅ Auto-refresh every 15 minutes
- ✅ LLM-powered semantic search
- ✅ 95% cache hit rate (low costs!)

**Next steps**:
1. Share your app URL
2. Monitor OpenAI costs in first week
3. Consider upgrading if you get regular traffic

---

**Questions?** Check:
- Render logs for deployment issues
- Aiven console for database status
- `/api/status` endpoint for system health

**Happy news aggregating! 🎉**
