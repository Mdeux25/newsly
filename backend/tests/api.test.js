/**
 * API Tests
 *
 * Tests for API endpoints.
 * Run with: node tests/api.test.js
 *
 * Prerequisites: Backend server must be running on PORT 3001
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

async function testHealthEndpoint() {
  console.log('🧪 Testing /api/health...');
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);

    if (response.status === 200 && response.data.status === 'ok') {
      console.log('✅ Health endpoint test passed');
      return true;
    } else {
      console.error('❌ Health endpoint test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Health endpoint error:', error.message);
    return false;
  }
}

async function testNewsEndpoint() {
  console.log('\n🧪 Testing /api/news...');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${BASE_URL}/api/news`, {
      params: {
        topic: 'technology',
        limit: 10,
        language: 'en'
      }
    });
    const responseTime = Date.now() - startTime;

    console.log(`   Response time: ${responseTime}ms`);
    console.log(`   Articles returned: ${response.data.count}`);
    console.log(`   Source: ${response.data.source}`);

    if (response.status === 200 && response.data.success) {
      if (responseTime < 2000) {
        console.log('✅ News endpoint test passed (fast response!)');
        return true;
      } else {
        console.log('⚠️  News endpoint works but is slow (>2s)');
        return true;
      }
    } else {
      console.error('❌ News endpoint test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ News endpoint error:', error.message);
    return false;
  }
}

async function testNewsWithCountryFilter() {
  console.log('\n🧪 Testing /api/news with country filter...');
  try {
    const response = await axios.get(`${BASE_URL}/api/news`, {
      params: {
        topic: 'breaking news',
        countries: 'us',
        limit: 5
      }
    });

    console.log(`   Articles returned: ${response.data.count}`);

    if (response.status === 200 && response.data.success) {
      console.log('✅ Country filter test passed');
      return true;
    } else {
      console.error('❌ Country filter test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Country filter error:', error.message);
    return false;
  }
}

async function testTrendingEndpoint() {
  console.log('\n🧪 Testing /api/trending...');
  try {
    const response = await axios.get(`${BASE_URL}/api/trending`);

    console.log(`   Trending topics: ${response.data.trending?.length || 0}`);
    console.log(`   Source: ${response.data.source}`);

    if (response.status === 200 && response.data.success) {
      console.log('✅ Trending endpoint test passed');
      return true;
    } else {
      console.error('❌ Trending endpoint test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Trending endpoint error:', error.message);
    return false;
  }
}

async function testStatusEndpoint() {
  console.log('\n🧪 Testing /api/status...');
  try {
    const response = await axios.get(`${BASE_URL}/api/status`);

    console.log('   Database stats:', {
      total: response.data.database?.totalArticles,
      today: response.data.database?.articlesToday
    });
    console.log('   API quotas:', response.data.apiQuotas?.length);

    if (response.status === 200 && response.data.success) {
      console.log('✅ Status endpoint test passed');
      return true;
    } else {
      console.error('❌ Status endpoint test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Status endpoint error:', error.message);
    return false;
  }
}

async function testConcurrentRequests() {
  console.log('\n🧪 Testing concurrent requests (load test)...');
  try {
    const startTime = Date.now();

    // Make 10 concurrent requests
    const requests = Array(10).fill(null).map(() =>
      axios.get(`${BASE_URL}/api/news`, {
        params: { topic: 'technology', limit: 5 }
      })
    );

    const responses = await Promise.all(requests);
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / requests.length;

    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Average per request: ${avgTime.toFixed(0)}ms`);
    console.log(`   All successful: ${responses.every(r => r.status === 200)}`);

    if (responses.every(r => r.status === 200) && avgTime < 1000) {
      console.log('✅ Concurrent requests test passed');
      return true;
    } else if (responses.every(r => r.status === 200)) {
      console.log('⚠️  All requests succeeded but average time > 1s');
      return true;
    } else {
      console.error('❌ Concurrent requests test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Concurrent requests error:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n========================================');
  console.log('🚀 Running API Tests');
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log('========================================\n');

  console.log('⚠️  Note: Backend server must be running!\n');

  const results = [];

  results.push(await testHealthEndpoint());
  results.push(await testNewsEndpoint());
  results.push(await testNewsWithCountryFilter());
  results.push(await testTrendingEndpoint());
  results.push(await testStatusEndpoint());
  results.push(await testConcurrentRequests());

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
