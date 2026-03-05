<template>
  <div class="search-container">
    <!-- Search Input -->
    <div class="search-form">
      <div class="search-input-wrapper">
        <i class="bi bi-search search-icon"></i>
        <input
          type="search"
          inputmode="search"
          class="search-input"
          placeholder="Search news..."
          :value="topic"
          @input="updateTopic"
          @keyup.enter="$emit('search')"
        />
      </div>
      <button class="search-button" @click="$emit('search')">
        <i class="bi bi-search"></i>
        <span class="button-text">Search</span>
      </button>
    </div>

    <!-- Smart Search Toggle -->
    <div class="smart-search-toggle">
      <label class="toggle-label">
        <input
          type="checkbox"
          :checked="smartSearch"
          @change="updateSmartSearch"
        />
        <span class="toggle-text">
          <i class="bi bi-stars"></i>
          Smart search (cross-language)
        </span>
      </label>
    </div>

    <!-- Filter Dropdowns -->
    <div class="filter-row">
      <select class="filter-select" :value="language" @change="updateLanguage">
        <option value="en">English</option>
        <option value="ar">العربية</option>
        <option value="both">Both</option>
      </select>

      <select class="filter-select" :value="region" @change="updateRegion">
        <option value="all">All Regions</option>
        <option value="us">US/Western</option>
        <option value="eu">Europe</option>
        <option value="middleeast">Middle East</option>
      </select>
    </div>

    <!-- Trending Topics -->
    <div v-if="trending.length > 0" class="trending-section">
      <small class="trending-label">
        <i class="bi bi-fire"></i>
        Trending Now
      </small>
      <div class="trending-tags">
        <span
          v-for="item in trending.slice(0, 8)"
          :key="item.topic || item"
          class="trending-tag"
          @click="selectTrending(item.topic || item)"
        >
          {{ item.topic || item }}
          <span v-if="item.count" class="tag-count">({{ item.count }})</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SearchBar',
  props: {
    topic: {
      type: String,
      default: ''
    },
    region: {
      type: String,
      default: 'all'
    },
    language: {
      type: String,
      default: 'en'
    },
    smartSearch: {
      type: Boolean,
      default: false
    },
    trending: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:topic', 'update:region', 'update:language', 'update:smartSearch', 'search', 'refresh'],
  setup(props, { emit }) {
    const updateTopic = (event) => {
      emit('update:topic', event.target.value)
    }

    const updateRegion = (event) => {
      emit('update:region', event.target.value)
      emit('search')
    }

    const updateLanguage = (event) => {
      emit('update:language', event.target.value)
      emit('search')
    }

    const updateSmartSearch = (event) => {
      emit('update:smartSearch', event.target.checked)
    }

    const selectTrending = (keyword) => {
      emit('update:topic', keyword)
      emit('search')
    }

    return {
      updateTopic,
      updateRegion,
      updateLanguage,
      updateSmartSearch,
      selectTrending
    }
  }
}
</script>

<style scoped>
/* ============================================
   SEARCH CONTAINER - Mobile-First
   ============================================ */
.search-container {
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
}

/* ============================================
   SEARCH FORM - Mobile-First
   ============================================ */
.search-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  /* Touch-optimized height */
  height: 48px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0 16px 0 48px;
  color: #ffffff;
  /* 16px to prevent iOS zoom */
  font-size: 1rem;
  transition: border-color 0.2s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.1);
}

/* Mobile: Full-width button */
.search-button {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.search-button:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.button-text {
  display: inline;
}

/* ============================================
   SMART SEARCH TOGGLE
   ============================================ */
.smart-search-toggle {
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 8px 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  -webkit-tap-highlight-color: transparent;
}

.toggle-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #06b6d4;
}

.toggle-text {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-text i {
  color: #06b6d4;
  font-size: 1rem;
}

/* ============================================
   FILTER ROW - Mobile-First
   ============================================ */
.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-select {
  flex: 1;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0 12px;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.1);
}

.filter-select option {
  background: #1a1a2e;
  color: #ffffff;
}

/* ============================================
   TRENDING SECTION - Mobile-First
   ============================================ */
.trending-section {
  margin-top: 16px;
}

.trending-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  font-weight: 600;
}

.trending-label i {
  color: #ff4444;
  font-size: 0.875rem;
}

.trending-tags {
  display: flex;
  gap: 8px;
  /* Horizontal scroll on mobile */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  /* Hide scrollbar */
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 4px;
}

.trending-tags::-webkit-scrollbar {
  display: none;
}

.trending-tag {
  /* Prevent shrinking */
  flex-shrink: 0;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: #06b6d4;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  /* Touch-optimized */
  min-height: 36px;
  display: flex;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
}

.trending-tag:active {
  background: rgba(6, 182, 212, 0.2);
  transform: scale(0.95);
}

.tag-count {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  margin-left: 4px;
  font-size: 0.8125rem;
}

/* ============================================
   TABLET ENHANCEMENT (min-width: 768px)
   ============================================ */
@media (min-width: 768px) {
  .search-container {
    padding: 20px;
  }

  .search-form {
    flex-direction: row;
    align-items: center;
  }

  .search-button {
    /* Inline button on tablet */
    width: auto;
    padding: 0 32px;
  }

  .filter-row {
    gap: 12px;
  }

  .trending-tags {
    /* Wrap on tablet */
    flex-wrap: wrap;
    overflow-x: visible;
  }
}

/* ============================================
   DESKTOP ENHANCEMENT (min-width: 1024px)
   ============================================ */
@media (min-width: 1024px) {
  .search-container {
    backdrop-filter: blur(12px);
    border-radius: 24px;
    padding: 24px;
  }

  .search-input {
    font-size: 1.125rem;
  }

  /* Desktop hover effects */
  .search-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4);
  }

  .search-button:active {
    transform: translateY(-2px);
    opacity: 1;
  }

  .trending-tag:hover {
    background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(6, 182, 212, 0.4);
  }

  .trending-tag:active {
    transform: translateY(-2px);
    background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
  }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .search-button,
  .trending-tag {
    transition: none;
  }

  .search-button:hover,
  .search-button:active,
  .trending-tag:hover,
  .trending-tag:active {
    transform: none;
  }
}
</style>
