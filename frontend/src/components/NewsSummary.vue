<template>
  <div class="summary-wrap" v-if="loading || points.length > 0">

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

    <!-- Navigation row: prev arrow + dots + next arrow -->
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
import { computed, ref } from 'vue'

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

    return { points, trackRef, activeIndex, onScroll, scrollToCard }
  }
}
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────── */
.summary-wrap {
  background: rgba(10, 14, 28, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 14px 0 10px;
  margin-bottom: 16px;
  animation: fadeUp 0.3s ease;
  backdrop-filter: blur(8px);
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
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
}

.trigger-chip {
  font-weight: 600;
  color: #60a5fa;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.75rem;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
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
  color: rgba(255, 255, 255, 0.7);
  font-variant-numeric: tabular-nums;
}

.counter-sep {
  color: rgba(255, 255, 255, 0.25);
  margin: 0 1px;
}

.dismiss-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.4);
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
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
  padding: 8px 14px 6px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
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
  color: rgba(255, 255, 255, 0.93);
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
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.6;
  margin: 0;
  font-family: 'Segoe UI', 'Arial', Tahoma, sans-serif;
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
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 0.75rem;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
}

.nav-arrow:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.25);
  color: white;
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
  background: rgba(255, 255, 255, 0.18);
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
