/**
 * Worker Tests
 *
 * Tests for background worker functionality.
 * Run with: node tests/worker.test.js
 */

require('dotenv').config();
const { fetchNewsForTopic, getWorkerStatus } = require('../workers/news-fetcher');
const ApiQuota = require('../models/ApiQuota');
const Article = require('../models/Article');

async function testFetchNewsForTopic() {
  console.log('🧪 Testing fetchNewsForTopic()...');
  try {
    // Check quota before fetch
    const quotaBefore = await ApiQuota.getQuota('NewsAPI');
    console.log(`   Quota before: ${quotaBefore.remaining}/${quotaBefore.dailyLimit}`);

    // Fetch news for a specific topic
    const result = await fetchNewsForTopic('technology', 'us', 'en');

    console.log(`   Articles fetched: ${result.fetched}`);
    console.log(`   Articles stored: ${result.stored}`);

    // Check quota after fetch
    const quotaAfter = await ApiQuota.getQuota('NewsAPI');
    console.log(`   Quota after: ${quotaAfter.remaining}/${quotaAfter.dailyLimit}`);

    if (result.fetched >= 0 && result.stored >= 0) {
      console.log('✅ Worker fetch test passed');
      return true;
    } else {
      console.error('❌ Worker fetch test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Worker fetch error:', error.message);
    return false;
  }
}

async function testQuotaRespect() {
  console.log('\n🧪 Testing quota respect...');
  try {
    const quota = await ApiQuota.getQuota('NewsAPI');

    if (quota.remaining <= 0) {
      console.log('   Quota exhausted, testing rate limit handling...');
      const result = await fetchNewsForTopic('sports', 'gb', 'en');

      if (result.fetched === 0 && result.stored === 0) {
        console.log('✅ Worker correctly respects rate limits');
        return true;
      } else {
        console.error('❌ Worker did not respect rate limits');
        return false;
      }
    } else {
      console.log('   Quota available, skipping rate limit test');
      console.log('✅ Quota check passed');
      return true;
    }
  } catch (error) {
    console.error('❌ Quota respect error:', error.message);
    return false;
  }
}

async function testWorkerStatus() {
  console.log('\n🧪 Testing getWorkerStatus()...');
  try {
    const status = await getWorkerStatus();

    console.log('   Database articles:', status.database.total);
    console.log('   API quotas:', status.quotas.length);
    console.log('   Recent activity:', status.recentActivity.length);

    if (status.database && status.quotas && status.errorRate) {
      console.log('✅ Worker status test passed');
      return true;
    } else {
      console.error('❌ Worker status test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Worker status error:', error.message);
    return false;
  }
}

async function testDeduplication() {
  console.log('\n🧪 Testing article deduplication...');
  try {
    const testArticle = {
      title: 'Dedup Test Article ' + Date.now(),
      description: 'Testing deduplication',
      url: 'https://example.com/dedup-test',
      image_url: 'https://example.com/image.jpg',
      source: 'Test Source',
      published_at: new Date(),
      country: 'us',
      language: 'en',
      region: 'us',
      category: 'test'
    };

    // Create first article
    const first = await Article.create(testArticle);
    console.log('   First article created:', first ? 'yes' : 'no');

    // Try to create duplicate
    const duplicate = await Article.create(testArticle);
    console.log('   Duplicate prevented:', duplicate === null ? 'yes' : 'no');

    if (first && duplicate === null) {
      console.log('✅ Deduplication test passed');
      return true;
    } else {
      console.error('❌ Deduplication test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Deduplication error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('🚀 Running Worker Tests');
  console.log('========================================\n');

  const results = [];

  results.push(await testFetchNewsForTopic());
  results.push(await testQuotaRespect());
  results.push(await testWorkerStatus());
  results.push(await testDeduplication());

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
