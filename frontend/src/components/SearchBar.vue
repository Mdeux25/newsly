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
          :placeholder="tr.search.placeholder"
          :value="topic"
          :dir="uiLanguage === 'ar' ? 'rtl' : 'ltr'"
          @input="updateTopic"
          @keyup.enter="$emit('search')"
        />
      </div>
      <button class="search-button" @click="$emit('search')">
        <i class="bi bi-search"></i>
        <span class="button-text">{{ tr.search.button }}</span>
      </button>
    </div>

    <!-- Active country chips from map selection -->
    <div v-if="selectedCountries && selectedCountries.length > 0" class="active-filters">
      <span class="active-filter-label">
        <i class="bi bi-geo-alt-fill"></i>
        {{ uiLanguage === 'ar' ? 'تصفية حسب:' : 'Filtering by:' }}
      </span>
      <span
        v-for="loc in selectedCountries"
        :key="loc.code"
        class="country-chip"
        @click="$emit('remove-country', loc.code)"
      >
        {{ loc.name }}
        <i class="bi bi-x"></i>
      </span>
      <button class="clear-all" @click="$emit('clear-countries')">
        {{ uiLanguage === 'ar' ? 'مسح الكل' : 'Clear all' }}
      </button>
    </div>

    <!-- Filters row: language + time -->
    <div class="filter-row">
      <div class="filter-group">
        <label class="filter-label">{{ tr.search.language.label }}</label>
        <select class="filter-select" :value="language" @change="updateLanguage">
          <option value="en">{{ tr.search.language.english }}</option>
          <option value="ar">{{ tr.search.language.arabic }}</option>
          <option value="both">{{ tr.search.language.both }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label class="filter-label">{{ tr.search.time.label }}</label>
        <select class="filter-select" :value="hours" @change="updateHours">
          <option value="3">{{ tr.search.time.h3 }}</option>
          <option value="12">{{ tr.search.time.h12 }}</option>
          <option value="24">{{ tr.search.time.h24 }}</option>
          <option value="72">{{ tr.search.time.d3 }}</option>
          <option value="168">{{ tr.search.time.d7 }}</option>
        </select>
      </div>

      <!-- Smart search toggle, inline -->
      <label
        class="toggle-label smart-inline"
        :title="uiLanguage === 'ar' ? 'البحث الذكي يستخدم الذكاء الاصطناعي للعثور على مقالات ذات صلة بموضوع البحث' : 'Smart search uses AI to find articles semantically related to your query'"
      >
        <input type="checkbox" :checked="smartSearch" @change="updateSmartSearch" />
        <span class="toggle-text">
          <i class="bi bi-stars"></i>
          {{ uiLanguage === 'ar' ? 'ذكي' : 'Smart' }}
        </span>
      </label>
    </div>

    <!-- Trending Topics -->
    <div v-if="trending.length > 0" class="trending-section">
      <small class="trending-label">
        <i class="bi bi-fire"></i>
        {{ tr.search.trending }}
      </small>
      <div class="trending-tags">
        <span
          v-for="item in trending.slice(0, 8)"
          :key="item.topic || item"
          class="trending-tag"
          :class="{ active: topic === (item.topic || item) }"
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
import { computed } from 'vue'
import { translations } from '../i18n'

export default {
  name: 'SearchBar',
  props: {
    topic: { type: String, default: '' },
    language: { type: String, default: 'en' },
    hours: { type: [String, Number], default: '168' },
    smartSearch: { type: Boolean, default: false },
    trending: { type: Array, default: () => [] },
    uiLanguage: { type: String, default: 'en' },
    selectedCountries: { type: Array, default: () => [] }
  },
  emits: ['update:topic', 'update:language', 'update:hours', 'update:smartSearch', 'search', 'refresh', 'remove-country', 'clear-countries', 'trending-selected'],
  setup(props, { emit }) {
    const tr = computed(() => translations[props.uiLanguage] || translations.en)

    const updateTopic = (event) => emit('update:topic', event.target.value)
    const updateLanguage = (event) => { emit('update:language', event.target.value); emit('search') }
    const updateHours = (event) => { emit('update:hours', event.target.value); emit('search') }
    const updateSmartSearch = (event) => emit('update:smartSearch', event.target.checked)
    const selectTrending = (keyword) => emit('trending-selected', keyword)

    return { tr, updateTopic, updateLanguage, updateHours, updateSmartSearch, selectTrending }
  }
}
</script>

<style scoped>
.search-container {
  background: #ffffff;
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px rgba(30,58,95,0.07);
}

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
  color: #a8a29e;
  font-size: 1rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 48px;
  background: rgba(30,58,95,0.04);
  border: 1px solid rgba(30,58,95,0.12);
  border-radius: 4px;
  padding: 0 16px 0 48px;
  color: #1c1917;
  font-size: 1rem;
  transition: border-color 0.2s ease, background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.search-input::placeholder { color: #a8a29e; }

.search-input:focus {
  outline: none;
  border-color: #1e3a5f;
  background: rgba(30,58,95,0.03);
}

.search-button {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.search-button:active { transform: scale(0.97); opacity: 0.9; }

.button-text { display: inline; }

.active-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 10px 0 14px;
  padding: 10px 14px;
  background: rgba(30,58,95,0.04);
  border: 1px solid rgba(30,58,95,0.12);
  border-radius: 4px;
}

.active-filter-label {
  font-size: 0.75rem;
  color: #78716c;
  display: flex;
  align-items: center;
  gap: 4px;
}

.active-filter-label i { color: #1e3a5f; }

.country-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(30,58,95,0.08);
  border: 1px solid rgba(30,58,95,0.2);
  color: #1e3a5f;
  padding: 4px 10px;
  border-radius: 3px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.country-chip:hover { background: rgba(30,58,95,0.12); }
.country-chip i { font-size: 0.75rem; opacity: 0.7; }

.clear-all {
  font-size: 0.75rem;
  color: #a8a29e;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
  transition: color 0.2s ease;
  margin-left: auto;
}

.clear-all:hover { color: #44403c; }

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.filter-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a8a29e;
  padding-left: 2px;
}

.filter-select {
  width: 100%;
  height: 42px;
  background: rgba(30,58,95,0.04);
  border: 1px solid rgba(30,58,95,0.12);
  border-radius: 4px;
  padding: 0 12px;
  color: #1c1917;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.filter-select:focus {
  outline: none;
  border-color: #1e3a5f;
}

.filter-select option {
  background: #ffffff;
  color: #1c1917;
}

.smart-inline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding-bottom: 2px;
  cursor: pointer;
  color: #44403c;
  font-size: 0.8rem;
  -webkit-tap-highlight-color: transparent;
  white-space: nowrap;
}

.smart-inline input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #1e3a5f;
  margin-top: 4px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #44403c;
  font-size: 0.875rem;
  -webkit-tap-highlight-color: transparent;
}

.toggle-text { display: flex; align-items: center; gap: 6px; }
.toggle-text i { color: #d97706; font-size: 1rem; }

.trending-section { margin-top: 16px; }

.trending-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: #78716c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  font-weight: 600;
}

.trending-label i { color: #ff4444; font-size: 0.875rem; }

.trending-tags {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-bottom: 4px;
}

.trending-tags::-webkit-scrollbar { display: none; }

.trending-tag {
  flex-shrink: 0;
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.15);
  color: #1e3a5f;
  padding: 8px 16px;
  border-radius: 3px;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 36px;
  display: flex;
  align-items: center;
  -webkit-tap-highlight-color: transparent;
}

.trending-tag:active { background: rgba(30,58,95,0.1); transform: scale(0.95); }

.trending-tag.active {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%);
  color: white;
  border-color: transparent;
}

.tag-count {
  font-weight: 700;
  color: #d97706;
  margin-left: 4px;
  font-size: 0.8125rem;
}

.trending-tag.active .tag-count { color: rgba(255,255,255,0.85); }

@media (min-width: 768px) {
  .search-container { padding: 20px; }
  .search-form { flex-direction: row; align-items: center; }
  .search-button { width: auto; padding: 0 32px; }
  .filter-row { gap: 12px; }
  .trending-tags { flex-wrap: wrap; overflow-x: visible; }
}

@media (min-width: 1024px) {
  .search-container { padding: 24px; }
  .search-input { font-size: 1.125rem; }
  .search-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(30,58,95,0.25);
  }
  .trending-tag:hover {
    background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(30,58,95,0.2);
    border-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-button, .trending-tag { transition: none; }
  .search-button:hover, .search-button:active,
  .trending-tag:hover, .trending-tag:active { transform: none; }
}
</style>
