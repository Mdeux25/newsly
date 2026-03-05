# 🆓 Newsly - 100% FREE Render Deployment

Deploy Newsly for **$0/month** using free tiers!

---

## 💰 Cost Breakdown

**With Free Database:**
- Render Web Service: **FREE** ✅
- Database: **FREE** ✅
- SSL/HTTPS: **FREE** ✅
- **Total: $0/month** 🎉

**Trade-offs:**
- ⚠️ App sleeps after 15 min inactivity (wakes up in ~30 seconds on first request)
- ⚠️ Database limited storage (varies by provider)
- ✅ Perfect for demos, testing, hobby projects

---

## 🗄️ FREE Database Options

Choose ONE of these free MySQL/PostgreSQL options:

### Option 1: Aiven (Recommended - MySQL)

**Why**: True MySQL, 1GB storage, reliable

1. Go to: https://aiven.io/
2. Sign up (free account)
3. Create service: MySQL
4. Plan: **Free (Hobbyist)**
5. Region: Choose closest to your Render region
6. Wait 5 minutes for setup
7. Get connection details:
   - Host: `xxx-xxx.aivencloud.com`
   - Port: `12345`
   - User: `avnadmin`
   - Password: (shown in dashboard)
   - Database: `defaultdb`

**Limits**: 1GB storage, 1 service

### Option 2: PlanetScale (Easy - MySQL Compatible)

**Why**: Generous free tier, great performance

1. Go to: https://planetscale.com/
2. Sign up (free account)
3. Create database: `newsly`
4. Get connection string
5. Convert to standard MySQL format:
   ```
   Host: aws.connect.psdb.cloud
   Port: 3306
   User: <from-planetscale>
   Password: <from-planetscale>
   Database: newsly
   ```

**Limits**: 1GB storage, 1 billion row reads/month

### Option 3: Railway (PostgreSQL - Requires Code Changes)

**Why**: Popular, easy setup

1. Go to: https://railway.app/
2. Sign up (free trial)
3. New Project → MySQL
4. Get connection details

**Limits**: $5 free credit/month (enough for hobby use)

### Option 4: Render PostgreSQL (PostgreSQL - Requires Code Changes)

**Why**: Same platform as your app

1. In Render Dashboard → New → PostgreSQL
2. Plan: **Free**
3. Get connection string

**Limits**: 256MB storage (very limited!)
**Note**: Need to convert app from MySQL to PostgreSQL

---

## 🚀 Deployment Steps (FREE)

### Step 1: Choose & Setup Free Database

I recommend **Aiven MySQL** (Option 1). Sign up and get your credentials:
- Host
- Port
- User
- Password
- Database name

### Step 2: Update render.yaml (Already Done!)

The render.yaml is now configured for FREE tier ✅

### Step 3: Commit and Push

```bash
git add render.yaml RENDER_FREE_DEPLOYMENT.md
git commit -m "chore: configure for free tier deployment"
git push origin main
```

### Step 4: Deploy to Render

1. **Go to**: https://dashboard.render.com/
2. **Click**: "New +" → "Blueprint"
3. **Select**: `Mdeux25/newsly`
4. **Review**: Should show only 1 service (newsly) - **FREE** plan

### Step 5: Add Environment Variables

In the Blueprint setup, add these:

**API Keys** (Required):
```bash
NEWSAPI_KEY=3c625d41c30049f785169bc0c2a3ac1f
NEWSDATA_KEY=pub_cb9ac8dd080d42bfa6894eb57f4bad9b
OPENAI_API_KEY=sk-proj-METP...your-actual-key...
```

**Database** (from your free provider):
```bash
DB_HOST=your-free-db-host.com
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=news_aggregator
```

### Step 6: Apply and Deploy

Click "**Apply**" - Render will:
- ✅ Build your Docker image
- ✅ Connect to your free database
- ✅ Run migrations automatically
- ✅ Deploy for FREE!

### Step 7: Import Your Database (Optional)

If you want your existing 316 articles:

```bash
# Connect to your free database from local machine
mysql -h your-free-db-host.com -P 3306 -u your-user -p

# Import your data
mysql -h your-free-db-host.com -P 3306 -u your-user -p news_aggregator < backups/newsly_backup.sql
```

---

## 🎯 Complete FREE Stack

**Your FREE stack**:
- ✅ Render Web Service (FREE tier)
- ✅ Aiven MySQL (FREE tier)
- ✅ GitHub (FREE)
- ✅ SSL/HTTPS (FREE)
- ✅ Auto-deploy (FREE)

**What you get**:
- Public URL: `https://newsly-xxx.onrender.com`
- Smart search with LLM
- Cross-language support
- Map with trending topics
- All Newsly features!

**Limitations**:
- App sleeps after 15 min (wakes in 30 sec)
- 1GB database storage
- Good for: demos, testing, hobby projects

---

## 📊 When to Upgrade?

**Stay FREE if**:
- Testing/demo
- < 100 users
- OK with cold starts
- Hobby project

**Upgrade to Starter ($7/month) if**:
- Production app
- Always-on needed
- > 100 daily users
- Need faster response

---

## 🔄 Alternative: Skip Blueprint, Deploy Manually

If Blueprint still shows costs, deploy manually (also FREE):

1. **Go to**: https://dashboard.render.com/
2. **Click**: "New +" → "Web Service"
3. **Connect**: GitHub → `Mdeux25/newsly`
4. **Configure**:
   - Name: `newsly`
   - Environment: `Docker`
   - Plan: **Free**
   - Dockerfile: `./Dockerfile`
5. **Add Environment Variables** (same as above)
6. **Create Web Service**

Result: Same FREE deployment! ✅

---

## 💡 Cost Optimization Tips

### OpenAI Costs
Your LLM smart search will cost ~$0.50/month with:
- 95% cache hit rate
- Moderate usage
- Already optimized! ✅

**Monitor costs**:
```bash
curl https://newsly-xxx.onrender.com/api/status | jq '.llm'
```

### Database Storage
Free tier is 1GB - enough for:
- ~50,000 articles
- ~6 months of data
- LLM cache

**Cleanup old data**:
- Automatic: Set `ARTICLE_RETENTION_DAYS=7`
- Already configured! ✅

---

## ✅ FREE Deployment Checklist

- [ ] Sign up for free database (Aiven recommended)
- [ ] Get database connection details
- [ ] Push updated render.yaml to GitHub
- [ ] Deploy via Render Blueprint (FREE plan)
- [ ] Add 3 API keys (News, NewsData, OpenAI)
- [ ] Add 5 database variables (host, port, user, pass, name)
- [ ] Wait 5-10 minutes for deployment
- [ ] Test: Visit `https://newsly-xxx.onrender.com`
- [ ] Import your database (optional)

---

## 🆘 Troubleshooting

**Q: Blueprint still shows $14/month?**
A: The old render.yaml included MySQL. The new one is FREE. Try:
1. Pull latest code: `git pull origin main`
2. Or deploy manually (skip blueprint)

**Q: App is slow to respond?**
A: Cold start (15 min sleep). First request takes 30 sec.
- **Solution**: Upgrade to Starter ($7/month) for always-on

**Q: Database connection failed?**
A: Double-check credentials in Render env vars
- Verify host, port, user, password, database name

**Q: Not enough database storage?**
A: 1GB = ~50k articles
- Reduce retention: `ARTICLE_RETENTION_DAYS=3`
- Or upgrade database

---

## 📈 Upgrade Path

**When ready to upgrade**:

1. **In Render Dashboard**:
   - Go to your service
   - Settings → Change Plan
   - Select **Starter ($7/month)**

2. **Benefits**:
   - ✅ No sleep (always on)
   - ✅ Faster performance
   - ✅ More resources
   - ✅ Better for production

3. **Database Upgrade**:
   - Aiven: Upgrade to paid plan (~$9/month)
   - PlanetScale: Upgrade to paid (~$29/month)
   - Render MySQL: Starter plan ($7/month)

**Total with upgrades**: $7-16/month for production

---

## 🎉 Summary

**FREE Deployment**:
- Total cost: $0/month
- Perfect for: Testing, demos, hobby projects
- Trade-off: Cold starts after 15 min

**Your Free Stack**:
```
Render (FREE) + Aiven MySQL (FREE) = $0/month
```

**Next Steps**:
1. Get free database (Aiven recommended)
2. Push code to GitHub
3. Deploy via Blueprint
4. Add API keys + database credentials
5. Enjoy your FREE Newsly app! 🚀

---

**Questions? Check RENDER_DEPLOYMENT.md for detailed troubleshooting!**
