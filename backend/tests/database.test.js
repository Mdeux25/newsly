/**
 * Database Tests
 *
 * Tests for database connectivity and model operations.
 * Run with: node tests/database.test.js
 */

require('dotenv').config();
const Article = require('../models/Article');
const FetchLog = require('../models/FetchLog');
const ApiQuota = require('../models/ApiQuota');
const db = require('../config/database');

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testArticleCreate() {
  console.log('\n🧪 Testing Article.create()...');
  try {
    const testArticle = {
      title: 'Test Article ' + Date.now(),
      description: 'This is a test article',
      url: 'https://example.com/test-' + Date.now(),
      image_url: 'https://example.com/image.jpg',
      source: 'Test Source',
      author: 'Test Author',
      content: 'Test content',
      published_at: new Date(),
      country: 'us',
      language: 'en',
      region: 'us',
      category: 'technology'
    };

    const result = await Article.create(testArticle);
    if (result && result.id) {
      console.log('✅ Article created successfully with ID:', result.id);
      return true;
    } else {
      console.error('❌ Article creation failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Article creation error:', error.message);
    return false;
  }
}

async function testArticleFindRecent() {
  console.log('\n🧪 Testing Article.findRecent()...');
  try {
    const articles = await Article.findRecent({ country: 'us' }, 10);
    console.log(`✅ Found ${articles.length} recent articles`);
    return true;
  } catch (error) {
    console.error('❌ Article findRecent error:', error.message);
    return false;
  }
}

async function testArticleStats() {
  console.log('\n🧪 Testing Article.getStats()...');
  try {
    const stats = await Article.getStats();
    console.log('✅ Article stats:', {
      total: stats.total,
      today: stats.today,
      topSources: stats.topSources.length
    });
    return true;
  } catch (error) {
    console.error('❌ Article stats error:', error.message);
    return false;
  }
}

async function testFetchLog() {
  console.log('\n🧪 Testing FetchLog.create()...');
  try {
    const logData = {
      api_name: 'NewsAPI',
      endpoint: '/v2/top-headlines',
      country: 'us',
      topic: 'test',
      language: 'en',
      articles_fetched: 10,
      articles_stored: 8,
      status: 'success',
      response_time_ms: 1500
    };

    const result = await FetchLog.create(logData);
    if (result && result.id) {
      console.log('✅ Fetch log created successfully');
      return true;
    } else {
      console.error('❌ Fetch log creation failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Fetch log error:', error.message);
    return false;
  }
}

async function testApiQuota() {
  console.log('\n🧪 Testing ApiQuota operations...');
  try {
    // Get quota
    const quota = await ApiQuota.getQuota('NewsAPI');
    console.log('✅ API quota retrieved:', {
      apiName: quota.apiName,
      remaining: quota.remaining,
      dailyLimit: quota.dailyLimit
    });

    // Check if can make request
    const canMake = await ApiQuota.canMakeRequest('NewsAPI');
    console.log('✅ Can make request:', canMake);

    return true;
  } catch (error) {
    console.error('❌ API quota error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('🚀 Running Database Tests');
  console.log('========================================\n');

  const results = [];

  results.push(await testDatabaseConnection());
  results.push(await testArticleCreate());
  results.push(await testArticleFindRecent());
  results.push(await testArticleStats());
  results.push(await testFetchLog());
  results.push(await testApiQuota());

  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log('\n========================================');
  console.log('📊 Test Results');
  console.log('========================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('========================================\n');

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite error:', error);
  process.exit(1);
});
