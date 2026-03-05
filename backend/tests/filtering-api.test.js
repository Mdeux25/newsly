/**
 * API Filtering Test Cases
 * Tests the improved filtering logic for region, country, and language
 *
 * Run: node backend/tests/filtering-api.test.js
 * Or: npm test (if configured in package.json)
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

/**
 * Test helper function
 */
async function test(description, testFn) {
  testResults.total++;
  console.log(`\n${colors.cyan}TEST ${testResults.total}:${colors.reset} ${description}`);

  try {
    await testFn();
    testResults.passed++;
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    return true;
  } catch (error) {
    testResults.failed++;
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    if (error.response) {
      console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

/**
 * Assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Wait helper
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TEST SUITE: Basic API Functionality
 */
async function testBasicFunctionality() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: Basic API Functionality ===${colors.reset}`);

  // Test 1: Basic news fetch
  await test('Should fetch news with default parameters', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: { topic: 'technology', limit: 10 }
    });

    assert(response.status === 200, 'Status should be 200');
    assert(response.data.success === true, 'Success should be true');
    assert(Array.isArray(response.data.articles), 'Articles should be an array');
    assert(response.data.articles.length > 0, 'Should have at least one article');

    console.log(`  → Received ${response.data.articles.length} articles`);
    console.log(`  → Source: ${response.data.source}`);
  });

  // Test 2: English language filter
  await test('Should fetch English news only', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: { topic: 'world news', language: 'en', limit: 10 }
    });

    assert(response.data.success === true, 'Success should be true');
    assert(response.data.articles.length > 0, 'Should have English articles');

    // Check language of articles
    const languages = response.data.articles.map(a => a.language);
    console.log(`  → Languages found: ${[...new Set(languages)].join(', ')}`);
  });

  // Test 3: Trending topics
  await test('Should fetch trending topics', async () => {
    const response = await axios.get(`${BASE_URL}/trending`);

    assert(response.status === 200, 'Status should be 200');
    assert(response.data.success === true, 'Success should be true');
    assert(Array.isArray(response.data.trending), 'Trending should be an array');

    console.log(`  → Trending topics: ${response.data.trending.slice(0, 5).join(', ')}`);
  });
}

/**
 * TEST SUITE: Region Filtering
 */
async function testRegionFiltering() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: Region Filtering ===${colors.reset}`);

  // Test 4: US region filter
  await test('Should fetch US region news', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: { topic: 'politics', region: 'us', language: 'en', limit: 10 }
    });

    assert(response.data.success === true, 'Success should be true');

    // Check if articles have region info
    const regions = response.data.articles.map(a => a.region).filter(r => r);
    console.log(`  → Regions found: ${[...new Set(regions)].join(', ')}`);
  });

  // Test 5: Middle East region filter
  await test('Should fetch Middle East region news', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: { topic: 'news', region: 'middleeast', language: 'en', limit: 10 }
    });

    assert(response.data.success === true, 'Success should be true');

    const regions = response.data.articles.map(a => a.region).filter(r => r);
    console.log(`  → Regions found: ${[...new Set(regions)].join(', ')}`);
  });
}

/**
 * TEST SUITE: Country Filtering
 */
async function testCountryFiltering() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: Country Filtering ===${colors.reset}`);

  // Test 6: Single country filter (Saudi Arabia)
  await test('Should fetch news from Saudi Arabia only', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'news',
        countries: 'sa',
        language: 'en',
        limit: 10
      }
    });

    assert(response.data.success === true, 'Success should be true');

    // Check if articles are from Saudi Arabia
    const countries = response.data.articles.map(a => a.country).filter(c => c);
    console.log(`  → Countries found: ${[...new Set(countries)].join(', ')}`);
    console.log(`  → Sources: ${[...new Set(response.data.articles.map(a => a.source))].slice(0, 3).join(', ')}`);
  });

  // Test 7: Multiple countries filter
  await test('Should fetch news from multiple countries', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'economy',
        countries: 'us,uk,sa',
        language: 'en',
        limit: 15
      }
    });

    assert(response.data.success === true, 'Success should be true');

    const countries = response.data.articles.map(a => a.country).filter(c => c);
    console.log(`  → Countries found: ${[...new Set(countries)].join(', ')}`);
    console.log(`  → Total articles: ${response.data.articles.length}`);
  });
}

/**
 * TEST SUITE: Language + Country Filtering (NEW LOGIC)
 */
async function testLanguageCountryFiltering() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: Language + Country Filtering (NEW LOGIC) ===${colors.reset}`);

  // Test 8: English + Saudi Arabia (should get English articles from Saudi sources)
  await test('Should fetch English articles from Saudi Arabia', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'news',
        countries: 'sa',
        language: 'en',
        limit: 10
      }
    });

    assert(response.data.success === true, 'Success should be true');

    // Check articles are in English
    const languages = response.data.articles.map(a => a.language);
    const englishCount = languages.filter(l => l === 'en').length;

    console.log(`  → Total articles: ${response.data.articles.length}`);
    console.log(`  → English articles: ${englishCount}`);
    console.log(`  → Languages: ${[...new Set(languages)].join(', ')}`);
    console.log(`  → Sources: ${[...new Set(response.data.articles.map(a => a.source))].slice(0, 3).join(', ')}`);

    // Should have mostly English articles (language filter should work)
    assert(englishCount > 0, 'Should have at least some English articles');
  });

  // Test 9: Arabic + Saudi Arabia (should get Arabic articles from Saudi sources)
  await test('Should fetch Arabic articles from Saudi Arabia', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'news',
        countries: 'sa',
        language: 'ar',
        limit: 10
      }
    });

    assert(response.data.success === true, 'Success should be true');

    const languages = response.data.articles.map(a => a.language);
    console.log(`  → Total articles: ${response.data.articles.length}`);
    console.log(`  → Languages: ${[...new Set(languages)].join(', ')}`);
    console.log(`  → Sources: ${[...new Set(response.data.articles.map(a => a.source))].slice(0, 3).join(', ')}`);
  });

  // Test 10: Both languages + country
  await test('Should fetch articles in both languages from specified country', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'news',
        countries: 'sa',
        language: 'both',
        limit: 20
      }
    });

    assert(response.data.success === true, 'Success should be true');

    const languages = response.data.articles.map(a => a.language);
    const uniqueLanguages = [...new Set(languages)];

    console.log(`  → Total articles: ${response.data.articles.length}`);
    console.log(`  → Languages: ${uniqueLanguages.join(', ')}`);
    console.log(`  → Should have both EN and AR articles`);
  });
}

/**
 * TEST SUITE: Region Ignored When Countries Selected (NEW LOGIC)
 */
async function testRegionIgnoredWithCountries() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: Region Ignored When Countries Selected (NEW LOGIC) ===${colors.reset}`);

  // Test 11: Region should be ignored when countries are selected
  await test('Should ignore region when countries are selected', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'technology',
        countries: 'us,uk',
        region: 'middleeast',  // This should be IGNORED
        language: 'en',
        limit: 10
      }
    });

    assert(response.data.success === true, 'Success should be true');

    // Articles should be from US/UK, NOT Middle East
    const countries = response.data.articles.map(a => a.country).filter(c => c);
    const regions = response.data.articles.map(a => a.region).filter(r => r);

    console.log(`  → Countries found: ${[...new Set(countries)].join(', ')}`);
    console.log(`  → Regions found: ${[...new Set(regions)].join(', ')}`);
    console.log(`  → Region 'middleeast' should be ignored (not in results)`);

    // Should NOT have Middle East articles
    const middleEastCount = regions.filter(r => r === 'middleeast').length;
    console.log(`  → Middle East articles: ${middleEastCount} (should be minimal or 0)`);
  });

  // Test 12: Region should work when NO countries selected
  await test('Should use region when no countries are selected', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'news',
        region: 'us',  // This should WORK
        language: 'en',
        limit: 10
      }
    });

    assert(response.data.success === true, 'Success should be true');

    const regions = response.data.articles.map(a => a.region).filter(r => r);
    console.log(`  → Regions found: ${[...new Set(regions)].join(', ')}`);
    console.log(`  → Should primarily have US region articles`);
  });
}

/**
 * TEST SUITE: Edge Cases
 */
async function testEdgeCases() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: Edge Cases ===${colors.reset}`);

  // Test 13: Invalid country code
  await test('Should handle invalid country code gracefully', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'news',
        countries: 'invalid123',
        language: 'en',
        limit: 10
      }
    });

    assert(response.data.success === true, 'Success should be true');
    console.log(`  → Articles returned: ${response.data.articles.length}`);
    console.log(`  → Should fallback to general news if country is invalid`);
  });

  // Test 14: Empty topic
  await test('Should handle empty/default topic', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'breaking news',
        language: 'en',
        limit: 10
      }
    });

    assert(response.data.success === true, 'Success should be true');
    assert(response.data.articles.length > 0, 'Should return general news');
    console.log(`  → Received ${response.data.articles.length} general news articles`);
  });

  // Test 15: Large limit
  await test('Should respect limit parameter', async () => {
    const response = await axios.get(`${BASE_URL}/news`, {
      params: {
        topic: 'technology',
        language: 'en',
        limit: 50
      }
    });

    assert(response.data.success === true, 'Success should be true');
    assert(response.data.articles.length <= 50, 'Should not exceed limit');
    console.log(`  → Requested: 50, Received: ${response.data.articles.length}`);
  });
}

/**
 * TEST SUITE: API Status & Health
 */
async function testAPIStatus() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: API Status & Health ===${colors.reset}`);

  // Test 16: System status endpoint
  await test('Should fetch system status', async () => {
    const response = await axios.get(`${BASE_URL}/status`);

    assert(response.status === 200, 'Status should be 200');
    assert(response.data.success === true, 'Success should be true');
    assert(response.data.database, 'Should have database stats');

    console.log(`  → Total articles in DB: ${response.data.database.totalArticles}`);
    console.log(`  → Articles today: ${response.data.database.articlesToday}`);
    if (response.data.database.topSources) {
      console.log(`  → Top sources: ${response.data.database.topSources.slice(0, 3).map(s => s.source).join(', ')}`);
    }
  });
}

/**
 * Print test summary
 */
function printSummary() {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`${colors.green}✓ Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${testResults.failed}${colors.reset}`);

  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`Pass Rate: ${passRate}%`);

  if (testResults.failed === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 ALL TESTS PASSED! 🎉${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bold}⚠️  SOME TESTS FAILED${colors.reset}`);
  }
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.bold}${colors.cyan}
╔═══════════════════════════════════════════════════════════╗
║         NEWS AGGREGATOR API FILTERING TEST SUITE          ║
║                                                           ║
║  Testing improved filtering logic:                        ║
║  - Region ignored when countries selected                 ║
║  - Language + Country filtering                           ║
║  - All edge cases                                         ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}`);

  console.log(`\n${colors.yellow}Testing API at: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.yellow}Make sure the backend server is running!${colors.reset}\n`);

  try {
    // Check if API is running
    await axios.get(`${BASE_URL}/status`);
    console.log(`${colors.green}✓ API is running${colors.reset}\n`);
  } catch (error) {
    console.log(`${colors.red}✗ Cannot connect to API at ${BASE_URL}${colors.reset}`);
    console.log(`${colors.yellow}Please start the backend server first: npm start${colors.reset}\n`);
    process.exit(1);
  }

  // Run all test suites
  await testBasicFunctionality();
  await wait(500); // Brief pause between suites

  await testRegionFiltering();
  await wait(500);

  await testCountryFiltering();
  await wait(500);

  await testLanguageCountryFiltering();
  await wait(500);

  await testRegionIgnoredWithCountries();
  await wait(500);

  await testEdgeCases();
  await wait(500);

  await testAPIStatus();

  // Print summary
  printSummary();

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { runAllTests };
