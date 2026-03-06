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
      <span class="source-badge">{{ article.source || 'News' }}</span>
      <span v-if="article.country" class="country-badge">{{ countryFlag }} {{ article.country.toUpperCase() }}</span>
    </div>

    <!-- Card Content -->
    <div class="card-content">
      <!-- Title -->
      <h3 class="card-title" :class="{ 'rtl-text': isTranslated }">
        {{ displayTitle }}
      </h3>

      <!-- Description -->
      <p class="card-description" :class="{ 'rtl-text': isTranslated }">
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
      </div>
    </div>
  </article>
</template>

<script>
import { computed, ref } from 'vue'
import axios from 'axios'
import { translations } from '../i18n'

export default {
  name: 'NewsCard',
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
  setup(props) {
    const isTranslating = ref(false)
    const isTranslated = ref(false)
    const imageError = ref(false)
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
      window.open(props.article.url, '_blank', 'noopener,noreferrer')
    }

    const displayTitle = computed(() => {
      return isTranslated.value ? translatedTitle.value : props.article.title
    })

    const displayDescription = computed(() => {
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
      displayDescription
    }
  }
}
</script>

<style scoped>
/* ============================================
   NEWS CARD - Professional Design
   ============================================ */
.news-card {
  background: rgba(18, 22, 36, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  animation: fadeIn 0.4s ease;
}

/* Touch feedback (active state for mobile) */
.news-card:active {
  transform: scale(0.97);
  opacity: 0.9;
}

/* ============================================
   CARD IMAGE - Mobile-Optimized
   ============================================ */
.card-image-wrapper {
  position: relative;
  /* Mobile-optimized aspect ratio (16:9) */
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
  background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.2);
  font-size: 2.5rem;
}

.image-gradient-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60%;
  /* Stronger gradient for mobile readability */
  background: linear-gradient(
    to top,
    rgba(10, 10, 15, 0.95) 0%,
    rgba(10, 10, 15, 0.6) 50%,
    transparent 100%
  );
}

/* Source badge */
.source-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(37, 99, 235, 0.85);
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
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255,255,255,0.85);
  padding: 3px 7px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  z-index: 2;
}

/* ============================================
   CARD CONTENT - Mobile-Optimized
   ============================================ */
.card-content {
  padding: 16px;
}

.card-title {
  font-family: var(--font-heading);
  /* Mobile-optimized title size (readable) */
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.3;
  color: #ffffff;
  margin: 0 0 8px 0;
  /* Line clamp for mobile (max 2 lines) */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-description {
  color: #a0aec0;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 12px 0;
  /* Line clamp for mobile (max 3 lines) */
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ============================================
   CARD META - Mobile-Optimized
   ============================================ */
.card-meta {
  display: flex;
  gap: 12px;
  color: #718096;
  font-size: 0.75rem;
  margin-bottom: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-item i {
  color: #06b6d4;
  font-size: 0.875rem;
}

/* ============================================
   CARD ACTIONS - Mobile-Optimized
   ============================================ */
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
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}

.action-button.secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

/* Pre-computed translation — amber accent */
.action-button.secondary.has-precomputed {
  background: rgba(251, 191, 36, 0.07);
  border-color: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.action-button.secondary:active {
  background: rgba(255, 255, 255, 0.12);
  transform: scale(0.95);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============================================
   RTL TEXT
   ============================================ */
.rtl-text {
  direction: rtl;
  text-align: right;
  font-family: 'Arial', 'Tahoma', sans-serif;
}

/* ============================================
   TABLET ENHANCEMENT (min-width: 768px)
   ============================================ */
@media (min-width: 768px) {
  .card-title {
    font-size: 1.25rem;
    -webkit-line-clamp: 3;
  }

  .card-content {
    padding: 20px;
  }

  .card-meta {
    font-size: 0.8125rem;
  }
}

/* ============================================
   DESKTOP ENHANCEMENT (min-width: 1024px)
   ============================================ */
@media (min-width: 1024px) {
  .news-card {
    backdrop-filter: blur(12px) saturate(180%);
    border-radius: 6px;
  }

  /* Featured (first article) — hero layout */
  .news-card.featured .card-image-wrapper {
    aspect-ratio: 21 / 9;
  }

  .news-card.featured .card-title {
    font-size: 1.5rem;
    -webkit-line-clamp: 3;
  }

  .news-card.featured .card-description {
    -webkit-line-clamp: 4;
    font-size: 0.9375rem;
  }

  /* Desktop hover effects (not mobile) */
  .news-card:hover {
    transform: translateY(-8px) scale(1.02);
    border: 1px solid transparent;
    background: linear-gradient(rgba(26, 26, 46, 0.6), rgba(26, 26, 46, 0.6))
        padding-box,
      linear-gradient(135deg, #2563eb 0%, #06b6d4 100%) border-box;
    box-shadow: 0 20px 40px rgba(37, 99, 235, 0.3),
      0 0 60px rgba(6, 182, 212, 0.2);
  }

  /* Image zoom on desktop hover */
  .news-card:hover .card-image {
    transform: scale(1.1);
  }

  .card-image {
    transition: transform 0.5s ease;
  }

  /* Remove active state on desktop (use hover instead) */
  .news-card:active {
    transform: translateY(-8px) scale(1.02);
    opacity: 1;
  }

  /* Desktop hover effects for buttons */
  .action-button.secondary:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
  }

  .action-button.secondary:active {
    transform: scale(0.95);
  }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .news-card,
  .card-image {
    transition: none;
    animation: none;
  }

  .news-card:hover,
  .news-card:active {
    transform: none;
  }
}

/* ============================================
   ANIMATIONS
   ============================================ */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
