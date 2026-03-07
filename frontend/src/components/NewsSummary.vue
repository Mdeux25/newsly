<template>
  <div class="summary-wrap" v-if="loading || points.length > 0 || rssArticles.length > 0 || rssLoading">

    <!-- AI Summary section (only when active) -->
    <template v-if="loading || points.length">

    <!-- Header -->
    <div class="summary-header">
      <div class="header-left">
        <i class="bi bi-lightning-charge-fill flash-icon"></i>
        <span class="summary-title">
          {{ uiLanguage === 'ar' ? 'ملخص الذكاء الاصطناعي' : 'AI Summary' }}
          <span v-if="trigger" class="trigger-chip">{{ trigger }}</span>
        </span>
      </div>
      <div class="header-right">
        <span v-if="points.length" class="counter">
          {{ activeIndex + 1 }}<span class="counter-sep">/</span>{{ points.length }}
        </span>
        <button class="dismiss-btn" @click="$emit('dismiss')" aria-label="Dismiss">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-row">
      <div class="spinner"></div>
      <span>{{ uiLanguage === 'ar' ? 'جارٍ التحليل…' : 'Analysing articles…' }}</span>
    </div>

    <!-- Card Carousel -->
    <div v-else-if="points.length" class="cards-track" ref="trackRef" @scroll.passive="onScroll">
      <div
        v-for="(pt, i) in points"
        :key="i"
        class="point-card"
        :style="{
          '--cat-color': pt.cat.color,
          '--cat-bg': pt.cat.bg,
          '--cat-border': pt.cat.border
        }"
      >
        <!-- Top row: emoji + index badge -->
        <div class="card-top">
          <span class="cat-emoji">{{ pt.cat.emoji }}</span>
          <span class="card-index" :style="{ background: pt.cat.bg, color: pt.cat.color, borderColor: pt.cat.border }">
            {{ i + 1 }}
          </span>
        </div>

        <!-- Arabic locale: AR primary, EN secondary -->
        <template v-if="uiLanguage === 'ar'">
          <p v-if="pt.ar" class="text-primary" dir="rtl">{{ pt.ar }}</p>
          <div class="card-divider" :style="{ background: pt.cat.border }"></div>
          <p class="text-secondary">{{ pt.en }}</p>
        </template>

        <!-- English locale: EN primary, AR secondary -->
        <template v-else>
          <p class="text-primary">{{ pt.en }}</p>
          <div class="card-divider" :style="{ background: pt.cat.border }"></div>
          <p v-if="pt.ar" class="text-secondary" dir="rtl">{{ pt.ar }}</p>
        </template>
      </div>

      <!-- Right-end spacer so last card can center on scroll -->
      <div class="track-end-spacer"></div>
    </div>

    </template>

    <!-- RSS Ticker Section -->
    <div class="rss-section" :class="{ 'rss-section--divided': loading || points.length }">
      <div class="rss-label">
        <span class="rss-dot"></span>
        <span>{{ uiLanguage === 'ar' ? 'الجزيرة مباشر' : 'Al Jazeera Live' }}</span>
        <span v-if="rssArticles.length" class="rss-counter">
          {{ currentRssIndex + 1 }}<span class="rss-counter-sep">/</span>{{ rssArticles.length }}
        </span>
      </div>

      <div v-if="rssLoading" class="rss-loading">
        <div class="spinner"></div>
      </div>

      <div v-else-if="rssArticles.length" class="rss-ticker-wrap">
        <Transition name="rss-ticker">
          <a
            :key="currentRssIndex"
            class="rss-ticker-card"
            :href="rssArticles[currentRssIndex].url"
            target="_blank"
            rel="noopener noreferrer"
            :dir="uiLanguage === 'ar' ? 'rtl' : 'ltr'"
          >
            <span class="rss-source">{{ rssArticles[currentRssIndex].source }}</span>
            <span class="rss-headline">{{ rssArticles[currentRssIndex].title }}</span>
            <div class="rss-progress" :key="`p-${currentRssIndex}`"></div>
          </a>
        </Transition>
      </div>
    </div>

    <!-- Navigation row: prev arrow + dots + next arrow (AI section only) -->
    <div v-if="points.length > 1" class="nav-row" dir="ltr">
      <button
        class="nav-arrow"
        :disabled="activeIndex === 0"
        @click="scrollToCard(activeIndex - 1)"
        :aria-label="uiLanguage === 'ar' ? 'التالي' : 'Previous'"
      >
        <i class="bi bi-chevron-left"></i>
      </button>

      <div class="dots">
        <button
          v-for="(pt, i) in points"
          :key="i"
          class="dot"
          :class="{ active: i === activeIndex }"
          :style="i === activeIndex ? { background: pt.cat.color } : {}"
          @click="scrollToCard(i)"
          :aria-label="`Point ${i + 1}`"
        ></button>
      </div>

      <button
        class="nav-arrow"
        :disabled="activeIndex >= points.length - 1"
        @click="scrollToCard(activeIndex + 1)"
        :aria-label="uiLanguage === 'ar' ? 'السابق' : 'Next'"
      >
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>

  </div>
</template>

<script>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'

function detectCategory(text = '') {
  const t = text.toLowerCase()
  if (/war|attack|militar|weapon|troops|bomb|missile|kill|struck|strike|conflict|battle|army|navy|drone|invasion|shoot|casualties|ceasefire|hostage/.test(t))
    return { emoji: '⚔️', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.22)' }
  if (/election|vote|president|minister|parliament|government|polic|diplomat|sanction|treaty|summit|bilateral|leader|official|party|talks|negotiat/.test(t))
    return { emoji: '🏛️', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.22)' }
  if (/econom|trade|market|stock|price|inflation|gdp|oil|dollar|billion|million|bank|invest|financ|budget|debt|export|import|currency|tariff/.test(t))
    return { emoji: '📈', color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.22)' }
  if (/technolog|artificial intelligence|ai |cyber|hack|digital|software|tech|data|internet|space|satellite|robot|chip|semiconductor/.test(t))
    return { emoji: '💡', color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.22)' }
  if (/health|medical|hospital|disease|virus|vaccine|drug|treatment|patient|pandemic|outbreak|who|doctor|medicine/.test(t))
    return { emoji: '🏥', color: '#22d3ee', bg: 'rgba(34,211,238,0.08)', border: 'rgba(34,211,238,0.22)' }
  if (/climat|environment|carbon|flood|fire|earthquake|storm|hurricane|energy|renewable|emission|temperature|natural/.test(t))
    return { emoji: '🌍', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)' }
  if (/protest|demonstrat|riot|activist|rights|freedom|opposition|civil|unrest/.test(t))
    return { emoji: '✊', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.22)' }
  if (/crisis|emergency|disaster|evacuat|refugee|humanitarian|aid|relief|famine|flood/.test(t))
    return { emoji: '🚨', color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.22)' }
  return { emoji: '📰', color: '#94a3b8', bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.15)' }
}

export default {
  name: 'NewsSummary',
  props: {
    summary: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    trigger: { type: String, default: '' },
    uiLanguage: { type: String, default: 'en' }
  },
  emits: ['dismiss'],
  setup(props) {
    const trackRef = ref(null)
    const activeIndex = ref(0)
    const rssArticles = ref([])
    const rssLoading = ref(false)
    const currentRssIndex = ref(0)
    let rssTimer = null

    function startTicker() {
      stopTicker()
      if (rssArticles.value.length < 2) return
      rssTimer = setInterval(() => {
        currentRssIndex.value = (currentRssIndex.value + 1) % rssArticles.value.length
      }, 4500)
    }

    function stopTicker() {
      if (rssTimer) { clearInterval(rssTimer); rssTimer = null }
    }

    async function fetchRSS() {
      stopTicker()
      rssLoading.value = true
      currentRssIndex.value = 0
      try {
        const lang = props.uiLanguage === 'ar' ? 'ar' : 'en'
        const res = await fetch(`/api/rss?language=${lang}&limit=15`)
        const data = await res.json()
        if (data.success) rssArticles.value = data.articles || []
      } catch (e) {
        console.warn('RSS fetch failed:', e)
      } finally {
        rssLoading.value = false
        startTicker()
      }
    }

    onMounted(fetchRSS)
    onUnmounted(stopTicker)
    watch(() => props.uiLanguage, fetchRSS)

    const points = computed(() => {
      const en = Array.isArray(props.summary?.en) ? props.summary.en : []
      const ar = Array.isArray(props.summary?.ar) ? props.summary.ar : []
      return en.map((enText, i) => ({
        en: enText,
        ar: ar[i] || '',
        cat: detectCategory(enText)
      }))
    })

    const onScroll = () => {
      if (!trackRef.value) return
      const track = trackRef.value
      const cards = track.querySelectorAll('.point-card')
      if (!cards.length) return
      const trackCenter = track.scrollLeft + track.clientWidth / 2
      let closest = 0
      let closestDist = Infinity
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2
        const dist = Math.abs(cardCenter - trackCenter)
        if (dist < closestDist) { closestDist = dist; closest = i }
      })
      activeIndex.value = closest
    }

    const scrollToCard = (i) => {
      if (!trackRef.value) return
      const clamped = Math.max(0, Math.min(i, points.value.length - 1))
      const cards = trackRef.value.querySelectorAll('.point-card')
      if (cards[clamped]) {
        cards[clamped].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }

    return { points, trackRef, activeIndex, rssArticles, rssLoading, currentRssIndex, onScroll, scrollToCard }
  }
}
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────── */
.summary-wrap {
  background: #ffffff;
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 6px;
  padding: 14px 0 10px;
  margin-bottom: 16px;
  animation: fadeUp 0.3s ease; box-shadow: 0 2px 12px rgba(30,58,95,0.08);
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────── */
.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  margin-bottom: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.flash-icon {
  color: #fbbf24;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.summary-title {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1c1917;
  letter-spacing: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
}

.trigger-chip {
  font-weight: 600;
  color: #1e3a5f;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.75rem;
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.15);
  padding: 2px 7px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.counter {
  font-size: 0.8rem;
  font-weight: 700;
  color: #44403c;
  font-variant-numeric: tabular-nums;
}

.counter-sep {
  color: rgba(30,58,95,0.2);
  margin: 0 1px;
}

.dismiss-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30,58,95,0.04);
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 3px;
  color: #78716c;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: white;
}

/* ── Loading ─────────────────────────────────────── */
.loading-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #78716c;
  font-size: 0.875rem;
  padding: 8px 14px 6px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(30,58,95,0.1);
  border-top-color: #1e3a5f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

/* ── Card Track ──────────────────────────────────── */
.cards-track {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 4px 14px 10px;
  scroll-padding: 0 14px;
}

.cards-track::-webkit-scrollbar { display: none; }

.track-end-spacer {
  flex-shrink: 0;
  width: 1px;
}

/* ── Point Card ──────────────────────────────────── */
.point-card {
  flex-shrink: 0;
  width: clamp(260px, 78vw, 320px);
  scroll-snap-align: center;
  background: var(--cat-bg);
  border: 1px solid var(--cat-border);
  border-radius: 6px;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  position: relative;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}

/* Top-edge accent strip */
.point-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--cat-color), transparent 70%);
}

/* Soft bottom glow */
.point-card::after {
  content: '';
  position: absolute;
  bottom: 0; left: 15%; right: 15%;
  height: 40px;
  background: radial-gradient(ellipse at bottom, var(--cat-color) 0%, transparent 70%);
  opacity: 0.07;
  pointer-events: none;
}

/* ── Card internals ──────────────────────────────── */
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cat-emoji {
  font-size: 1.2rem;
  line-height: 1;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
}

.card-index {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid;
  letter-spacing: 0.04em;
  opacity: 0.8;
}

.text-primary {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1c1917;
  line-height: 1.55;
  margin: 0;
  flex: 1;
}

.card-divider {
  height: 1px;
  opacity: 0.3;
}

.text-secondary {
  font-size: 0.775rem;
  color: #78716c;
  line-height: 1.6;
  margin: 0;
  font-family: 'Segoe UI', 'Arial', Tahoma, sans-serif;
}

/* ── RSS Ticker ───────────────────────────────────── */
.rss-section {
  padding-top: 10px;
  margin-top: 2px;
}

.rss-section--divided {
  border-top: 1px solid rgba(30,58,95,0.08);
}

.rss-label {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px 8px;
  font-size: 0.68rem;
  font-weight: 700;
  color: #a8a29e;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.rss-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f97316;
  box-shadow: 0 0 6px #f97316;
  animation: rssPulse 1.8s ease-in-out infinite;
  flex-shrink: 0;
}

.rss-counter {
  margin-left: auto;
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(30,58,95,0.2);
  font-variant-numeric: tabular-nums;
}

.rss-counter-sep {
  margin: 0 1px;
  opacity: 0.5;
}

.rss-loading {
  display: flex;
  justify-content: center;
  padding: 6px 0 10px;
}

/* Ticker wrapper clips the sliding card */
.rss-ticker-wrap {
  position: relative;
  overflow: hidden;
  padding: 0 14px 12px;
  min-height: 62px;
}

/* The card itself */
.rss-ticker-card {
  display: block;
  position: relative;
  text-decoration: none;
  background: rgba(249, 115, 22, 0.06);
  border: 1px solid rgba(249, 115, 22, 0.15);
  border-radius: 5px;
  padding: 9px 12px 16px;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s;
}

.rss-ticker-card:hover {
  background: rgba(249, 115, 22, 0.11);
  border-color: rgba(249, 115, 22, 0.3);
}

.rss-source {
  display: block;
  font-size: 0.6rem;
  font-weight: 700;
  color: #f97316;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.rss-headline {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 500;
  color: #1c1917;
  line-height: 1.5;
}

/* Progress bar — fills over 4.5s, resets on :key change */
.rss-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  width: 100%;
  background: linear-gradient(90deg, #f97316, #fb923c);
  transform: scaleX(0);
  transform-origin: left center;
  animation: rssProgress 4.5s linear forwards;
  border-radius: 0 2px 0 0;
}

/* Vue transition — slide left out, slide right in */
.rss-ticker-enter-active {
  transition: transform 0.38s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.38s ease;
}
.rss-ticker-leave-active {
  transition: transform 0.28s cubic-bezier(0.4, 0, 1, 1), opacity 0.25s ease;
  position: absolute;
  width: calc(100% - 28px);
}
.rss-ticker-enter-from {
  transform: translateX(40px);
  opacity: 0;
}
.rss-ticker-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.rss-ticker-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.rss-ticker-leave-to {
  transform: translateX(-40px);
  opacity: 0;
}

@keyframes rssPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}

@keyframes rssProgress {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* ── Navigation row ──────────────────────────────── */
.nav-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 2px 14px 4px;
}

.nav-arrow {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30,58,95,0.05);
  border: 1px solid rgba(30,58,95,0.12);
  border-radius: 4px;
  color: #44403c;
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.nav-arrow:hover:not(:disabled) {
  background: rgba(30,58,95,0.08);
  border-color: rgba(30,58,95,0.2);
  color: #1e3a5f;
}

.nav-arrow:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.dots {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 200px;
}

.dot {
  height: 5px;
  border-radius: 2px;
  background: rgba(30,58,95,0.15);
  border: none;
  cursor: pointer;
  transition: width 0.25s ease, background 0.25s ease;
  width: 5px;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.dot.active {
  width: 16px;
}

/* ── Desktop: larger cards ───────────────────────── */
@media (min-width: 768px) {
  .point-card {
    width: clamp(300px, 32vw, 360px);
  }

  .text-primary {
    font-size: 0.925rem;
  }

  .nav-arrow {
    width: 32px;
    height: 32px;
    font-size: 0.875rem;
  }
}

/* ── Animations ──────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
