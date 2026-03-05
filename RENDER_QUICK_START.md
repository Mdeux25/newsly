# ⚡ Render.com Quick Start

Deploy Newsly in **10 minutes** with your Aiven MySQL database.

---

## 🎯 Your Aiven Database Info

```
Host:     mysql-128d5e0c-newsly-ai.d.aivencloud.com
Port:     11431
User:     avnadmin
Password: [Get from Aiven console - click eye icon]
Database: defaultdb (create news_aggregator inside)
SSL:      REQUIRED
```

---

## ⚡ Quick Deploy Steps

### 1️⃣ Create Database (1 minute)

```bash
# Connect to Aiven
mysql -h mysql-128d5e0c-newsly-ai.d.aivencloud.com -P 11431 -u avnadmin -p --ssl-mode=REQUIRED

# Create database
CREATE DATABASE news_aggregator;
EXIT;
```

### 2️⃣ Push to GitHub (30 seconds)

```bash
git push origin main
```

### 3️⃣ Deploy to Render (2 minutes)

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"Blueprint"**
3. Select repository: `Mdeux25/newsly`
4. Add these 3 environment variables when prompted:

```bash
DB_PASSWORD = [Paste from Aiven console]
NEWSAPI_KEY = [Your NewsAPI key]
NEWSDATA_KEY = [Your NewsData key]
OPENAI_API_KEY = [Your OpenAI key]
```

5. Click **"Apply"**

### 4️⃣ Wait for Deploy (5-8 minutes)

Render will:
- ✅ Build Docker image
- ✅ Connect to Aiven MySQL (SSL)
- ✅ Run database migrations
- ✅ Start the app

### 5️⃣ You're Live! 🎉

```
Your app: https://newsly-[random].onrender.com
```

---

## ✅ Verify It Works

```bash
# Check API status
curl https://newsly-[your-url].onrender.com/api/status

# Should show:
# { "status": "healthy", "database": "connected" }
```

Open in browser and test:
- ✅ Search "iran" with smart search
- ✅ Click map locations
- ✅ View trending topics

---

## 💰 Cost

- **Render**: $0/month (free tier)
- **Aiven**: $0/month (free 1GB)
- **OpenAI**: ~$0.50/month (LLM usage)
- **Total**: **~$0.50/month**

---

## 🆘 Issues?

**Database connection error?**
- Check DB_PASSWORD in Render env vars
- Ensure `news_aggregator` database exists
- Verify SSL is enabled (DB_SSL=true in render.yaml)

**App is slow?**
- Free tier sleeps after 15 min
- First request takes ~30 seconds to wake up
- Upgrade to Starter ($7/mo) for always-on

**Need detailed help?**
See: `RENDER_DEPLOYMENT_GUIDE.md`

---

**That's it! Your Newsly app is live! 🚀**
