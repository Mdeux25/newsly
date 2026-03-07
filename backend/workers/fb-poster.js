const axios = require('axios');
const Article = require('../models/Article');

const FB_API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;
const SHARE_BASE = 'https://newsly-jeur.onrender.com/#article=';

function buildSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

async function selectArticles(limit = 3) {
  return Article.selectForFacebook(limit);
}

async function buildCaption(article) {
  const { title, description, source, category } = article;
  const slug = buildSlug(title);
  const shareUrl = `${SHARE_BASE}${encodeURIComponent(slug)}`;
  const desc = description ? description.slice(0, 200) : '';
  const cat = category || 'News';

  if (process.env.FB_USE_LLM_CAPTION === 'true') {
    try {
      const llm = require('../services/llm');
      const caption = await llm.generateFacebookCaption(article, shareUrl);
      if (caption) return caption;
    } catch (e) {
      console.warn('LLM caption failed, falling back to template:', e.message);
    }
  }

  return `📰 ${title}\n\n${desc}...\n\n🌐 ${source || ''}  |  Read more → ${shareUrl}\n\n#${cat} #Newzly #BreakingNews`;
}

async function postToFacebook(article, captionText) {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;

  if (article.image_url) {
    const response = await axios.post(`${BASE_URL}/${pageId}/photos`, null, {
      params: {
        url: article.image_url,
        caption: captionText,
        access_token: token
      }
    });
    return response.data;
  }

  const slug = buildSlug(article.title);
  const shareUrl = `${SHARE_BASE}${encodeURIComponent(slug)}`;
  const response = await axios.post(`${BASE_URL}/${pageId}/feed`, null, {
    params: {
      message: captionText,
      link: shareUrl,
      access_token: token
    }
  });
  return response.data;
}

async function markPosted(articleId) {
  return Article.markAsPosted(articleId);
}

async function runPosting() {
  if (process.env.FB_POST_ENABLED !== 'true') {
    console.log('ℹ️  Facebook posting disabled (FB_POST_ENABLED != true)');
    return { posted: 0, skipped: 0 };
  }

  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    console.warn('⚠️  FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN not set — skipping');
    return { posted: 0, skipped: 0 };
  }

  const limit = parseInt(process.env.FB_POST_LIMIT || '3');
  const articles = await selectArticles(limit);

  if (articles.length === 0) {
    console.log('ℹ️  No articles to post to Facebook');
    return { posted: 0, skipped: 0 };
  }

  let posted = 0;
  let skipped = 0;

  for (const article of articles) {
    try {
      const caption = await buildCaption(article);
      console.log(`📘 Posting to Facebook: "${article.title.slice(0, 60)}..."`);
      const result = await postToFacebook(article, caption);
      await markPosted(article.id);
      console.log(`✅ Posted article ${article.id} → FB id: ${result.id || result.post_id}`);
      posted++;
    } catch (err) {
      console.error(`❌ Failed to post article ${article.id}:`, err.response?.data || err.message);
      skipped++;
    }
  }

  return { posted, skipped };
}

module.exports = { selectArticles, buildCaption, postToFacebook, markPosted, runPosting };
