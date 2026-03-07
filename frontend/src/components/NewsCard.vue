<template>
  <article class="news-card" :class="{ featured: featured }" @click="openArticle">
    <!-- Card Image -->
    <div class="card-image-wrapper">
      <img
        v-if="article.image && !imageError"
        :src="article.image"
        class="card-image"
        :alt="article.title"
        loading="lazy"
        @error="handleImageError"
      />
      <div v-else class="card-image placeholder-image">
        <i class="bi bi-newspaper"></i>
      </div>
      <div class="image-gradient-overlay"></div>

      <!-- Source Badge Overlay -->
      <span class="source-badge" :class="sourceTier ? `tier-${sourceTier}` : ''">
        <i v-if="sourceTier === 'verified'" class="bi bi-patch-check-fill tier-icon"></i>
        {{ article.source || 'News' }}
      </span>
      <span v-if="article.country" class="country-badge">{{ countryFlag }} {{ article.country.toUpperCase() }}</span>
    </div>

    <!-- Share Modal -->
    <ShareModal v-if="showShare" :article="article" :uiLanguage="uiLanguage" @close="showShare = false" />

    <!-- Card Content -->
    <div class="card-content">
      <!-- Title -->
      <h3 class="card-title" :class="{ 'rtl-text': isTranslated || uiLanguage === 'ar' }">
        {{ displayTitle }}
      </h3>

      <!-- Description -->
      <p class="card-description" :class="{ 'rtl-text': isTranslated || uiLanguage === 'ar' }">
        {{ truncateDescription(displayDescription) }}
      </p>

      <!-- Meta Info -->
      <div class="card-meta">
        <span class="meta-item">
          <i class="bi bi-clock"></i>
          {{ formatDate(article.publishedAt) }}
        </span>
        <span v-if="article.country" class="meta-item">
          {{ countryFlag }} {{ article.country.toUpperCase() }}
        </span>
        <span v-if="article.confirmedBy > 2" class="meta-item confirmed-chip">
          <i class="bi bi-check-all"></i>
          {{ article.confirmedBy }} {{ t.news.sources }}
        </span>
      </div>

      <!-- Action Buttons -->
      <div class="card-actions">
        <button
          v-if="!isTranslated && article.language !== 'ar'"
          class="action-button secondary"
          :class="{ 'has-precomputed': article.title_ar }"
          @click.stop="translateArticle"
          :disabled="isTranslating"
        >
          <i :class="article.title_ar ? 'bi bi-lightning-charge-fill' : 'bi bi-translate'"></i>
          {{ isTranslating ? t.news.translating : t.news.translate }}
        </button>
        <button
          v-if="isTranslated"
          class="action-button secondary"
          @click.stop="showOriginal"
        >
          <i class="bi bi-arrow-counterclockwise"></i>
          {{ t.news.original }}
        </button>
        <button class="action-button share-action" @click.stop="showShare = true">
          <i class="bi bi-share"></i>
          {{ t.news.share }}
        </button>
        <a
          v-if="article.language !== 'ar'"
          class="action-button fact-action"
          :href="`https://toolbox.google.com/factcheck/explorer/search/${encodeURIComponent(article.title)}`"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          <i class="bi bi-shield-check"></i>
          {{ t.news.factCheck }}
        </a>
      </div>
    </div>
  </article>
</template>

<script>
import { computed, ref } from 'vue'
import axios from 'axios'
import { translations } from '../i18n'
import sourceReputation from '../data/sourceReputation.json'
import ShareModal from './ShareModal.vue'

export default {
  name: 'NewsCard',
  components: { ShareModal },
  emits: ['open-detail'],
  props: {
    article: {
      type: Object,
      required: true
    },
    uiLanguage: {
      type: String,
      default: 'en'
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  setup(props, { emit }) {
    const isTranslating = ref(false)
    const isTranslated = ref(false)
    const imageError = ref(false)
    const showShare = ref(false)

    // Normalize source name for fuzzy matching (DB stores e.g. "theguardiantheguardian")
    const _norm = (s) => (s || '').toLowerCase().replace(/[^a-z]/g, '')
    const _repEntries = Object.entries(sourceReputation).map(([k, v]) => [_norm(k), v])
    const sourceTier = computed(() => {
      const norm = _norm(props.article.source)
      if (!norm) return null
      const direct = _repEntries.find(([k]) => k === norm)
      if (direct) return direct[1]
      // substring: "theguardiantheguardian" matches "theguardian"
      const sub = _repEntries.find(([k]) => k.length > 4 && (norm.includes(k) || k.includes(norm)))
      return sub ? sub[1] : null
    })
    const translatedTitle = ref('')
    const translatedDescription = ref('')
    const originalTitle = ref(props.article.title)
    const originalDescription = ref(props.article.description)
    const t = computed(() => translations[props.uiLanguage] || translations.en)
    // Convert country code to flag emoji (e.g. 'fr' → '🇫🇷')
    const countryFlag = computed(() => {
      const code = props.article.country
      if (!code || code.length !== 2) return ''
      return Array.from(code.toUpperCase())
        .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
        .join('')
    })

    const truncateDescription = (text) => {
      if (!text) return t.value.news.noDescription
      return text.length > 150 ? text.substring(0, 150) + '...' : text
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)
      const tr = t.value

      if (diffMins < 1) return tr.time.justNow
      if (diffMins < 60) return `${diffMins}${tr.time.minutesAgo}`
      if (diffHours < 24) return `${diffHours}${tr.time.hoursAgo}`
      if (diffDays < 7) return `${diffDays}${tr.time.daysAgo}`
      return date.toLocaleDateString(props.uiLanguage === 'ar' ? 'ar-EG' : 'en-GB')
    }

    const handleImageError = () => {
      imageError.value = true
    }

    const translateArticle = async () => {
      // Use pre-computed DB translation if available (instant, no API call)
      if (props.article.title_ar) {
        translatedTitle.value = props.article.title_ar
        translatedDescription.value = props.article.description_ar || ''
        isTranslated.value = true
        return
      }

      isTranslating.value = true
      try {
        const response = await axios.post('/api/translate', {
          article: props.article
        })

        if (response.data.success) {
          translatedTitle.value = response.data.article.title
          translatedDescription.value = response.data.article.description
          isTranslated.value = true
        }
      } catch (error) {
        console.error('Translation error:', error)
      } finally {
        isTranslating.value = false
      }
    }

    const showOriginal = () => {
      isTranslated.value = false
    }

    const openArticle = () => {
      emit('open-detail', props.article)
    }

    const displayTitle = computed(() => {
      if (props.uiLanguage === 'ar' && props.article.title_ar) return props.article.title_ar
      return isTranslated.value ? translatedTitle.value : props.article.title
    })

    const displayDescription = computed(() => {
      if (props.uiLanguage === 'ar' && props.article.description_ar) return props.article.description_ar
      return isTranslated.value ? translatedDescription.value : props.article.description
    })

    return {
      t,
      countryFlag,
      truncateDescription,
      formatDate,
      handleImageError,
      imageError,
      isTranslating,
      isTranslated,
      translateArticle,
      showOriginal,
      openArticle,
      displayTitle,
      displayDescription,
      showShare,
      sourceTier
    }
  }
}
</script>

<style scoped>
/* ============================================
   NEWS CARD - Lapis Night Light Theme
   ============================================ */
.news-card {
  background: #ffffff;
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 6px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  animation: fadeIn 0.4s ease;
  box-shadow: 0 2px 8px rgba(30,58,95,0.06);
}

.news-card:active {
  transform: scale(0.97);
  opacity: 0.9;
}

.card-image-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #e8e0d0 0%, #f5f3ee 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(30,58,95,0.18);
  font-size: 2.5rem;
}

.image-gradient-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    to top,
    rgba(255,255,255,0.6) 0%,
    transparent 100%
  );
}

/* Source badge */
.source-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(30,58,95,0.85);
  color: white;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 700;
  z-index: 2;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* Country badge */
.country-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(255,255,255,0.88);
  border: 1px solid rgba(30,58,95,0.12);
  color: #44403c;
  padding: 3px 7px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 2;
}

/* Card Content */
.card-content {
  padding: 16px;
}

.card-title {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
  color: #1c1917;
  margin: 0 0 8px 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-description {
  color: #57534e;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Card Meta */
.card-meta {
  display: flex;
  gap: 12px;
  color: #78716c;
  font-size: 0.75rem;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item i {
  color: #d97706;
  font-size: 0.875rem;
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  border: none;
  -webkit-tap-highlight-color: transparent;
  min-height: 32px;
}

.action-button.secondary {
  background: rgba(30,58,95,0.05);
  border: 1px solid rgba(30,58,95,0.12);
  color: #44403c;
}

.action-button.secondary:hover {
  background: rgba(30,58,95,0.09);
  color: #1c1917;
}

/* Source tier badges */
.source-badge.tier-verified {
  background: rgba(180,83,9,0.85);
  border: none;
  color: #fff;
}

.source-badge.tier-trusted {
  background: rgba(30,58,95,0.8);
  border: none;
  color: #fff;
}

.tier-icon {
  font-size: 0.6rem;
  vertical-align: middle;
  margin-right: 2px;
}

/* Confirmed-by chip */
.confirmed-chip {
  color: #15803d;
  background: rgba(21,128,61,0.07);
  border: 1px solid rgba(21,128,61,0.18);
  border-radius: 3px;
  padding: 1px 6px;
  font-weight: 600;
}

.confirmed-chip i {
  color: #15803d !important;
}

/* Share button */
.action-button.share-action {
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.15);
  color: #1e3a5f;
}

/* Fact-check button */
.action-button.fact-action {
  background: rgba(120,113,108,0.06);
  border: 1px solid rgba(120,113,108,0.14);
  color: #78716c;
  text-decoration: none;
}

.action-button.fact-action:hover {
  background: rgba(120,113,108,0.1);
  color: #44403c;
}

/* Pre-computed translation — saffron accent */
.action-button.secondary.has-precomputed {
  background: rgba(217,119,6,0.06);
  border-color: rgba(217,119,6,0.2);
  color: #d97706;
}

.action-button.secondary:active {
  background: rgba(30,58,95,0.1);
  transform: scale(0.95);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* RTL Text */
.rtl-text {
  direction: rtl;
  text-align: right;
  font-family: 'Arial', 'Tahoma', sans-serif;
}

/* Tablet */
@media (min-width: 768px) {
  .card-title {
    font-size: 1.25rem;
    -webkit-line-clamp: 3;
  }
  .card-content { padding: 20px; }
  .card-meta { font-size: 0.8125rem; }
}

/* Desktop */
@media (min-width: 1024px) {
  .news-card {
    border-radius: 6px;
  }

  .news-card.featured .card-image-wrapper { aspect-ratio: 21 / 9; }
  .news-card.featured .card-title {
    font-size: 1.5rem;
    -webkit-line-clamp: 3;
  }
  .news-card.featured .card-description {
    -webkit-line-clamp: 4;
    font-size: 0.9375rem;
  }

  .news-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 16px 40px rgba(30,58,95,0.14),
                0 4px 12px rgba(30,58,95,0.08);
    border-color: rgba(30,58,95,0.2);
  }

  .news-card:hover .card-image { transform: scale(1.05); }
  .card-image { transition: transform 0.5s ease; }

  .news-card:active {
    transform: translateY(-6px);
    opacity: 1;
  }

  .action-button.secondary:hover {
    background: rgba(30,58,95,0.09);
    transform: translateY(-1px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .news-card, .card-image { transition: none; animation: none; }
  .news-card:hover, .news-card:active { transform: none; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
