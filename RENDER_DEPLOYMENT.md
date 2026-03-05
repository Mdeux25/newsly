# 🚀 Newsly - Render.com Deployment Guide

Deploy Newsly to Render with one command using Infrastructure as Code.

---

## 🎯 Why Render?

✅ **Free Tier Available** - Free for hobby projects
✅ **Auto-Deploy from GitHub** - Push = Deploy
✅ **Managed Database** - Built-in MySQL support
✅ **SSL/HTTPS** - Free certificates included
✅ **Easy Scaling** - Upgrade with one click
✅ **Great for Production** - Used by real companies

**Cost**: Free tier or $7-25/month for production

---

## 📋 Prerequisites

1. **GitHub Account** - Your code is already there ✅
2. **Render Account** - Sign up at https://render.com (free)
3. **Render CLI** - You have it installed ✅

---

## 🚀 Quick Deployment (3 Methods)

### Method 1: Render CLI (Fastest - 1 Command!)

```bash
# Login to Render
render login

# Deploy (from project directory)
cd /Users/me-mac/projects/news-aggregator
render deploy

# Follow the prompts and Render will:
# 1. Read render.yaml
# 2. Create MySQL database
# 3. Create web service
# 4. Deploy automatically
```

### Method 2: Render Dashboard (Visual)

1. **Go to**: https://dashboard.render.com/
2. **Click**: "New +" → "Blueprint"
3. **Connect Repository**: `https://github.com/Mdeux25/newsly`
4. **Auto-detected**: Render finds `render.yaml` automatically
5. **Click**: "Apply"
6. **Set Environment Variables** (see below)
7. **Click**: "Deploy"

### Method 3: Manual Setup (More Control)

#### A. Create MySQL Database

1. Go to https://dashboard.render.com/
2. Click "New +" → "MySQL"
3. Name: `newsly-mysql`
4. Database: `news_aggregator`
5. User: `news_user`
6. Plan: Free or Starter ($7/month)
7. Click "Create Database"
8. **Save** the connection details

#### B. Create Web Service

1. Click "New +" → "Web Service"
2. Connect GitHub repository: `Mdeux25/newsly`
3. Configure:
   - **Name**: `newsly`
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free or Starter ($7/month)
4. Click "Create Web Service"

#### C. Configure Environment Variables

In your web service settings, add:

**Required:**
```bash
# Database (from your MySQL service)
DB_HOST=<your-mysql-hostname>
DB_PORT=3306
DB_USER=news_user
DB_PASSWORD=<your-mysql-password>
DB_NAME=news_aggregator

# API Keys
NEWSAPI_KEY=your_newsapi_key_here
NEWSDATA_KEY=your_newsdata_key_here
OPENAI_API_KEY=your_openai_key_here

# Configuration
NODE_ENV=production
OPENAI_MODEL=gpt-4o-mini
LLM_CACHE_ENABLED=true
LLM_DAILY_BUDGET=1.00
```

**Optional:**
```bash
GNEWS_KEY=your_gnews_key_here
TWITTER_BEARER_TOKEN=your_twitter_token_here
```

---

## 🔧 Configuration Details

### Database Options

**Option A: Render MySQL (Recommended)**
- Managed by Render
- Automatic backups
- Easy scaling
- **Cost**: Free (256MB) or $7/month (1GB)

**Option B: External Database**
- Use PlanetScale (free tier)
- Use Railway
- Use your own MySQL server

### Environment Variables

Set these in Render Dashboard → Your Service → Environment:

| Variable | Value | Required |
|----------|-------|----------|
| `NEWSAPI_KEY` | Your NewsAPI key | ✅ Yes |
| `NEWSDATA_KEY` | Your NewsData key | ✅ Yes |
| `OPENAI_API_KEY` | Your OpenAI key | ✅ Yes |
| `DB_HOST` | From Render MySQL | ✅ Yes |
| `DB_PASSWORD` | From Render MySQL | ✅ Yes |
| `GNEWS_KEY` | Your GNews key | ⚠️ Optional |
| `TWITTER_BEARER_TOKEN` | Twitter API token | ⚠️ Optional |

### Health Check

Render automatically monitors: `/api/status`

If it fails, Render will restart your service automatically.

---

## 📊 Import Your Database

### Option 1: Import via Render Dashboard

1. Go to your MySQL service
2. Click "Connect" → Get connection string
3. From your local machine:

```bash
# Export your local database
mysqldump -u news_user -pnews_password news_aggregator > newsly_backup.sql

# Import to Render MySQL
mysql -h <render-mysql-host> -u news_user -p<render-password> news_aggregator < newsly_backup.sql
```

### Option 2: Use MySQL Workbench

1. Connect to Render MySQL using connection details
2. Import your backup SQL file
3. Done!

### Option 3: Start Fresh

Just let the migrations run automatically - Render will execute files in `/docker-entrypoint-initdb.d/`

---

## 🌐 Access Your App

After deployment:

**Your App**: `https://newsly-xxxx.onrender.com`
**API**: `https://newsly-xxxx.onrender.com/api/status`
**Dashboard**: https://dashboard.render.com/

Render provides:
- ✅ Free HTTPS/SSL
- ✅ Custom domain support
- ✅ Auto-deploy on git push
- ✅ Built-in monitoring

---

## 🔄 Auto-Deploy Setup

Once deployed, every push to `main` branch automatically deploys:

```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Render automatically:
# 1. Detects the push
# 2. Builds new Docker image
# 3. Deploys new version
# 4. Zero-downtime deployment
```

---

## 💰 Pricing

### Free Tier
- ✅ Web service: 750 hours/month
- ✅ SSL/HTTPS included
- ✅ Custom domains
- ⚠️ Spins down after 15 min inactivity
- ⚠️ Slower startup (cold starts)

**Good for**: Testing, demos, hobby projects

### Starter Plan ($7/month)
- ✅ Always on (no spin down)
- ✅ Faster performance
- ✅ More resources
- ✅ Better for production

**Good for**: Production, real users

### Database Pricing
- **Free**: 256MB storage
- **Starter**: $7/month for 1GB
- **Pro**: $20/month for 10GB

---

## 📈 Monitoring & Logs

### View Logs
```bash
# Via CLI
render logs -s newsly -n 100

# Or in Dashboard
# Navigate to your service → Logs tab
```

### Metrics Dashboard

Render provides:
- CPU usage
- Memory usage
- Request count
- Response times
- Error rates

Access at: https://dashboard.render.com → Your Service → Metrics

### Alerts

Set up alerts for:
- Service down
- High CPU usage
- High memory usage
- Deploy failures

---

## 🔒 Security Best Practices

### 1. Use Environment Variables

✅ **Never commit**:
- API keys
- Database passwords
- Secret tokens

✅ **Always use** Render Environment Variables

### 2. Enable Auto-Deploy

Render deploys from `main` branch by default. Consider:
- Using a `production` branch for stable releases
- Testing in a separate "staging" service first

### 3. Database Backups

Render MySQL includes:
- Daily automated backups (Starter plan)
- Point-in-time recovery
- Download backups anytime

### 4. Monitor Costs

Check your usage:
- Dashboard → Billing
- Set budget alerts
- Monitor API costs (OpenAI)

---

## 🐛 Troubleshooting

### Build Failed

**Check logs**:
```bash
render logs -s newsly -t build
```

**Common issues**:
- Missing dependencies in package.json
- Docker build errors
- Environment variables not set

**Fix**: Check Dockerfile and render.yaml

### Service Won't Start

**Check logs**:
```bash
render logs -s newsly
```

**Common issues**:
- Database connection failed (check credentials)
- Port mismatch (use PORT env var)
- Missing environment variables

**Fix**: Verify all env vars in Dashboard

### Database Connection Error

1. Check MySQL service is running
2. Verify `DB_HOST` matches MySQL hostname
3. Check `DB_PASSWORD` is correct
4. Test connection:

```bash
# Get MySQL connection string from Render
mysql -h <host> -u news_user -p
```

### Slow Performance (Free Tier)

Free tier spins down after 15 min inactivity:
- First request after spin-down takes 30-60 seconds
- **Solution**: Upgrade to Starter plan ($7/month)

### High Memory Usage

If your service crashes with OOM:
1. Check Docker memory limits
2. Upgrade to larger plan
3. Optimize code (check LLM cache size)

---

## 🚀 Deployment Checklist

Before going live:

- [ ] Push code to GitHub
- [ ] Login to Render: `render login`
- [ ] Deploy: `render deploy` or use Dashboard
- [ ] Set all environment variables
- [ ] Import database (if needed)
- [ ] Test: `curl https://your-app.onrender.com/api/status`
- [ ] Verify smart search works
- [ ] Check LLM costs in dashboard
- [ ] Set up custom domain (optional)
- [ ] Enable auto-deploy on git push
- [ ] Set up monitoring alerts

---

## 📚 Advanced Configuration

### Custom Domain

1. Go to Dashboard → Your Service → Settings
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `newsly.yourdomain.com`)
4. Add DNS records (Render provides instructions)
5. SSL certificate auto-generated (free!)

### Scaling

**Vertical Scaling** (More Resources):
- Dashboard → Your Service → Settings
- Change instance type
- Options: 512MB to 16GB RAM

**Horizontal Scaling** (More Instances):
- Dashboard → Your Service → Settings
- Increase instance count
- Load balanced automatically

### CI/CD Integration

Render supports:
- GitHub Actions
- GitLab CI
- Bitbucket Pipelines

Example workflow in `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Render
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Trigger Render Deploy
        run: curl https://api.render.com/deploy/...
```

---

## 🆘 Support & Resources

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com/
- **Status Page**: https://status.render.com/
- **Support**: support@render.com

---

## 💡 Tips & Tricks

### 1. Faster Deploys
- Use `.dockerignore` to exclude unnecessary files
- Leverage Docker layer caching
- Multi-stage builds (already configured!)

### 2. Cost Optimization
- Use free tier for staging
- Monitor OpenAI costs via `/api/status`
- Optimize database queries
- Clean up old data regularly

### 3. Performance
- Enable Redis caching (upgrade)
- Use CDN for static assets
- Optimize Docker image size
- Monitor response times

### 4. Development Workflow
```bash
# Local development
npm run dev

# Push to staging branch
git push origin staging

# Test on Render staging service
curl https://newsly-staging.onrender.com/api/status

# Merge to main for production
git checkout main
git merge staging
git push origin main
```

---

## ✅ Post-Deployment

After successful deployment:

1. ✅ **Test all features**:
   - Smart search
   - Trending topics
   - Map with alarm bells
   - API status endpoint

2. ✅ **Monitor costs**:
   - Check OpenAI usage
   - Monitor database size
   - Set budget alerts

3. ✅ **Set up backups**:
   - Enable automated backups (Starter plan)
   - Download manual backup weekly

4. ✅ **Share your app**:
   - Get your public URL
   - Share with users
   - Enjoy! 🎉

---

**Your Newsly app is now live on Render! 🚀**

Public URL: `https://newsly-xxxx.onrender.com`
