<template>
  <div class="app-container" :class="{ 'dark-mode': isDarkMode, 'rtl-mode': uiLanguage === 'ar' }">
    <!-- Gradient Background -->
    <div class="gradient-bg"></div>

    <!-- Mobile-Optimized Header -->
    <header class="mobile-header">
      <div class="header-content">
        <h1 class="logo">
          <span class="gradient-text">Newsly</span>
          <span class="pulse-dot"></span>
        </h1>

        <div class="header-actions">
          <!-- Language Toggle -->
          <button class="icon-button" @click="toggleUILanguage" aria-label="Toggle language">
            <i class="bi bi-translate"></i>
          </button>

          <!-- Dark Mode Toggle -->
          <button class="icon-button theme-toggle" @click="toggleDarkMode" aria-label="Toggle theme">
            <i :class="isDarkMode ? 'bi-sun' : 'bi-moon'"></i>
          </button>

          <!-- Live Indicator -->
          <LiveIndicator
            :lastUpdate="lastUpdate"
            :isLoading="isLoading"
            :error="error"
          />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="content-wrapper">
      <!-- Interactive Map -->
      <NewsMap
        :uiLanguage="uiLanguage"
        :trendingLocations="trendingLocations"
        @locations-changed="handleLocationsChanged"
        @trending-topic-selected="handleTrendingTopicSelected"
      />

      <!-- Search and Filters -->
      <SearchBar
        v-model:topic="searchTopic"
        v-model:region="selectedRegion"
        v-model:language="selectedLanguage"
        v-model:smartSearch="smartSearchEnabled"
        :trending="trending"
        @search="fetchNews(true)"
        @refresh="refreshNow"
      />

      <!-- Error Message -->
      <div v-if="error" class="error-banner">
        <div class="error-content">
          <i class="bi bi-exclamation-triangle"></i>
          <span>{{ error }}</span>
          <button class="error-close" @click="error = null" aria-label="Close error">
            <i class="bi bi-x"></i>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading && articles.length === 0" class="loading-state">
        <div class="loading-spinner"></div>
        <p>{{ $t('news.loading') }}</p>
      </div>

      <!-- No Results -->
      <div v-else-if="!isLoading && articles.length === 0" class="empty-state">
        <i class="bi bi-search"></i>
        <p>{{ $t('news.noResults') }}</p>
      </div>

      <!-- Combined Feed: News + Tweets -->
      <div v-else>
        <!-- Top Pagination -->
        <Pagination
          :currentPage="currentPage"
          :itemsPerPage="itemsPerPage"
          :totalItems="totalArticles"
          @page-change="handlePageChange"
        />

        <!-- Feed Grid -->
        <div class="feed-grid">
          <template v-for="(item, index) in combinedFeed" :key="item.type === 'article' ? item.url : item.id">
            <NewsCard v-if="item.type === 'article'" :article="item" />
            <TweetCard v-else-if="item.type === 'tweet'" :tweet="item" />
          </template>
        </div>

        <!-- Bottom Pagination -->
        <Pagination
          :currentPage="currentPage"
          :itemsPerPage="itemsPerPage"
          :totalItems="totalArticles"
          @page-change="handlePageChange"
        />
      </div>
    </main>

    <!-- Bottom Navigation (mobile-only) -->
    <nav class="bottom-nav">
      <button class="nav-item active">
        <i class="bi bi-newspaper"></i>
        <span>News</span>
      </button>
      <button class="nav-item" @click="refreshNow">
        <i class="bi bi-arrow-clockwise"></i>
        <span>Refresh</span>
      </button>
      <button class="nav-item">
        <i class="bi bi-twitter"></i>
        <span>Tweets</span>
      </button>
    </nav>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import NewsCard from './components/NewsCard.vue'
import TweetCard from './components/TweetCard.vue'
import SearchBar from './components/SearchBar.vue'
import LiveIndicator from './components/LiveIndicator.vue'
import NewsMap from './components/NewsMap.vue'
import Pagination from './components/Pagination.vue'

export default {
  name: 'App',
  components: {
    NewsCard,
    TweetCard,
    SearchBar,
    LiveIndicator,
    NewsMap,
    Pagination
  },
  setup() {
    const articles = ref([])
    const tweets = ref([])
    const trending = ref([])
    const searchTopic = ref('') // Changed from 'US Iran war' to empty
    const selectedRegion = ref('all')
    const selectedLanguage = ref('both') // Changed from 'en' to 'both'
    const smartSearchEnabled = ref(true) // NEW: Enable smart search by default
    const trendingLocations = ref([]) // NEW: For map visualization
    const selectedMapLocations = ref([])
    const uiLanguage = ref(localStorage.getItem('locale') || 'en')
    const isDarkMode = ref(true) // Default to dark mode
    const isLoading = ref(false)
    const error = ref(null)
    const lastUpdate = ref(null)
    const searchFilter = ref('')

    // Pagination state
    const currentPage = ref(1)
    const itemsPerPage = ref(20)
    const totalArticles = ref(0)

    let autoRefreshInterval = null

    const toggleUILanguage = () => {
      uiLanguage.value = uiLanguage.value === 'en' ? 'ar' : 'en'
      localStorage.setItem('locale', uiLanguage.value)
      // Update document direction
      document.documentElement.dir = uiLanguage.value === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = uiLanguage.value
    }

    const toggleDarkMode = () => {
      isDarkMode.value = !isDarkMode.value
      localStorage.setItem('darkMode', isDarkMode.value)
      document.documentElement.classList.toggle('dark', isDarkMode.value)
    }

    const handleLocationsChanged = (locations) => {
      selectedMapLocations.value = locations
      fetchNews(true) // Reset to page 1 when filters change
    }

    const handlePageChange = (page) => {
      currentPage.value = page
      fetchNews()
      // Scroll to top when page changes
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const filteredArticles = computed(() => {
      if (!searchFilter.value) return articles.value
      const filter = searchFilter.value.toLowerCase()
      return articles.value.filter(article =>
        article.title?.toLowerCase().includes(filter) ||
        article.description?.toLowerCase().includes(filter)
      )
    })

    // Combined feed: mix articles and tweets
    const combinedFeed = computed(() => {
      const feed = []

      // Add articles with type marker
      articles.value.forEach(article => {
        feed.push({ ...article, type: 'article' })
      })

      // Add tweets with type marker
      tweets.value.forEach(tweet => {
        feed.push({ ...tweet, type: 'tweet' })
      })

      // Sort by date (newest first)
      feed.sort((a, b) => {
        const dateA = new Date(a.publishedAt || a.created_at)
        const dateB = new Date(b.publishedAt || b.created_at)
        return dateB - dateA
      })

      return feed
    })

    const fetchNews = async (resetPage = false) => {
      // Reset to page 1 if filters changed
      if (resetPage) {
        currentPage.value = 1
      }

      isLoading.value = true
      error.value = null

      try {
        // Build countries param from map selections
        const countries = selectedMapLocations.value.length > 0
          ? selectedMapLocations.value.map(loc => loc.code).join(',')
          : null

        // Calculate offset for pagination
        const offset = (currentPage.value - 1) * itemsPerPage.value

        // Fetch news articles with pagination
        const newsResponse = await axios.get('/api/news', {
          params: {
            topic: searchTopic.value,
            region: selectedRegion.value,
            language: selectedLanguage.value,
            countries: countries,
            limit: itemsPerPage.value,
            offset: offset,
            smartSearch: smartSearchEnabled.value // NEW: Smart search parameter
          }
        })

        if (newsResponse.data.success) {
          articles.value = newsResponse.data.articles
          totalArticles.value = newsResponse.data.totalCount || 0

          // Show note if no articles (e.g., rate limit)
          if (newsResponse.data.articles.length === 0 && newsResponse.data.note) {
            error.value = newsResponse.data.note
          }
        }

        // Fetch tweets (if Twitter is configured)
        try {
          const tweetsResponse = await axios.get('/api/tweets/search', {
            params: {
              query: searchTopic.value,
              limit: 10
            }
          })

          if (tweetsResponse.data.success) {
            tweets.value = tweetsResponse.data.tweets
          }
        } catch (twitterErr) {
          console.warn('Twitter API not configured or failed:', twitterErr.message)
          tweets.value = []
        }

        lastUpdate.value = new Date()
      } catch (err) {
        console.error('Error fetching news:', err)
        error.value = 'Unable to connect to news service. Please check your API keys.'
      } finally {
        isLoading.value = false
      }
    }

    const fetchTrending = async () => {
      try {
        // Use smart trending endpoint if available
        const response = await axios.get('/api/trending/smart', {
          params: { hours: 24, limit: 10 }
        })
        if (response.data.success) {
          trending.value = response.data.trending
        }
      } catch (err) {
        console.warn('Smart trending failed, falling back to simple trending:', err)
        try {
          const fallbackResponse = await axios.get('/api/trending')
          if (fallbackResponse.data.success) {
            trending.value = fallbackResponse.data.trending
          }
        } catch (fallbackErr) {
          console.error('Error fetching trending:', fallbackErr)
        }
      }
    }

    // NEW: Fetch trending locations for map visualization
    const fetchTrendingLocations = async () => {
      try {
        const response = await axios.get('/api/trending/locations')
        if (response.data.success) {
          trendingLocations.value = response.data.locations
        }
      } catch (err) {
        console.warn('Failed to fetch trending locations:', err)
      }
    }

    // NEW: Handle trending topic selection from map
    const handleTrendingTopicSelected = (topic) => {
      searchTopic.value = topic
      fetchNews(true) // Reset to page 1
    }

    const refreshNow = () => {
      fetchNews(true) // Reset to page 1 on refresh
      fetchTrending()
      fetchTrendingLocations() // NEW: Refresh trending locations
    }

    const startAutoRefresh = () => {
      // Refresh every 30 seconds
      autoRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing news...')
        fetchNews()
      }, 30000)
    }

    const stopAutoRefresh = () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval)
      }
    }

    onMounted(() => {
      // Check system preference or saved preference for dark mode
      const savedMode = localStorage.getItem('darkMode')
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      isDarkMode.value = savedMode !== null ? savedMode === 'true' : prefersDark
      document.documentElement.classList.toggle('dark', isDarkMode.value)

      fetchNews()
      fetchTrending()
      fetchTrendingLocations() // NEW: Fetch trending locations
      startAutoRefresh()
    })

    onUnmounted(() => {
      stopAutoRefresh()
    })

    return {
      articles,
      tweets,
      trending,
      searchTopic,
      selectedRegion,
      selectedLanguage,
      smartSearchEnabled, // NEW
      trendingLocations, // NEW
      selectedMapLocations,
      uiLanguage,
      isDarkMode,
      isLoading,
      error,
      lastUpdate,
      filteredArticles,
      combinedFeed,
      fetchNews,
      refreshNow,
      toggleUILanguage,
      toggleDarkMode,
      handleLocationsChanged,
      handleTrendingTopicSelected, // NEW
      // Pagination
      currentPage,
      itemsPerPage,
      totalArticles,
      handlePageChange
    }
  }
}
</script>

<style scoped>
/* ============================================
   APP CONTAINER - Mobile-First Layout
   ============================================ */
.app-container {
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}

/* Gradient Background (simplified for mobile) - Professional Blue/Slate */
.gradient-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #1e3a8a 0%, #0f172a 50%, #0f1419 100%);
  z-index: -1;
}

/* Desktop: Enhanced animated gradient */
@media (min-width: 1024px) {
  .gradient-bg {
    background: linear-gradient(135deg, #1e40af 0%, #0e7490 50%, #0f172a 100%);
    background-size: 400% 400%;
    animation: gradient 15s ease infinite;
  }
}

/* ============================================
   MOBILE HEADER - Fixed with Safe Area
   ============================================ */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(10, 10, 15, 0.7);
  backdrop-filter: blur(8px) saturate(150%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: max(12px, env(safe-area-inset-top));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  max-width: 100%;
}

.logo {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  font-family: var(--font-heading);
}

.gradient-text {
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.pulse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #06b6d4;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
  margin-left: 6px;
  vertical-align: middle;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Touch-optimized icon buttons */
.icon-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.icon-button:active {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.12);
}

/* Tablet/Desktop: Enhanced header */
@media (min-width: 768px) {
  .mobile-header {
    backdrop-filter: blur(10px) saturate(180%);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
  }

  .logo {
    font-size: 1.75rem;
  }

  .header-actions {
    gap: 12px;
  }
}

@media (min-width: 1024px) {
  .logo {
    font-size: 2rem;
  }

  .icon-button:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  .icon-button:active {
    transform: scale(0.95);
  }
}

/* ============================================
   CONTENT WRAPPER - Mobile-First Spacing
   ============================================ */
.content-wrapper {
  padding-top: calc(56px + max(12px, env(safe-area-inset-top)) + 16px);
  padding-bottom: calc(72px + max(16px, env(safe-area-inset-bottom)));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
  min-height: 100vh;
}

@media (min-width: 768px) {
  .content-wrapper {
    padding-bottom: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
}

/* ============================================
   ERROR BANNER - Mobile-Optimized
   ============================================ */
.error-banner {
  margin-bottom: 20px;
  animation: slideInUp 0.3s ease;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(245, 117, 108, 0.15);
  border: 1px solid rgba(245, 117, 108, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  color: #fca5a5;
}

.error-content i:first-child {
  font-size: 1.25rem;
}

.error-content span {
  flex: 1;
  font-size: 0.875rem;
}

.error-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  transition: background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.error-close:active {
  background: rgba(255, 255, 255, 0.2);
}

/* ============================================
   LOADING STATE - Mobile-Optimized
   ============================================ */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-state p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* ============================================
   EMPTY STATE - Mobile-Optimized
   ============================================ */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state i {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 16px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* ============================================
   FEED GRID - Mobile-First Layout
   ============================================ */
.feed-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  margin: 20px 0;
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .feed-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .feed-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
}

/* ============================================
   BOTTOM NAVIGATION - Thumb-Friendly Zone
   ============================================ */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 1000;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.2s ease;
  min-height: 56px;
  -webkit-tap-highlight-color: transparent;
}

.nav-item i {
  font-size: 1.5rem;
}

.nav-item.active {
  color: #06b6d4;
}

.nav-item:active {
  background: rgba(255, 255, 255, 0.05);
}

/* Hide bottom nav on tablet/desktop */
@media (min-width: 768px) {
  .bottom-nav {
    display: none;
  }
}

/* ============================================
   RTL MODE
   ============================================ */
.rtl-mode {
  direction: rtl;
}

.rtl-mode .header-content,
.rtl-mode .header-actions {
  flex-direction: row-reverse;
}

/* ============================================
   ANIMATIONS
   ============================================ */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes gradient {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
