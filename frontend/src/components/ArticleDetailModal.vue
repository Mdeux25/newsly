<template>
  <Teleport to="body">
    <div class="adm-overlay" @click.self="$emit('close')">
      <div class="adm-panel" role="dialog" aria-modal="true">

        <!-- Loading -->
        <div v-if="loading" class="adm-loading">
          <div class="adm-spinner"></div>
          <span>{{ uiLanguage === 'ar' ? 'جاري التحميل…' : 'Loading article…' }}</span>
        </div>

        <!-- Error -->
        <div v-else-if="fetchError" class="adm-error">
          <i class="bi bi-exclamation-circle"></i>
          <p>{{ fetchError }}</p>
          <button class="adm-btn" @click="$emit('close')">
            {{ uiLanguage === 'ar' ? 'إغلاق' : 'Close' }}
          </button>
        </div>

        <!-- Article content -->
        <template v-else-if="article">
          <!-- Top bar -->
          <div class="adm-topbar">
            <span class="adm-source-tag">{{ article.source }}</span>
            <button class="adm-close" @click="$emit('close')" aria-label="Close">
              <i class="bi bi-x"></i>
            </button>
          </div>

          <!-- Hero image -->
          <div v-if="article.image && !imgError" class="adm-image-wrap">
            <img
              :src="article.image"
              :alt="article.title"
              class="adm-image"
              @error="imgError = true"
            />
            <div class="adm-image-fade"></div>
          </div>

          <!-- Body -->
          <div class="adm-body" :dir="isAr ? 'rtl' : 'ltr'">
            <!-- Meta row -->
            <div class="adm-meta">
              <span class="adm-date">
                <i class="bi bi-clock"></i>
                {{ formattedDate }}
              </span>
              <span v-if="article.country" class="adm-country">{{ countryFlag }} {{ article.country.toUpperCase() }}</span>
            </div>

            <!-- Title — primary language -->
            <h1 class="adm-title">{{ primaryTitle }}</h1>

            <!-- Description -->
            <p class="adm-desc">{{ primaryDesc }}</p>

            <!-- Secondary language block (translation) -->
            <div v-if="secondaryTitle" class="adm-translation">
              <div class="adm-trans-divider">
                <span>{{ uiLanguage === 'ar' ? 'English' : 'العربية' }}</span>
              </div>
              <p class="adm-trans-title" :dir="isAr ? 'ltr' : 'rtl'">{{ secondaryTitle }}</p>
              <p v-if="secondaryDesc" class="adm-trans-desc" :dir="isAr ? 'ltr' : 'rtl'">{{ secondaryDesc }}</p>
            </div>
          </div>

          <!-- Action bar -->
          <div class="adm-actions">
            <a
              :href="article.url"
              target="_blank"
              rel="noopener noreferrer"
              class="adm-btn adm-primary"
            >
              <i class="bi bi-box-arrow-up-right"></i>
              {{ uiLanguage === 'ar' ? 'قراءة المقالة الأصلية' : 'Read Original Article' }}
            </a>
            <button class="adm-btn adm-copy" :class="{ done: copied }" @click="copyShareLink">
              <i :class="copied ? 'bi bi-check2' : 'bi bi-share'"></i>
              {{ copied ? (uiLanguage === 'ar' ? 'تم النسخ!' : 'Copied!') : (uiLanguage === 'ar' ? 'مشاركة' : 'Share') }}
            </button>
          </div>
        </template>

      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, computed, onMounted } from 'vue'

export default {
  name: 'ArticleDetailModal',
  props: {
    articleUrl: { type: String, default: null },
    articleSlug: { type: String, default: null },
    article: { type: Object, default: null },
    uiLanguage: { type: String, default: 'en' }
  },
  emits: ['close'],
  setup(props) {
    const article = ref(null)
    const loading = ref(true)
    const fetchError = ref(null)
    const imgError = ref(false)
    const copied = ref(false)

    const isAr = computed(() => props.uiLanguage === 'ar')

    const primaryTitle = computed(() => {
      if (!article.value) return ''
      return isAr.value ? (article.value.title_ar || article.value.title) : article.value.title
    })

    const primaryDesc = computed(() => {
      if (!article.value) return ''
      return isAr.value ? (article.value.description_ar || article.value.description) : article.value.description
    })

    const secondaryTitle = computed(() => {
      if (!article.value) return ''
      return isAr.value ? article.value.title : (article.value.title_ar || '')
    })

    const secondaryDesc = computed(() => {
      if (!article.value) return ''
      return isAr.value ? article.value.description : (article.value.description_ar || '')
    })

    const countryFlag = computed(() => {
      const code = article.value?.country
      if (!code || code.length !== 2) return ''
      return Array.from(code.toUpperCase())
        .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
        .join('')
    })

    const formattedDate = computed(() => {
      if (!article.value?.publishedAt) return ''
      return new Date(article.value.publishedAt).toLocaleDateString(
        props.uiLanguage === 'ar' ? 'ar-EG' : 'en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' }
      )
    })

    const generateSlug = (title) => {
      const stop = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','this','that','they','have','has','had','will','would','could','should','not','its','his','her'])
      return (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stop.has(w))
        .slice(0, 4)
        .join('-')
    }

    const newslyShareUrl = computed(() => {
      if (!article.value?.url) return window.location.href
      const slug = generateSlug(article.value.title)
      if (slug) return `${window.location.origin}/#article=${slug}`
      return `${window.location.origin}/#article=${btoa(encodeURIComponent(article.value.url))}`
    })

    const copyShareLink = async () => {
      try {
        await navigator.clipboard.writeText(newslyShareUrl.value)
        copied.value = true
        setTimeout(() => { copied.value = false }, 2000)
      } catch (e) { console.warn('Copy failed', e) }
    }

    onMounted(async () => {
      // If full article object passed directly (feed tap), use it immediately
      if (props.article) {
        article.value = props.article
        loading.value = false
        return
      }
      // Otherwise fetch by URL or slug (shared link)
      if (!props.articleUrl && !props.articleSlug) {
        fetchError.value = 'No article specified'
        loading.value = false
        return
      }
      try {
        const endpoint = props.articleSlug
          ? `/api/article?slug=${encodeURIComponent(props.articleSlug)}`
          : `/api/article?url=${encodeURIComponent(props.articleUrl)}`
        const res = await fetch(endpoint)
        const data = await res.json()
        if (data.success) {
          article.value = data.article
        } else {
          fetchError.value = data.error || 'Article not found'
        }
      } catch (e) {
        fetchError.value = 'Failed to load article'
      } finally {
        loading.value = false
      }
    })

    return {
      article, loading, fetchError, imgError, copied,
      isAr, primaryTitle, primaryDesc, secondaryTitle, secondaryDesc,
      countryFlag, formattedDate, copyShareLink
    }
  }
}
</script>

<style scoped>
/* ── Overlay ──────────────────────────────────── */
.adm-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

/* ── Panel ───────────────────────────────────── */
.adm-panel {
  background: #0f1623;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow-y: auto;
  animation: slideUp 0.25s ease;
  display: flex;
  flex-direction: column;
}

@media (min-width: 600px) {
  .adm-overlay {
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
  }
  .adm-panel {
    max-width: 680px;
    height: auto;
    max-height: 90vh;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: fadeIn 0.2s ease;
  }
}

/* ── Loading / Error ─────────────────────────── */
.adm-loading, .adm-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.adm-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.adm-error i { font-size: 2rem; color: #ef4444; }
.adm-error p { text-align: center; margin: 0; }

/* ── Top bar ─────────────────────────────────── */
.adm-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  flex-shrink: 0;
}

.adm-source-tag {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
}

.adm-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.adm-close:hover { background: rgba(255, 255, 255, 0.14); color: white; }

/* ── Hero image ──────────────────────────────── */
.adm-image-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 7;
  overflow: hidden;
  flex-shrink: 0;
}

.adm-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.adm-image-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(to top, #0f1623 0%, transparent 100%);
}

/* ── Body ───────────────────────────────────── */
.adm-body { padding: 16px 18px 12px; }

.adm-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.adm-date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.adm-date i { color: #06b6d4; }
.adm-country { font-size: 0.75rem; color: rgba(255, 255, 255, 0.4); }

.adm-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.35;
  margin: 0 0 12px;
}

.adm-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.6;
  margin: 0;
}

/* ── Translation block ───────────────────────── */
.adm-translation { margin-top: 16px; }

.adm-trans-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.adm-trans-divider::before,
.adm-trans-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.adm-trans-divider span {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.25);
  white-space: nowrap;
}

.adm-trans-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.4;
  margin: 0 0 6px;
}

.adm-trans-desc {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1.55;
  margin: 0;
}

/* ── Actions ─────────────────────────────────── */
.adm-actions {
  display: flex;
  gap: 8px;
  padding: 12px 18px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.adm-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 0.825rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
  min-height: 40px;
}

.adm-btn:hover { background: rgba(255, 255, 255, 0.1); color: white; }

.adm-primary {
  flex: 1;
  background: linear-gradient(135deg, #1d4ed8, #0891b2);
  border-color: transparent;
  color: white;
}

.adm-primary:hover { filter: brightness(1.1); }

.adm-copy { flex-shrink: 0; }
.adm-copy.done { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.3); color: #4ade80; }

/* ── Animations ──────────────────────────────── */
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
