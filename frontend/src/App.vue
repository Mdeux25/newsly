<template>
  <div class="app-container" :class="{ 'dark-mode': isDarkMode, 'rtl-mode': uiLanguage === 'ar' }">
    <!-- Gradient Background -->
    <div class="gradient-bg"></div>

    <!-- Mobile-Optimized Header -->
    <header class="mobile-header">
      <div class="header-content">
        <h1 class="logo">
          <span class="gradient-text">{{ uiLanguage === 'ar' ? 'نيوزلي' : 'Newsly' }}</span>
          <span class="pulse-dot"></span>
        </h1>

        <div class="header-actions">
          <!-- Language Toggle -->
          <div class="lang-toggle" @click="toggleUILanguage" role="button" aria-label="Toggle language" dir="ltr">
            <span :class="{ active: uiLanguage !== 'ar' }">EN</span>
            <span class="lang-sep">|</span>
            <span :class="{ active: uiLanguage === 'ar' }">عربي</span>
          </div>

          <!-- Dark Mode Toggle -->
          <button class="icon-button theme-toggle" @click="toggleDarkMode" aria-label="Toggle theme">
            <i :class="isDarkMode ? 'bi-sun' : 'bi-moon'"></i>
          </button>

          <!-- Live Indicator -->
          <LiveIndicator
            :lastUpdate="lastUpdate"
            :isLoading="isLoading"
            :error="error"
            :uiLanguage="uiLanguage"
          />
        </div>
      </div>

      <!-- Category Strip -->
      <div class="header-categories" dir="ltr">
        <button
          v-for="cat in categories"
          :key="cat.key"
          class="cat-pill"
          :class="{ active: searchTopic === cat.key && !selectedMapLocations.length }"
          @click="setCategory(cat.key)"
        >
          {{ uiLanguage === 'ar' ? cat.ar : cat.en }}
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="content-wrapper">
      <!-- Map + Search overlaid -->
      <div class="map-search-stack">
        <NewsMap
          :uiLanguage="uiLanguage"
          :trendingLocations="trendingLocations"
          :activeLocations="selectedMapLocations"
          :isDarkMode="isDarkMode"
          @locations-changed="handleLocationsChanged"
          @trending-topic-selected="handleTrendingTopicSelected"
        />
        <div class="search-overlay">
          <SearchBar
            v-model:topic="searchTopic"
            v-model:language="selectedLanguage"
            v-model:hours="selectedHours"
            v-model:smartSearch="smartSearchEnabled"
            :trending="trending"
            :uiLanguage="uiLanguage"
            :selectedCountries="selectedMapLocations"
            @search="fetchNews(true)"
            @refresh="refreshNow"
            @remove-country="removeCountry"
            @clear-countries="clearCountries"
            @trending-selected="handleTrendingTopicSelected"
          />
        </div>
      </div>

      <!-- Bilingual News Summary (shown on map click or trending topic click) -->
      <NewsSummary
        :summary="summaryData"
        :loading="summaryLoading"
        :trigger="summaryTrigger"
        :uiLanguage="uiLanguage"
        @dismiss="summaryData = null"
      />

      <!-- Ad slot: below AI summary (full-width banner) -->
      <AdUnit ad-slot="XXXXXXXXXX" format="horizontal" :banner="true" />

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
        <p>{{ t.news.loading }}</p>
      </div>

      <!-- No Results -->
      <div v-else-if="!isLoading && articles.length === 0" class="empty-state">
        <i class="bi bi-search"></i>
        <p>{{ t.news.noResults }}</p>
      </div>

      <!-- Combined Feed: News + Tweets -->
      <div v-else>
        <!-- Pagination: desktop only -->
        <div class="pagination-desktop">
          <Pagination
            :currentPage="currentPage"
            :itemsPerPage="itemsPerPage"
            :totalItems="totalArticles"
            :uiLanguage="uiLanguage"
            @page-change="handlePageChange"
          />
        </div>

        <!-- Feed filter bar -->
        <div class="feed-filter-bar">
          <button
            class="filter-toggle"
            :class="{ active: filterPhotosOnly }"
            @click="togglePhotoFilter"
          >
            <i class="bi bi-image"></i>
            <span>{{ uiLanguage === 'ar' ? 'بصور فقط' : 'Photos only' }}</span>
          </button>
        </div>

        <!-- Feed: swipe deck on mobile, grid on desktop -->
        <div class="feed-wrap">
          <!-- Prev arrow -->
          <button
            class="swipe-arrow swipe-arrow--prev"
            :class="{ hidden: swipeIndex === 0 }"
            @click.stop="scrollToSwipeCard(swipeIndex - 1)"
            aria-label="Previous article"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <div class="feed-grid" ref="feedSwipeRef" @scroll.passive="onFeedScroll">
            <template v-for="(item, index) in visibleFeed" :key="item.type === 'article' ? item.url : item.id">
              <NewsCard v-if="item.type === 'article'" :article="item" :uiLanguage="uiLanguage" :featured="index === firstArticleIndex" @open-detail="handleOpenDetail" />
              <TweetCard v-else-if="item.type === 'tweet'" :tweet="item" />
              <!-- Ad card every 5 items — fits in swipe deck on mobile, grid on desktop -->
              <AdUnit
                v-if="index > 0 && index % 5 === 0"
                ad-slot="XXXXXXXXXX"
                format="rectangle"
                class="feed-ad"
              />
            </template>
            <div class="swipe-sentinel" ref="swipeSentinelRef"></div>
          </div>

          <!-- Next arrow -->
          <button
            class="swipe-arrow swipe-arrow--next"
            :class="{ hidden: swipeIndex >= visibleFeed.length - 1 }"
            @click.stop="scrollToSwipeCard(swipeIndex + 1)"
            aria-label="Next article"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <!-- Mobile swipe counter + load indicator -->
        <div class="swipe-counter" dir="ltr">
          <span class="swipe-pos">{{ swipeIndex + 1 }}</span>
          <span class="swipe-sep">/</span>
          <span class="swipe-total">{{ visibleFeed.length }}</span>
          <span v-if="isLoading" class="swipe-loading-dot"></span>
        </div>

        <!-- Pagination: desktop only -->
        <div class="pagination-desktop">
          <Pagination
            :currentPage="currentPage"
            :itemsPerPage="itemsPerPage"
            :totalItems="totalArticles"
            :uiLanguage="uiLanguage"
            @page-change="handlePageChange"
          />
        </div>
      </div>
      <!-- Footer -->
      <AppFooter :uiLanguage="uiLanguage" @open-policy="activePolicy = $event" />
    </main>

    <!-- Article Detail Modal: opened via card tap -->
    <ArticleDetailModal
      v-if="activeDetailArticle"
      :article="activeDetailArticle"
      :uiLanguage="uiLanguage"
      @close="activeDetailArticle = null"
    />

    <!-- Article Detail Modal: opened via shared Newsly link (#article=slug) -->
    <ArticleDetailModal
      v-else-if="articleDetailSlug"
      :articleSlug="articleDetailSlug"
      :uiLanguage="uiLanguage"
      @close="closeArticleDetail"
    />

    <!-- Article Detail Modal: opened via shared Newsly link (#article=BASE64) -->
    <ArticleDetailModal
      v-else-if="articleDetailUrl"
      :articleUrl="articleDetailUrl"
      :uiLanguage="uiLanguage"
      @close="closeArticleDetail"
    />

    <!-- Policy Modal -->
    <PolicyModal
      :policy="activePolicy"
      :uiLanguage="uiLanguage"
      @close="activePolicy = null"
    />

    <!-- Bottom Navigation (mobile-only) -->
    <nav class="bottom-nav">
      <button class="nav-item active">
        <i class="bi bi-newspaper"></i>
        <span>{{ t.nav.news }}</span>
      </button>
      <button class="nav-item" @click="refreshNow">
        <i class="bi bi-arrow-clockwise"></i>
        <span>{{ t.nav.refresh }}</span>
      </button>
      <button class="nav-item">
        <i class="bi bi-twitter"></i>
        <span>{{ t.nav.tweets }}</span>
      </button>
    </nav>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { translations } from './i18n'
import axios from 'axios'
import NewsCard from './components/NewsCard.vue'
import TweetCard from './components/TweetCard.vue'
import SearchBar from './components/SearchBar.vue'
import LiveIndicator from './components/LiveIndicator.vue'
import NewsMap from './components/NewsMap.vue'
import Pagination from './components/Pagination.vue'
import NewsSummary from './components/NewsSummary.vue'
import AppFooter from './components/AppFooter.vue'
import PolicyModal from './components/PolicyModal.vue'
import ArticleDetailModal from './components/ArticleDetailModal.vue'
import AdUnit from './components/AdUnit.vue'
import { trackEvent, trackPageView } from './analytics.js'

export default {
  name: 'App',
  components: {
    NewsCard,
    TweetCard,
    SearchBar,
    LiveIndicator,
    NewsMap,
    Pagination,
    NewsSummary,
    AppFooter,
    PolicyModal,
    ArticleDetailModal,
    AdUnit
  },
  setup() {
    const articles = ref([])
    const tweets = ref([])
    const feedSwipeRef = ref(null)
    const swipeSentinelRef = ref(null)
    const swipeIndex = ref(0)
    const trending = ref([])
    const searchTopic = ref('')
    const selectedLanguage = ref('both')
    const selectedHours = ref('168') // Default: last 7 days
    const smartSearchEnabled = ref(true) // NEW: Enable smart search by default
    const trendingLocations = ref([]) // NEW: For map visualization
    const selectedMapLocations = ref([])
    const uiLanguage = ref(localStorage.getItem('locale') || 'en')
    const t = computed(() => translations[uiLanguage.value] || translations.en)
    const activePolicy = ref(null) // 'privacy' | 'terms' | 'cookies' | 'dmca'
    const articleDetailUrl = ref(null)  // set from #article=BASE64 hash
    const articleDetailSlug = ref(null) // set from #article=slug hash
    const activeDetailArticle = ref(null) // set when user taps a card in the feed

    const handleOpenDetail = (article) => {
      activeDetailArticle.value = article
      trackEvent('view_article', { article_title: article.title, source: article.source })
    }
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

    const summaryData = ref(null)
    const summaryLoading = ref(false)
    const summaryTrigger = ref('')

    const fetchSummary = async (countries, topic, triggerLabel) => {
      summaryLoading.value = true
      summaryData.value = null
      summaryTrigger.value = triggerLabel
      try {
        const params = new URLSearchParams()
        if (topic) params.set('topic', topic)
        params.set('hours', selectedHours.value)
        const res = await fetch(`/api/news/summary?${params}`)
        const data = await res.json()
        summaryData.value = data.summary || null
      } catch (err) {
        console.warn('Summary fetch failed:', err)
        summaryData.value = null
      } finally {
        summaryLoading.value = false
      }
    }

    const categories = [
      { key: '', en: 'All', ar: 'الكل' },
      { key: 'world', en: 'World', ar: 'العالم' },
      { key: 'politics', en: 'Politics', ar: 'سياسة' },
      { key: 'business', en: 'Business', ar: 'أعمال' },
      { key: 'technology', en: 'Tech', ar: 'تقنية' },
      { key: 'sports', en: 'Sports', ar: 'رياضة' },
      { key: 'health', en: 'Health', ar: 'صحة' },
    ]

    const setCategory = (key) => {
      searchTopic.value = key
      selectedMapLocations.value = []
      trackEvent('select_category', { category: key || 'all' })
      fetchNews(true)
      if (key) fetchSummary(null, key, key)
      else summaryData.value = null
    }

    const toggleUILanguage = () => {
      uiLanguage.value = uiLanguage.value === 'en' ? 'ar' : 'en'
      localStorage.setItem('locale', uiLanguage.value)
      trackEvent('toggle_language', { language: uiLanguage.value })
      document.documentElement.dir = uiLanguage.value === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = uiLanguage.value
      selectedLanguage.value = uiLanguage.value
      if (!selectedMapLocations.value.length && !searchTopic.value) {
        summaryTrigger.value = uiLanguage.value === 'ar' ? 'نشرة اليوم' : "Today's Briefing"
      }
      fetchNews(true)
    }

    const toggleDarkMode = () => {
      isDarkMode.value = !isDarkMode.value
      localStorage.setItem('darkMode', isDarkMode.value)
      document.documentElement.classList.toggle('dark', isDarkMode.value)
      trackEvent('toggle_dark_mode', { enabled: isDarkMode.value })
    }

    const handleLocationsChanged = (locations) => {
      selectedMapLocations.value = locations
      if (locations.length > 0) {
        trackEvent('filter_by_location', { locations: locations.map(l => l.name).join(', ') })
        const names = locations.map(loc => loc.name).join(' ')
        searchTopic.value = names
        // Switch to both languages — map click means "news about X country"
        // in any language, not just the UI language
        selectedLanguage.value = 'both'
        fetchSummary(null, names, locations.map(loc => loc.name).join(', '))
      } else {
        searchTopic.value = ''
        summaryData.value = null
      }
      fetchNews(true)
    }

    const removeCountry = (code) => {
      selectedMapLocations.value = selectedMapLocations.value.filter(loc => loc.code !== code)
      handleLocationsChanged(selectedMapLocations.value)
    }

    const clearCountries = () => {
      selectedMapLocations.value = []
      handleLocationsChanged([])
    }

    const handlePageChange = (page) => {
      currentPage.value = page
      fetchNews()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const scrollToSwipeCard = (index) => {
      if (!feedSwipeRef.value) return
      const el = feedSwipeRef.value
      const cards = el.querySelectorAll('.news-card, .tweet-card')
      const clamped = Math.max(0, Math.min(index, cards.length - 1))
      if (!cards[clamped]) return
      // RTL: scrollLeft is negative in RTL scroll containers
      const isRTL = uiLanguage.value === 'ar'
      if (isRTL) {
        el.scrollTo({ left: -(cards.length - 1 - clamped) * window.innerWidth, behavior: 'smooth' })
      } else {
        el.scrollTo({ left: cards[clamped].offsetLeft, behavior: 'smooth' })
      }
    }

    let scrollTimer = null
    const onFeedScroll = () => {
      if (!feedSwipeRef.value) return
      const el = feedSwipeRef.value
      const isRTL = uiLanguage.value === 'ar'
      const rawIdx = Math.round(Math.abs(el.scrollLeft) / window.innerWidth)
      const idx = isRTL ? (visibleFeed.value.length - 1 - rawIdx) : rawIdx
      swipeIndex.value = Math.max(0, Math.min(idx, visibleFeed.value.length - 1))

      // Debounce the fetch — only trigger after scrolling settles
      if (scrollTimer) clearTimeout(scrollTimer)
      scrollTimer = setTimeout(() => {
        if (
          swipeIndex.value >= visibleFeed.value.length - 4 &&
          !isLoading.value &&
          articles.value.length < totalArticles.value
        ) {
          currentPage.value += 1
          fetchNews(false)
        }
      }, 200)
    }

    const filteredArticles = computed(() => {
      if (!searchFilter.value) return articles.value
      const filter = searchFilter.value.toLowerCase()
      return articles.value.filter(article =>
        article.title?.toLowerCase().includes(filter) ||
        article.description?.toLowerCase().includes(filter)
      )
    })

    // Enrich articles with multi-source cluster count
    const STOP = new Set(['about','after','been','before','could','every','first','found','given','going','having','makes','other','people','state','their','there','these','those','three','under','where','which','while','would'])
    const articlesWithMeta = computed(() =>
      articles.value.map(article => {
        const words = (article.title || '')
          .toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
          .filter(w => w.length > 4 && !STOP.has(w))
        const wordSet = new Set(words)
        const sameStory = articles.value.filter(other => {
          if (other.url === article.url || other.source === article.source) return false
          const overlap = (other.title || '').toLowerCase().replace(/[^a-z\s]/g, '')
            .split(/\s+/).filter(w => wordSet.has(w)).length
          return overlap >= 3
        })
        return {
          ...article,
          confirmedBy: sameStory.length + 1,
          confirmedSources: [...new Set([article.source, ...sameStory.map(m => m.source)].filter(Boolean))]
        }
      })
    )

    const filterPhotosOnly = ref(false)
    const togglePhotoFilter = () => {
      filterPhotosOnly.value = !filterPhotosOnly.value
      trackEvent('toggle_photo_filter', { enabled: filterPhotosOnly.value })
    }

    const visibleFeed = computed(() => {
      if (!filterPhotosOnly.value) return combinedFeed.value
      return combinedFeed.value.filter(item =>
        item.type !== 'article' || (item.image && item.image !== '')
      )
    })

    const firstArticleIndex = computed(() =>
      visibleFeed.value.findIndex(item => item.type === 'article')
    )

    // Combined feed: mix articles and tweets
    const combinedFeed = computed(() => {
      const feed = []

      // Add articles with type marker
      articlesWithMeta.value.forEach(article => {
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
        // Calculate offset for pagination
        const offset = (currentPage.value - 1) * itemsPerPage.value

        // Fetch news articles with pagination
        // Note: map country selections are passed as topic (smart search finds
        // articles mentioning that country in any language), not as a source filter
        const newsResponse = await axios.get('/api/news', {
          params: {
            topic: searchTopic.value,
            language: selectedLanguage.value,
            hours: selectedHours.value,
            limit: itemsPerPage.value,
            offset: offset,
            smartSearch: smartSearchEnabled.value
          }
        })

        if (newsResponse.data.success) {
          if (resetPage) {
            articles.value = newsResponse.data.articles
          } else {
            // Append for infinite swipe — avoid duplicates, cap at 60 to prevent O(n²) hang
            const existingUrls = new Set(articles.value.map(a => a.url))
            const newOnes = newsResponse.data.articles.filter(a => !existingUrls.has(a.url))
            articles.value = [...articles.value, ...newOnes].slice(0, 60)
          }
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
        error.value = t.value.news.noResults
      } finally {
        isLoading.value = false
      }
    }

    const fetchTrending = async () => {
      try {
        const response = await axios.get('/api/trending/smart', {
          params: { hours: parseInt(selectedHours.value) || 168, limit: 10 }
        })
        if (response.data.success) {
          trending.value = response.data.trending
          // Derive map pin data from trending topics — no separate DB table needed
          trendingLocations.value = deriveTrendingLocations(response.data.trending)
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

    // Build trendingLocations from smart trending topics (each topic has a countries array)
    const deriveTrendingLocations = (topics) => {
      const byCountry = {}
      topics.forEach(t => {
        if (!t.countries) return
        t.countries.forEach(code => {
          if (!byCountry[code]) byCountry[code] = []
          byCountry[code].push({ topic: t.topic, count: t.count, score: t.score })
        })
      })
      return Object.entries(byCountry).map(([countryCode, topicList]) => ({
        countryCode,
        topics: topicList.sort((a, b) => b.score - a.score).slice(0, 3)
      }))
    }

    // Keep for explicit refresh but now just re-calls fetchTrending
    const fetchTrendingLocations = async () => {
      await fetchTrending()
    }

    // NEW: Handle trending topic selection from map
    const handleTrendingTopicSelected = (topic) => {
      searchTopic.value = topic
      selectedMapLocations.value = [] // Clear map country chips
      trackEvent('select_trending_topic', { topic })
      fetchNews(true) // Reset to page 1
      fetchSummary(null, topic, topic)
    }

    const closeArticleDetail = () => {
      articleDetailUrl.value = null
      articleDetailSlug.value = null
      if (window.location.hash.startsWith('#article=')) {
        history.replaceState(null, '', window.location.pathname)
      }
    }

    const refreshNow = () => {
      trackEvent('manual_refresh')
      fetchNews(true)
      fetchTrending()
    }

    const startAutoRefresh = () => {
      // Refresh every 5 minutes — 30s was too aggressive with O(n²) article enrichment
      autoRefreshInterval = setInterval(() => {
        fetchNews(true)
      }, 300000)
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

      // Detect shared article link: /#article=slug or /#article=BASE64_URL
      const hash = window.location.hash
      if (hash.startsWith('#article=')) {
        const identifier = hash.slice(9)
        if (/^[a-z0-9][a-z0-9-]{2,79}$/.test(identifier)) {
          // New slug format — pass via separate ref
          articleDetailSlug.value = identifier
        } else {
          try {
            articleDetailUrl.value = decodeURIComponent(atob(identifier))
          } catch (e) {
            console.warn('Invalid article hash', e)
          }
        }
      }

      trackPageView('Newsly Home')
      fetchNews()
      fetchTrending()
      // Show a global briefing card immediately on load
      fetchSummary(null, null, uiLanguage.value === 'ar' ? 'نشرة اليوم' : "Today's Briefing")
      startAutoRefresh()
    })

    onUnmounted(() => {
      stopAutoRefresh()
    })

    return {
      t,
      articles,
      tweets,
      trending,
      searchTopic,
      selectedLanguage,
      selectedHours,
      smartSearchEnabled,
      trendingLocations,
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
      handleTrendingTopicSelected,
      removeCountry,
      clearCountries,
      summaryData,
      summaryLoading,
      summaryTrigger,
      currentPage,
      itemsPerPage,
      totalArticles,
      handlePageChange,
      activePolicy,
      firstArticleIndex,
      feedSwipeRef,
      swipeSentinelRef,
      swipeIndex,
      onFeedScroll,
      scrollToSwipeCard,
      filterPhotosOnly,
      togglePhotoFilter,
      visibleFeed,
      articleDetailUrl,
      articleDetailSlug,
      activeDetailArticle,
      closeArticleDetail,
      handleOpenDetail,
      categories,
      setCategory
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

/* Gradient Background (simplified for mobile) - Lapis Night */
.gradient-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #ede8de 0%, #fdfcf7 40%, #f5f3ee 100%);
  z-index: -1;
}

@media (min-width: 1024px) {
  .gradient-bg {
    background: linear-gradient(135deg, #e8e0d0 0%, #fdfcf7 50%, #edeae3 100%);
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px) saturate(150%);
  border-bottom: 2px solid #1e3a5f;
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
  background: linear-gradient(135deg, #1e3a5f 0%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.pulse-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: #d97706;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
  margin-left: 6px;
  vertical-align: middle;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Language toggle pill */
.lang-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.15);
  border-radius: 4px;
  padding: 0 10px;
  height: 36px;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: rgba(30,58,95,0.45);
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s;
  user-select: none;
}
.lang-toggle:active { background: rgba(30,58,95,0.1); }
.lang-toggle .active { color: #1e3a5f; }
.lang-sep { color: rgba(30,58,95,0.2); font-size: 0.6rem; }

/* Category strip */
.header-categories {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 0 10px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.header-categories::-webkit-scrollbar { display: none; }

.cat-pill {
  flex-shrink: 0;
  padding: 4px 13px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  border: 1px solid rgba(30,58,95,0.15);
  background: rgba(30,58,95,0.04);
  color: rgba(30,58,95,0.5);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s;
  white-space: nowrap;
}
.cat-pill:active { transform: scale(0.95); }
.cat-pill.active {
  background: rgba(30,58,95,0.1);
  border-color: rgba(30,58,95,0.35);
  color: #1e3a5f;
}

/* Touch-optimized icon buttons — match lang toggle height */
.icon-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.15);
  border-radius: 4px;
  color: #1e3a5f;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.icon-button:active {
  background: rgba(30,58,95,0.1);
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
    background: rgba(30,58,95,0.1);
    transform: translateY(-2px);
  }

  .cat-pill:hover:not(.active) {
    background: rgba(30,58,95,0.07);
    color: rgba(30,58,95,0.75);
  }

  .icon-button:active {
    transform: scale(0.95);
  }
}

/* ============================================
   CONTENT WRAPPER - Mobile-First Spacing
   ============================================ */
.content-wrapper {
  padding-top: calc(56px + 38px + max(12px, env(safe-area-inset-top)) + 16px);
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
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 4px;
  padding: 12px 16px;
  color: #dc2626;
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
  border-radius: 3px;
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
  border: 4px solid rgba(30,58,95,0.1);
  border-top-color: #1e3a5f;
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
  color: rgba(30,58,95,0.2);
  margin-bottom: 16px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

/* ============================================
   MAP + SEARCH STACK - Search pinned to bottom of map
   ============================================ */
.map-search-stack {
  position: relative;
  margin-bottom: 20px;
}

/* SearchBar anchored to the bottom edge of the map */
.search-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

/* Compact, bottom-docked search bar */
.search-overlay :deep(.search-container) {
  margin-bottom: 0;
  border-radius: 0;
  border-top: 1px solid rgba(30,58,95,0.12);
  border-left: none;
  border-right: none;
  border-bottom: none;
  padding: 10px 12px 8px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  box-shadow: 0 -6px 24px rgba(30,58,95,0.1);
}

/* Compact inputs */
.search-overlay :deep(.search-input) {
  height: 34px;
  font-size: 0.8125rem;
  border-radius: 3px;
}

.search-overlay :deep(.search-button) {
  height: 34px;
  font-size: 0.8125rem;
  border-radius: 3px;
}

.search-overlay :deep(.search-form) {
  gap: 8px;
  margin-bottom: 8px;
}

.search-overlay :deep(.filter-select) {
  height: 30px;
  font-size: 0.775rem;
  border-radius: 3px;
  padding: 0 8px;
}

.search-overlay :deep(.filter-row) {
  margin-bottom: 0;
  gap: 8px;
}

.search-overlay :deep(.filter-label) {
  font-size: 0.6rem;
  margin-bottom: 2px;
}

/* Hide trending section — too tall for map overlay */
.search-overlay :deep(.trending-section) {
  display: none;
}

/* ============================================
   FEED GRID — Mobile: swipe deck / Desktop: grid
   ============================================ */

/* ── Feed filter bar ─────────────────────────────── */
.feed-filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid rgba(30,58,95,0.15);
  background: rgba(30,58,95,0.04);
  color: rgba(30,58,95,0.5);
  cursor: pointer;
  transition: all 0.18s;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.filter-toggle i { font-size: 0.85rem; }

.filter-toggle:active { transform: scale(0.95); }

.filter-toggle.active {
  background: rgba(30,58,95,0.1);
  border-color: rgba(30,58,95,0.35);
  color: #1e3a5f;
}

/* ── Swipe wrapper (relative, so arrows can be absolute) ── */
.feed-wrap {
  position: relative;
}

/* ── Swipe arrows — mobile only, fixed to screen edges ── */
.swipe-arrow {
  display: none;
}

@media (max-width: 767px) {
  .swipe-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(14px) saturate(160%);
    border: 1.5px solid rgba(30,58,95,0.2);
    color: #1e3a5f;
    font-size: 1.4rem;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(30,58,95,0.15);
    transition: opacity 0.2s, background 0.15s, border-color 0.15s, transform 0.15s;
    -webkit-tap-highlight-color: transparent;
  }

  .swipe-arrow--prev { left: 8px; }
  .swipe-arrow--next { right: 8px; }

  .swipe-arrow:active {
    transform: translateY(-50%) scale(0.88);
    background: rgba(30,58,95,0.12);
    border-color: rgba(30,58,95,0.4);
  }

  .swipe-arrow.hidden {
    opacity: 0.18;
    pointer-events: none;
  }
}

/* ── Mobile swipe deck (< 768px) ── */
.feed-grid {
  display: flex;
  flex-direction: row;
  overflow-x: scroll;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  /* Bleed past content-wrapper padding to go edge-to-edge */
  margin: 8px calc(-1 * max(16px, env(safe-area-inset-left))) 0 calc(-1 * max(16px, env(safe-area-inset-right)));
  width: calc(100% + max(32px, env(safe-area-inset-left) + env(safe-area-inset-right)));
  gap: 0;
}

.feed-grid::-webkit-scrollbar { display: none; }

/* Each card fills the viewport width */
.feed-grid :deep(.news-card),
.feed-grid :deep(.tweet-card),
.feed-grid :deep(.ad-card) {
  flex-shrink: 0;
  width: 100vw;
  scroll-snap-align: start;
  border-radius: 0;
  border-left: none;
  border-right: none;
}

/* Sentinel spacer at the end of the swipe deck */
.swipe-sentinel {
  flex-shrink: 0;
  width: 1px;
}

/* ── Swipe counter ── */
.swipe-counter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 10px 0 4px;
  font-size: 0.72rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(30,58,95,0.35);
}

.swipe-sep { color: rgba(30,58,95,0.18); margin: 0 1px; }

.swipe-loading-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #d97706;
  margin-left: 6px;
  animation: pulse 1s ease-in-out infinite;
}

/* Hide pagination on mobile — swipe + auto-load handles it */
.pagination-desktop { display: none; }

/* ── Tablet: 2-column grid ── */
@media (min-width: 768px) {
  .feed-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    overflow-x: visible;
    scroll-snap-type: none;
    margin: 20px 0;
    width: 100%;
  }

  .feed-grid :deep(.news-card),
  .feed-grid :deep(.tweet-card),
  .feed-grid :deep(.ad-card) {
    width: auto;
    border-radius: 6px;
    border-left: revert;
    border-right: revert;
    flex-shrink: revert;
    scroll-snap-align: none;
  }

  .swipe-sentinel { display: none; }
  .swipe-counter { display: none; }
  .pagination-desktop { display: block; }

}

/* ── Desktop: 3-col editorial grid ── */
@media (min-width: 1024px) {
  .feed-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }

  .feed-grid :deep(.news-card.featured) {
    grid-column: span 2;
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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(30,58,95,0.1);
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
  color: rgba(30,58,95,0.4);
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
  color: #1e3a5f;
}

.nav-item:active {
  background: rgba(30,58,95,0.06);
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

/* direction: rtl on the container already reverses flex order naturally —
   no flex-direction: row-reverse needed (it would cancel out the rtl effect) */

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

/* ============================================
   DARK MODE OVERRIDES
   ============================================ */

/* ── App shell ── */
.dark-mode .gradient-bg {
  background: linear-gradient(180deg, #070b14 0%, #0f1419 40%, #111827 100%);
}

@media (min-width: 1024px) {
  .dark-mode .gradient-bg {
    background: linear-gradient(135deg, #070b14 0%, #0f1419 50%, #111827 100%);
  }
}

.dark-mode .mobile-header {
  background: rgba(10, 14, 28, 0.97);
  border-bottom-color: rgba(255, 255, 255, 0.07);
}

.dark-mode .gradient-text {
  background: linear-gradient(135deg, #60a5fa 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.dark-mode .pulse-dot { background: #f59e0b; }

.dark-mode .lang-toggle {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.38);
}
.dark-mode .lang-toggle:active { background: rgba(255, 255, 255, 0.09); }
.dark-mode .lang-toggle .active { color: rgba(255, 255, 255, 0.88); }
.dark-mode .lang-sep { color: rgba(255, 255, 255, 0.12); }

.dark-mode .icon-button {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}
.dark-mode .icon-button:active { background: rgba(255, 255, 255, 0.1); }

@media (min-width: 1024px) {
  .dark-mode .icon-button:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
  }
  .dark-mode .cat-pill:hover:not(.active) {
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.65);
  }
}

.dark-mode .cat-pill {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
}
.dark-mode .cat-pill.active {
  background: rgba(96, 165, 250, 0.14);
  border-color: rgba(96, 165, 250, 0.35);
  color: #60a5fa;
}

.dark-mode .filter-toggle {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
}
.dark-mode .filter-toggle.active {
  background: rgba(96, 165, 250, 0.14);
  border-color: rgba(96, 165, 250, 0.35);
  color: #60a5fa;
}

.dark-mode .swipe-counter { color: rgba(255, 255, 255, 0.28); }
.dark-mode .swipe-sep { color: rgba(255, 255, 255, 0.1); }

.dark-mode .bottom-nav {
  background: rgba(10, 14, 28, 0.97);
  border-top-color: rgba(255, 255, 255, 0.07);
}
.dark-mode .nav-item { color: rgba(255, 255, 255, 0.32); }
.dark-mode .nav-item.active { color: #60a5fa; }
.dark-mode .nav-item:active { background: rgba(255, 255, 255, 0.05); }

.dark-mode .loading-spinner {
  border-color: rgba(255, 255, 255, 0.08);
  border-top-color: #60a5fa;
}
.dark-mode .empty-state i { color: rgba(255, 255, 255, 0.12); }
.dark-mode .loading-state p,
.dark-mode .empty-state p { color: rgba(255, 255, 255, 0.4); }

.dark-mode .search-overlay :deep(.search-container) {
  background: rgba(10, 14, 28, 0.97);
  border-top-color: rgba(255, 255, 255, 0.07);
  box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.5);
}

/* ── NewsCard ── */
.dark-mode :deep(.news-card) {
  background: #192031;
  border-color: rgba(255, 255, 255, 0.07);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}
.dark-mode :deep(.card-title) { color: rgba(255, 255, 255, 0.9); }
.dark-mode :deep(.card-excerpt) { color: rgba(255, 255, 255, 0.55); }
.dark-mode :deep(.meta-item) { color: rgba(255, 255, 255, 0.45); }
.dark-mode :deep(.meta-item i) { color: #f59e0b; }
.dark-mode :deep(.card-img-placeholder) { background: rgba(255, 255, 255, 0.04); }
.dark-mode :deep(.action-button.secondary) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}
.dark-mode :deep(.action-button.share-action) {
  background: rgba(96, 165, 250, 0.08);
  border-color: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}
.dark-mode :deep(.action-button.fact-action) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
}

/* ── TweetCard ── */
.dark-mode :deep(.tweet-card) {
  background: #192031;
  border-color: rgba(255, 255, 255, 0.07);
  border-left-color: #1da1f2;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}
.dark-mode :deep(.author-name) { color: rgba(255, 255, 255, 0.88); }
.dark-mode :deep(.username) { color: rgba(255, 255, 255, 0.45); }
.dark-mode :deep(.tweet-text) { color: rgba(255, 255, 255, 0.82); }
.dark-mode :deep(.tweet-metrics) {
  border-top-color: rgba(255, 255, 255, 0.07);
  border-bottom-color: rgba(255, 255, 255, 0.07);
}
.dark-mode :deep(.metric-item) { color: rgba(255, 255, 255, 0.45); }
.dark-mode :deep(.tweet-time) { color: rgba(255, 255, 255, 0.4); }

/* ── AdUnit ── */
.dark-mode :deep(.ad-card) {
  background: #192031;
  border-color: rgba(255, 255, 255, 0.07);
}
.dark-mode :deep(.ad-card--banner) {
  background: rgba(255, 255, 255, 0.02);
  border-top-color: rgba(255, 255, 255, 0.06);
  border-bottom-color: rgba(255, 255, 255, 0.06);
}
.dark-mode :deep(.ad-sponsored-label) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
}

/* ── Pagination ── */
.dark-mode :deep(.pagination-container) {
  background: #192031;
  border-color: rgba(255, 255, 255, 0.07);
}
.dark-mode :deep(.page-button) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.65);
}
.dark-mode :deep(.page-number) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
}
.dark-mode :deep(.page-number.active) {
  background: linear-gradient(135deg, #1e3a5f, #2d5f8a);
  border-color: transparent;
  color: white;
}
.dark-mode :deep(.ellipsis) { color: rgba(255, 255, 255, 0.3); }

/* ── AppFooter ── */
.dark-mode :deep(.app-footer) {
  background: #0a0e1c;
  border-top-color: rgba(255, 255, 255, 0.07);
}
.dark-mode :deep(.footer-logo-text) {
  background: linear-gradient(135deg, #60a5fa 0%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.dark-mode :deep(.footer-dot) { background: #f59e0b; }
.dark-mode :deep(.footer-tagline) { color: rgba(255, 255, 255, 0.38); }
.dark-mode :deep(.footer-divider) { background: rgba(255, 255, 255, 0.06); }
.dark-mode :deep(.footer-col-title) { color: rgba(255, 255, 255, 0.25); }
.dark-mode :deep(.footer-about-text) { color: rgba(255, 255, 255, 0.45); }
.dark-mode :deep(.footer-location) { color: rgba(255, 255, 255, 0.3); }
.dark-mode :deep(.footer-location i) { color: #f59e0b; }
.dark-mode :deep(.footer-dusoft-link) { color: #60a5fa; }
.dark-mode :deep(.footer-link) { color: rgba(255, 255, 255, 0.4); }
.dark-mode :deep(.footer-copyright) { color: rgba(255, 255, 255, 0.2); }
.dark-mode :deep(.soon-badge) {
  background: rgba(96, 165, 250, 0.08);
  border-color: rgba(96, 165, 250, 0.2);
  color: rgba(255, 255, 255, 0.4);
}
.dark-mode :deep(.social-icon) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
}

/* ── LiveIndicator ── */
.dark-mode :deep(.live-chip) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}

/* ── NewsMap ── */
.dark-mode :deep(.map-container) {
  background: rgba(15, 20, 30, 0.95);
  border-color: rgba(255, 255, 255, 0.07);
}
.dark-mode :deep(.map-header h5) { color: rgba(255, 255, 255, 0.9); }
.dark-mode :deep(.map-header i) { color: #60a5fa; }
.dark-mode :deep(.legend-item) { color: rgba(255, 255, 255, 0.5); }
.dark-mode :deep(.marker-label) {
  background: rgba(15, 20, 30, 0.9);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
}
.dark-mode :deep(.marker-label.selected) {
  background: linear-gradient(135deg, #1e3a5f, #2d5f8a);
  border-color: transparent;
  color: white;
}

/* ── SearchBar ── */
.dark-mode :deep(.search-bar-container),
.dark-mode :deep(.search-container) {
  background: #192031;
  border-color: rgba(255, 255, 255, 0.08);
}
.dark-mode :deep(.search-input) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
}
.dark-mode :deep(.filter-select) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}
.dark-mode :deep(.filter-label) { color: rgba(255, 255, 255, 0.4); }
.dark-mode :deep(.trending-tag) {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.55);
}
.dark-mode :deep(.country-chip) {
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.3);
  color: #60a5fa;
}
.dark-mode :deep(.country-chip-remove) { color: rgba(96, 165, 250, 0.6); }

/* ── NewsSummary ── */
.dark-mode :deep(.summary-wrap) {
  background: #111827;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.4);
}
.dark-mode :deep(.summary-title) { color: rgba(255, 255, 255, 0.9); }
.dark-mode :deep(.trigger-chip) {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.1);
  border-color: rgba(96, 165, 250, 0.2);
}
.dark-mode :deep(.counter) { color: rgba(255, 255, 255, 0.55); }
.dark-mode :deep(.counter-sep) { color: rgba(255, 255, 255, 0.2); }
.dark-mode :deep(.dismiss-btn) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}
.dark-mode :deep(.loading-row) { color: rgba(255, 255, 255, 0.5); }
.dark-mode :deep(.spinner) {
  border-color: rgba(255, 255, 255, 0.08);
  border-top-color: #60a5fa;
}
.dark-mode :deep(.text-primary) { color: rgba(255, 255, 255, 0.88); }
.dark-mode :deep(.text-secondary) { color: rgba(255, 255, 255, 0.6); }
.dark-mode :deep(.rss-section) { border-top-color: rgba(255, 255, 255, 0.06); }
.dark-mode :deep(.rss-headline) { color: rgba(255, 255, 255, 0.8); }
.dark-mode :deep(.rss-source) { color: rgba(255, 255, 255, 0.4); }

/* ── Swipe arrows ── */
.dark-mode .swipe-arrow {
  background: rgba(25, 32, 49, 0.9);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.75);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.dark-mode .swipe-arrow:active {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

/* ── ArticleDetailModal ── */
.dark-mode :deep(.modal-overlay) { background: rgba(0, 0, 0, 0.78); }
.dark-mode :deep(.modal-panel) {
  background: #0f1419;
  border-color: rgba(255, 255, 255, 0.07);
}

/* ── ShareModal ── */
.dark-mode :deep(.share-overlay) { background: rgba(0, 0, 0, 0.72); }
.dark-mode :deep(.share-panel) {
  background: #192031;
  border-color: rgba(255, 255, 255, 0.07);
}
</style>
