#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001';

async function testAPI() {
  console.log('🧪 Testing News Aggregator API\n');
  console.log('='.repeat(50));

  const tests = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/api/health`,
      expected: 'status: ok'
    },
    {
      name: 'Basic News (No filters)',
      url: `${BASE_URL}/api/news?topic=technology&limit=5`,
      expected: 'articles array'
    },
    {
      name: 'News with Country Filter (US)',
      url: `${BASE_URL}/api/news?topic=news&countries=us&limit=5`,
      expected: 'US articles'
    },
    {
      name: 'News with Country Filter (UK)',
      url: `${BASE_URL}/api/news?topic=news&countries=gb&limit=5`,
      expected: 'UK articles'
    },
    {
      name: 'News with Country Filter (Egypt)',
      url: `${BASE_URL}/api/news?topic=news&countries=eg&limit=5`,
      expected: 'Egypt articles or fallback'
    },
    {
      name: 'News with Multiple Countries',
      url: `${BASE_URL}/api/news?topic=news&countries=us,gb,eg&limit=5`,
      expected: 'articles from selected countries'
    },
    {
      name: 'Arabic Language News',
      url: `${BASE_URL}/api/news?topic=news&language=ar&limit=3`,
      expected: 'Arabic articles'
    },
    {
      name: 'Trending Topics',
      url: `${BASE_URL}/api/trending`,
      expected: 'trending keywords'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n📝 Test: ${test.name}`);
      console.log(`   URL: ${test.url}`);

      const response = await axios.get(test.url, { timeout: 10000 });

      if (response.status === 200) {
        console.log(`   ✅ Status: ${response.status}`);

        // Check response data
        if (test.url.includes('/health')) {
          console.log(`   📊 Response: ${JSON.stringify(response.data)}`);
        } else if (test.url.includes('/trending')) {
          console.log(`   📊 Trending count: ${response.data.trending?.length || 0}`);
          console.log(`   📊 Trending: ${response.data.trending?.slice(0, 5).join(', ')}`);
        } else {
          console.log(`   📊 Articles count: ${response.data.count || 0}`);
          if (response.data.articles && response.data.articles.length > 0) {
            console.log(`   📰 First article: "${response.data.articles[0].title?.substring(0, 60)}..."`);
            console.log(`   🌍 Source: ${response.data.articles[0].source}`);
            console.log(`   🗣️  Language: ${response.data.articles[0].language || 'not specified'}`);
          } else {
            console.log(`   ⚠️  No articles returned`);
          }
        }
        passed++;
      } else {
        console.log(`   ❌ Unexpected status: ${response.status}`);
        failed++;
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   📊 Response status: ${error.response.status}`);
        console.log(`   📊 Response data: ${JSON.stringify(error.response.data)}`);
      }
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
testAPI().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
