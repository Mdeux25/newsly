require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Article = require('./models/Article');
const newsRouter = require('./routes/news');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production (for Docker)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Routes
app.use('/api', newsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SEO: article meta injection + sitemap (production only)
if (process.env.NODE_ENV === 'production') {
  const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','this','that','they','have','has','had','will','would','could','should','not','its','his','her'])
  const buildSlug = (title) => (title || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '').trim().split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w)).slice(0, 4).join('-')

  const BASE_URL = 'https://newsly-jeur.onrender.com'
  const escHtml = s => (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

  let indexHtml = null
  const getIndexHtml = () => {
    if (!indexHtml) indexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8')
    return indexHtml
  }

  app.get('/article/:slug', async (req, res) => {
    try {
      const article = await Article.findBySlug(req.params.slug)
      let html = getIndexHtml()

      if (article) {
        const title = `${article.title} — Newsly`
        const desc = (article.description || '').slice(0, 160)
        const image = article.image_url || `${BASE_URL}/og-banner.svg`
        const url = `${BASE_URL}/article/${req.params.slug}`

        const jsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: article.title,
          description: article.description,
          image: article.image_url ? [article.image_url] : [],
          datePublished: article.published_at,
          author: { '@type': 'Organization', name: article.source },
          publisher: { '@type': 'Organization', name: 'Newzly', url: BASE_URL },
          url,
          inLanguage: article.language || 'en',
          isPartOf: { '@type': 'Periodical', name: 'Newzly' }
        })

        const seoHead = `
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(desc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(desc)}">
  <meta property="og:image" content="${escHtml(image)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:title" content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(desc)}">
  <meta name="twitter:image" content="${escHtml(image)}">
  <script type="application/ld+json">${jsonLd}<\/script>`

        html = html.replace('<!-- SEO_HEAD -->', seoHead)
      }

      res.send(html)
    } catch (err) {
      res.sendFile(path.join(__dirname, 'public', 'index.html'))
    }
  })

  let sitemapCache = null, sitemapTime = 0
  app.get('/sitemap.xml', async (req, res) => {
    if (sitemapCache && Date.now() - sitemapTime < 3600000) {
      return res.type('xml').send(sitemapCache)
    }
    try {
      const articles = await Article.findRecent({}, 500)
      const urls = articles.map(a => {
        const slug = buildSlug(a.title)
        const date = new Date(a.published_at).toISOString().split('T')[0]
        return `  <url><loc>${BASE_URL}/article/${slug}</loc><lastmod>${date}</lastmod><changefreq>never</changefreq><priority>0.7</priority></url>`
      }).join('\n')
      sitemapCache = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${BASE_URL}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>\n${urls}\n</urlset>`
      sitemapTime = Date.now()
      res.type('xml').send(sitemapCache)
    } catch (err) {
      res.status(500).send('Sitemap generation failed')
    }
  })

  // Serve frontend for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
  })
}

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`\n✅ Backend server running on http://localhost:${PORT}`);
  console.log(`✅ API endpoints available at http://localhost:${PORT}/api`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ System status: http://localhost:${PORT}/api/status\n`);

  // Start background worker scheduler
  const { startScheduler } = require('./workers/scheduler');
  startScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⏹️  SIGTERM received, shutting down gracefully...');
  const { stopScheduler } = require('./workers/scheduler');
  stopScheduler();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⏹️  SIGINT received, shutting down gracefully...');
  const { stopScheduler } = require('./workers/scheduler');
  stopScheduler();
  process.exit(0);
});
