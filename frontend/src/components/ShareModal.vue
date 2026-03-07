<template>
  <Teleport to="body">
    <div class="sp-overlay" @click.self="$emit('close')">
      <div class="sp-panel" role="dialog" aria-modal="true">

        <!-- Header -->
        <div class="sp-header">
          <span class="sp-heading">
            <i class="bi bi-share-fill"></i>
            {{ uiLanguage === 'ar' ? 'مشاركة المقالة' : 'Share Article' }}
          </span>
          <button class="sp-close" @click="$emit('close')" aria-label="Close">
            <i class="bi bi-x"></i>
          </button>
        </div>

        <!-- Article preview card -->
        <div class="sp-card" :style="{ '--accent': accentColor }">
          <div class="sp-card-bar"></div>
          <div class="sp-card-body">
            <span class="sp-card-source">{{ article.source || 'News' }}</span>
            <p class="sp-card-title">{{ article.title }}</p>
            <div class="sp-card-footer">
              <span class="sp-newzly-badge">Newsly</span>
              <span class="sp-card-date">{{ formattedDate }}</span>
            </div>
          </div>
        </div>

        <!-- Action buttons -->
        <div class="sp-actions">
          <button v-if="canShare" class="sp-btn sp-primary" @click="nativeShare">
            <i class="bi bi-share"></i>
            {{ uiLanguage === 'ar' ? 'مشاركة' : 'Share' }}
          </button>

          <button class="sp-btn" :class="{ 'sp-done': linkCopied }" @click="copyLink">
            <i :class="linkCopied ? 'bi bi-check2' : 'bi bi-link-45deg'"></i>
            {{ linkCopied ? (uiLanguage === 'ar' ? 'تم!' : 'Copied!') : (uiLanguage === 'ar' ? 'نسخ الرابط' : 'Copy Link') }}
          </button>

          <a class="sp-btn sp-x" :href="xUrl" target="_blank" rel="noopener noreferrer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.737-8.834L1.254 2.25H8.08l4.259 5.625 5.905-5.625zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            X / Twitter
          </a>

          <a class="sp-btn sp-wa" :href="waUrl" target="_blank" rel="noopener noreferrer">
            <i class="bi bi-whatsapp"></i>
            WhatsApp
          </a>

          <button class="sp-btn sp-text" :class="{ 'sp-done': textCopied }" @click="copyText">
            <i :class="textCopied ? 'bi bi-check2' : 'bi bi-clipboard'"></i>
            {{ textCopied ? (uiLanguage === 'ar' ? 'تم!' : 'Copied!') : (uiLanguage === 'ar' ? 'نسخ النص' : 'Copy Text') }}
          </button>
        </div>

        <p class="sp-url-preview">{{ truncatedUrl }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { computed, ref } from 'vue'

export default {
  name: 'ShareModal',
  props: {
    article: { type: Object, required: true },
    uiLanguage: { type: String, default: 'en' }
  },
  emits: ['close'],
  setup(props) {
    const linkCopied = ref(false)
    const textCopied = ref(false)

    const canShare = computed(() => !!navigator.share)

    const accentColor = computed(() => {
      const t = (props.article.title || '').toLowerCase()
      if (/war|attack|milit|bomb|strike|kill|conflict/.test(t)) return '#ef4444'
      if (/election|president|minister|government|politic/.test(t)) return '#60a5fa'
      if (/economy|trade|market|stock|oil|dollar|billion/.test(t)) return '#4ade80'
      if (/tech|ai |cyber|digital|software/.test(t)) return '#c084fc'
      if (/health|hospital|disease|vaccine|virus/.test(t)) return '#22d3ee'
      if (/climat|flood|fire|earthquake/.test(t)) return '#34d399'
      return '#3b82f6'
    })

    const formattedDate = computed(() => {
      if (!props.article.publishedAt) return ''
      return new Date(props.article.publishedAt).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    })

    const truncatedUrl = computed(() => {
      const url = props.article.url || ''
      return url.length > 65 ? url.slice(0, 62) + '...' : url
    })

    // Unique Newzly article page URL — shared instead of the raw article URL
    const newzlyUrl = computed(() =>
      `${window.location.origin}/#article=${btoa(encodeURIComponent(props.article.url || ''))}`
    )

    const xUrl = computed(() => {
      const text = encodeURIComponent(`"${props.article.title}" via ${props.article.source || 'Newzly'}`)
      const url = encodeURIComponent(newzlyUrl.value)
      return `https://twitter.com/intent/tweet?text=${text}&url=${url}`
    })

    const waUrl = computed(() => {
      const text = encodeURIComponent(`${props.article.title}\n${newzlyUrl.value}`)
      return `https://wa.me/?text=${text}`
    })

    const nativeShare = async () => {
      try {
        await navigator.share({
          title: props.article.title,
          text: `${props.article.title} — via ${props.article.source || 'Newzly'}`,
          url: newzlyUrl.value
        })
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('Share failed:', e)
      }
    }

    const copyLink = async () => {
      try {
        await navigator.clipboard.writeText(newzlyUrl.value)
        linkCopied.value = true
        setTimeout(() => { linkCopied.value = false }, 2000)
      } catch (e) { console.warn('Copy failed:', e) }
    }

    const copyText = async () => {
      const text = `"${props.article.title}" — ${props.article.source || ''}\n${newzlyUrl.value}`
      try {
        await navigator.clipboard.writeText(text)
        textCopied.value = true
        setTimeout(() => { textCopied.value = false }, 2000)
      } catch (e) { console.warn('Copy failed:', e) }
    }

    return {
      canShare, accentColor, formattedDate,
      truncatedUrl: computed(() => {
        const u = newzlyUrl.value
        return u.length > 65 ? u.slice(0, 62) + '...' : u
      }),
      xUrl, waUrl, linkCopied, textCopied,
      nativeShare, copyLink, copyText
    }
  }
}
</script>

<style scoped>
.sp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(30,58,95,0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
}

@media (min-width: 600px) { .sp-overlay { align-items: center; } }

.sp-panel {
  background: #ffffff;
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 10px 10px 0 0;
  width: 100%;
  max-width: 460px;
  padding: 20px;
  animation: slideUp 0.22s ease;
  box-shadow: 0 -8px 32px rgba(30,58,95,0.12);
}

@media (min-width: 600px) {
  .sp-panel { border-radius: 6px; animation: fadeIn 0.18s ease; box-shadow: 0 16px 48px rgba(30,58,95,0.18); }
}

.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.sp-heading {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1c1917;
  display: flex;
  align-items: center;
  gap: 7px;
}

.sp-heading i { color: #1e3a5f; }

.sp-close {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30,58,95,0.05);
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 3px;
  color: #78716c;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.sp-close:hover { background: rgba(30,58,95,0.09); color: #1c1917; }

.sp-card {
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 14px;
  background: rgba(30,58,95,0.02);
}

.sp-card-bar { height: 3px; background: var(--accent); width: 100%; }

.sp-card-body { padding: 11px 13px; }

.sp-card-source {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--accent);
  border: 1px solid rgba(30,58,95,0.12);
  padding: 1px 6px;
  border-radius: 2px;
  margin-bottom: 7px;
}

.sp-card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1c1917;
  line-height: 1.4;
  margin: 0 0 9px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sp-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sp-newzly-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: #a8a29e;
  letter-spacing: 0.09em;
  text-transform: uppercase;
}

.sp-card-date { font-size: 0.68rem; color: #a8a29e; }

.sp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin-bottom: 11px;
}

.sp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(30,58,95,0.1);
  background: rgba(30,58,95,0.04);
  color: #44403c;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  -webkit-tap-highlight-color: transparent;
  min-height: 38px;
}

.sp-btn:hover { background: rgba(30,58,95,0.08); color: #1c1917; }
.sp-btn:active { transform: scale(0.97); }

.sp-primary {
  grid-column: span 2;
  background: linear-gradient(135deg, #1e3a5f, #2d5f8a);
  border-color: transparent;
  color: white;
}

.sp-primary:hover { filter: brightness(1.08); }

.sp-x { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.1); color: #1c1917; }
.sp-wa { background: rgba(37,211,102,0.06); border-color: rgba(37,211,102,0.2); color: #16a34a; }
.sp-wa:hover { background: rgba(37,211,102,0.1); }
.sp-done { background: rgba(21,128,61,0.07); border-color: rgba(21,128,61,0.2); color: #15803d; }

.sp-url-preview {
  font-size: 0.68rem;
  color: #a8a29e;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  margin: 0;
  text-align: center;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
</style>
