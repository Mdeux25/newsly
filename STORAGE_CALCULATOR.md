# 📊 Newsly Storage Calculator

Realistic storage requirements for your news aggregator.

---

## 🔢 Database Size Calculation

### Articles Table

**Per Article Size**:
```
title (VARCHAR 500):        ~200 bytes
description (TEXT):         ~1 KB
url (VARCHAR 1000):         ~300 bytes
image_url (VARCHAR 1000):   ~300 bytes
content (TEXT):             ~3 KB
metadata (various):         ~500 bytes
indexes:                    ~200 bytes
---------------------------------
Total per article:          ~5.5 KB
```

**Your Storage Needs**:

| Scenario | Articles | Storage |
|----------|----------|---------|
| Current (316 articles) | 316 | **~2 MB** |
| 1 week retention | ~2,000 | **~11 MB** |
| 1 month retention | ~8,000 | **~44 MB** |
| 3 months retention | ~25,000 | **~137 MB** |
| 1 year retention | ~100,000 | **~550 MB** |

### LLM Cache Table

**Per Cache Entry**:
```
cache_key:      ~100 bytes
input_text:     ~200 bytes
output_json:    ~500 bytes
metadata:       ~200 bytes
-----------------
Total:          ~1 KB
```

**Cache Size**:
```
100 cached queries:     ~100 KB
1,000 cached queries:   ~1 MB
10,000 cached queries:  ~10 MB
```

**With 7-day expiry**: ~10-50 MB max

### Trending Locations Table

**Minimal**: ~1 MB (updated every 15 min, only top topics)

### Total Database Size

| Retention | Articles Storage | Cache | Trending | **Total** |
|-----------|-----------------|-------|----------|-----------|
| **7 days** | 11 MB | 10 MB | 1 MB | **~25 MB** |
| **30 days** | 44 MB | 50 MB | 1 MB | **~100 MB** |
| **90 days** | 137 MB | 50 MB | 1 MB | **~200 MB** |
| **1 year** | 550 MB | 50 MB | 1 MB | **~600 MB** |

---

## 💡 Recommendations

### Minimum Required Storage

**For 7-day retention** (your current config):
- Database: **50 MB** (with headroom)
- Actual need: **25 MB**

**For 30-day retention** (recommended):
- Database: **150 MB** (with headroom)
- Actual need: **100 MB**

### Storage Tiers

**Free Databases**:
- Aiven: 1 GB ✅ **Perfect!**
- PlanetScale: 5 GB ✅ Overkill but free
- Render PostgreSQL: 256 MB ✅ Enough for 7 days

**You only need**: **100-500 MB** for normal use

---

## 🎯 Why 10GB Was Overkill

The original `render.yaml` had:
```yaml
disk:
  sizeGB: 10  # ❌ Way too much!
```

**Reality**:
- You need: **100-500 MB**
- 10 GB would store: **~2 million articles**!
- That's **20+ years** of news!

---

## 📉 Database Growth Over Time

**Estimated growth** (with 7-day retention):

| Month | Articles/Day | Storage |
|-------|-------------|---------|
| Month 1 | 100 | 25 MB |
| Month 3 | 200 | 25 MB (stable) |
| Month 6 | 300 | 25 MB (stable) |
| Month 12 | 500 | 25 MB (stable) |

**With 7-day retention**: Size stays constant! ✅

**With 30-day retention**:
| Month | Storage |
|-------|---------|
| Month 1 | 100 MB |
| Month 3 | 100 MB (stable) |
| Month 12 | 100 MB (stable) |

**Key insight**: Old articles auto-delete, size stabilizes!

---

## 💰 Cost by Storage

### Free Options (More Than Enough!)

| Provider | Free Storage | Your Need | Overhead |
|----------|-------------|-----------|----------|
| Aiven | 1 GB | 100 MB | **10x headroom** ✅ |
| PlanetScale | 5 GB | 100 MB | **50x headroom** ✅ |
| Render PostgreSQL | 256 MB | 100 MB | **2.5x headroom** ✅ |

**All free options work perfectly!**

### Paid Options (Unnecessary!)

| Provider | Storage | Cost | Needed? |
|----------|---------|------|---------|
| Render MySQL | 1 GB | $7/mo | ❌ No, use free |
| DO Managed DB | 10 GB | $15/mo | ❌ No, way overkill |
| AWS RDS | 20 GB | $15/mo | ❌ No, way overkill |

**Don't pay for database** - free tiers are perfect!

---

## 🔧 Optimization Tips

### 1. Adjust Retention (Already Configured)
```bash
ARTICLE_RETENTION_DAYS=7  # Default, keeps size ~25 MB
ARTICLE_RETENTION_DAYS=30 # More history, size ~100 MB
ARTICLE_RETENTION_DAYS=3  # Minimal, size ~10 MB
```

### 2. Clean LLM Cache
Already configured to expire after 7 days ✅

### 3. Monitor Size
```sql
-- Check actual database size
SELECT
  table_name,
  ROUND(((data_length + index_length) / 1024 / 1024), 2) AS "Size (MB)"
FROM information_schema.TABLES
WHERE table_schema = 'news_aggregator'
ORDER BY (data_length + index_length) DESC;
```

### 4. Trending Data Cleanup
Already configured to update every 15 min (overwrites old) ✅

---

## 📊 Real-World Example

**Your current database**:
```
316 articles × 5.5 KB = 1.7 MB
+ indexes = ~3 MB
+ LLM cache (empty) = 0 MB
+ trending = ~0.5 MB
= Total: ~4 MB
```

**After 1 month of running**:
```
2,000 articles (7 days) = 11 MB
+ indexes = 5 MB
+ LLM cache = 20 MB
+ trending = 1 MB
= Total: ~37 MB
```

**Still tiny!** Any free database works perfectly.

---

## ✅ Conclusion

**You need**: 100-500 MB
**Free DBs offer**: 256 MB - 5 GB
**Verdict**: ✅ Free tier is perfect!

**Don't pay for**:
- ❌ 10 GB storage (overkill)
- ❌ Managed databases ($15/month)
- ❌ Extra storage space

**Use**:
- ✅ Aiven free tier (1 GB)
- ✅ PlanetScale free tier (5 GB)
- ✅ Or MySQL on DigitalOcean Droplet ($6/month includes 25 GB)

**Bottom line**: Your news app is lightweight! 🎉
