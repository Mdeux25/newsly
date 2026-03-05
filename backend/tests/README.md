# API Test Suite Documentation

This directory contains comprehensive API tests for the news aggregator filtering logic.

## 🧪 Test Files

### `filtering-api.test.js`
Complete test suite for the improved filtering logic including:
- Basic API functionality
- Region filtering
- Country filtering
- Language + Country filtering (NEW)
- Region auto-ignore when countries selected (NEW)
- Edge cases
- API health checks

## 🚀 Running Tests

### Method 1: Quick Test Runner (Recommended)
```bash
# From project root
./backend/run-tests.sh
```

### Method 2: Direct Execution
```bash
# Make sure backend is running first
cd backend
npm start

# In another terminal
node tests/filtering-api.test.js
```

### Method 3: Using npm (if configured)
```bash
cd backend
npm test
```

## 📋 Test Coverage

### Test Suite 1: Basic Functionality
- ✅ Basic news fetch with default parameters
- ✅ English language filter
- ✅ Trending topics endpoint

### Test Suite 2: Region Filtering
- ✅ US region filter
- ✅ Middle East region filter
- ✅ Region works when no countries selected

### Test Suite 3: Country Filtering
- ✅ Single country filter (Saudi Arabia)
- ✅ Multiple countries filter (US, UK, SA)

### Test Suite 4: Language + Country Filtering (NEW LOGIC)
- ✅ English + Saudi Arabia → English articles from Saudi sources
- ✅ Arabic + Saudi Arabia → Arabic articles from Saudi sources
- ✅ Both languages + country → Mixed language results

### Test Suite 5: Region Ignored When Countries Selected (NEW LOGIC)
- ✅ Region is ignored when countries are selected
- ✅ Region works normally when no countries selected

### Test Suite 6: Edge Cases
- ✅ Invalid country code handling
- ✅ Empty/default topic handling
- ✅ Large limit parameter

### Test Suite 7: API Status
- ✅ System status endpoint
- ✅ Database statistics

## 📊 Expected Results

### Successful Test Run
```
=== TEST SUITE: Basic API Functionality ===

TEST 1: Should fetch news with default parameters
  → Received 10 articles
  → Source: database
✓ PASSED

TEST 2: Should fetch English news only
  → Languages found: en
✓ PASSED

... (more tests)

============================================================
TEST SUMMARY
============================================================
Total Tests: 16
✓ Passed: 16
✗ Failed: 0
Pass Rate: 100.0%

🎉 ALL TESTS PASSED! 🎉
```

## 🔧 Test Configuration

The tests connect to the API at `http://localhost:3000/api` by default.

To test against a different API:
```bash
API_URL=http://your-api-url:port/api node tests/filtering-api.test.js
```

## 📝 Adding New Tests

To add new test cases:

1. Open `filtering-api.test.js`
2. Create a new test function:
```javascript
async function testYourNewFeature() {
  console.log(`\n${colors.bold}${colors.blue}=== TEST SUITE: Your Feature ===${colors.reset}`);

  await test('Should do something', async () => {
    const response = await axios.get(`${BASE_URL}/your-endpoint`);
    assert(response.data.success === true, 'Should be successful');
    console.log(`  → Result: ${response.data.something}`);
  });
}
```

3. Add it to the main runner:
```javascript
async function runAllTests() {
  // ... existing tests
  await testYourNewFeature();
  // ...
}
```

## 🐛 Troubleshooting

### "Cannot connect to API"
**Problem**: Backend server is not running
**Solution**:
```bash
cd backend
npm start
```

### "Rate limit exceeded"
**Problem**: NewsAPI free tier limit (100 requests/day) reached
**Solution**:
- Wait until midnight UTC for reset
- Use database-cached results
- Upgrade NewsAPI plan

### Tests failing with 500 errors
**Problem**: Backend configuration issue
**Solution**:
- Check `.env` file has all required variables
- Verify database connection
- Check API keys are valid

## 📚 Test Examples

### Test 1: Basic News Fetch
```javascript
// Request
GET /api/news?topic=technology&limit=10

// Expected Response
{
  "success": true,
  "count": 10,
  "articles": [...],
  "source": "database"
}
```

### Test 2: Language + Country Filter (NEW)
```javascript
// Request
GET /api/news?countries=sa&language=en&limit=10

// Expected Behavior
- Fetches from Saudi Arabia (country code: sa)
- Filters for English language articles
- Returns sources like: Arab News, Saudi Gazette
- Ignores Arabic sources like: Al Arabiya

// Expected Response
{
  "success": true,
  "articles": [
    {
      "title": "...",
      "source": "Arab News",
      "language": "en",
      "country": "sa"
    }
  ]
}
```

### Test 3: Region Ignored When Countries Selected (NEW)
```javascript
// Request
GET /api/news?countries=us,uk&region=middleeast&language=en

// Expected Behavior
- Countries: us, uk (USED)
- Region: middleeast (IGNORED)
- Returns US/UK news, NOT Middle East news
- Console log: "region='middleeast' ignored because countries are selected"

// Expected Response
{
  "success": true,
  "articles": [
    {
      "source": "CNN",
      "region": "us",
      "country": "us"
    },
    {
      "source": "BBC News",
      "region": "eu",
      "country": "uk"
    }
    // NO Middle East sources
  ]
}
```

## ✅ Test Checklist

Before committing code, ensure:
- [ ] All tests pass
- [ ] New features have test coverage
- [ ] Edge cases are tested
- [ ] Error handling is tested
- [ ] API responses match expected format

## 🔗 Related Documentation

- [API Documentation](../README.md)
- [Filtering Logic](../routes/news.js)
- [NewsAPI Service](../services/newsapi.js)

## 📞 Support

If tests fail unexpectedly:
1. Check backend logs: `npm start`
2. Verify environment variables in `.env`
3. Test API manually: `curl http://localhost:3000/api/status`
4. Review test output for specific error messages
