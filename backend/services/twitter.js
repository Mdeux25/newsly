const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for 2 minutes
const cache = new NodeCache({ stdTTL: 120 });

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const TWITTER_API_URL = 'https://api.twitter.com/2';

// Note: Twitter API v2 requires authentication
// Free tier: Basic access (500k tweets/month)

async function searchTweets(query, maxResults = 10) {
  const cacheKey = `twitter_search_${query}_${maxResults}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Returning cached Twitter search results');
    return cached;
  }

  if (!TWITTER_BEARER_TOKEN) {
    console.warn('Twitter Bearer Token not configured');
    return [];
  }

  try {
    const response = await axios.get(`${TWITTER_API_URL}/tweets/search/recent`, {
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
      },
      params: {
        query: query,
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,author_id,public_metrics,entities',
        'expansions': 'author_id',
        'user.fields': 'name,username,profile_image_url,verified'
      }
    });

    if (response.data.data) {
      const tweets = formatTweets(response.data);
      cache.set(cacheKey, tweets);
      return tweets;
    }

    return [];
  } catch (error) {
    console.error('Twitter API error:', error.response?.data || error.message);
    if (error.response?.status === 429) {
      console.warn('Twitter API rate limit exceeded');
    }
    return [];
  }
}

async function getUserTweets(username, maxResults = 10) {
  const cacheKey = `twitter_user_${username}_${maxResults}`;

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Returning cached Twitter user tweets');
    return cached;
  }

  if (!TWITTER_BEARER_TOKEN) {
    console.warn('Twitter Bearer Token not configured');
    return [];
  }

  try {
    // First, get user ID from username
    const userResponse = await axios.get(`${TWITTER_API_URL}/users/by/username/${username}`, {
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
      }
    });

    if (!userResponse.data.data) {
      return [];
    }

    const userId = userResponse.data.data.id;

    // Then get user's tweets
    const tweetsResponse = await axios.get(`${TWITTER_API_URL}/users/${userId}/tweets`, {
      headers: {
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`
      },
      params: {
        max_results: Math.min(maxResults, 100),
        'tweet.fields': 'created_at,public_metrics,entities',
        'user.fields': 'name,username,profile_image_url,verified'
      }
    });

    if (tweetsResponse.data.data) {
      const userData = userResponse.data.data;
      const tweets = tweetsResponse.data.data.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author: {
          id: userData.id,
          name: userData.name,
          username: userData.username,
          profile_image: userData.profile_image_url,
          verified: userData.verified || false
        },
        created_at: tweet.created_at,
        metrics: tweet.public_metrics,
        url: `https://twitter.com/${userData.username}/status/${tweet.id}`
      }));

      cache.set(cacheKey, tweets);
      return tweets;
    }

    return [];
  } catch (error) {
    console.error('Twitter user tweets error:', error.response?.data || error.message);
    return [];
  }
}

function formatTweets(data) {
  const users = {};

  // Build user lookup
  if (data.includes?.users) {
    data.includes.users.forEach(user => {
      users[user.id] = user;
    });
  }

  return data.data.map(tweet => {
    const author = users[tweet.author_id] || {};
    return {
      id: tweet.id,
      text: tweet.text,
      author: {
        id: author.id,
        name: author.name,
        username: author.username,
        profile_image: author.profile_image_url,
        verified: author.verified || false
      },
      created_at: tweet.created_at,
      metrics: tweet.public_metrics,
      url: `https://twitter.com/${author.username}/status/${tweet.id}`
    };
  });
}

module.exports = { searchTweets, getUserTweets };
