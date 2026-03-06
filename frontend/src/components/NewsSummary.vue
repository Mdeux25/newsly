<template>
  <div class="summary-wrap" v-if="loading || points.length > 0">

    <!-- Header -->
    <div class="summary-header">
      <div class="header-left">
        <i class="bi bi-lightning-charge-fill flash-icon"></i>
        <span class="summary-title">
          {{ uiLanguage === 'ar' ? 'موجز الأخبار' : 'News Brief' }}
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

        <!-- EN text -->
        <p class="text-en">{{ pt.en }}</p>

        <!-- Divider -->
        <div class="card-divider" :style="{ background: pt.cat.border }"></div>

        <!-- AR text -->
        <p v-if="pt.ar" class="text-ar" dir="rtl">{{ pt.ar }}</p>
      </div>

      <!-- Right-end spacer so last card can center on scroll -->
      <div class="track-end-spacer"></div>
    </div>

    <!-- Progress dots -->
    <div v-if="points.length > 1" class="dots-row">
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
      const cards = trackRef.value.querySelectorAll('.point-card')
      if (cards[i]) {
        cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }

    return { points, trackRef, activeIndex, onScroll, scrollToCard }
  }
}
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────── */
.summary-wrap {
  background: rgba(10, 14, 28, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 14px 0 12px;
  margin-bottom: 20px;
  animation: fadeUp 0.35s ease;
  backdrop-filter: blur(10px);
  overflow: hidden;
}

/* ── Header ──────────────────────────────────────── */
.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
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
  font-size: 0.9rem;
  flex-shrink: 0;
}

.summary-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
}

.trigger-chip {
  font-weight: 600;
  color: #60a5fa;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.78rem;
  background: rgba(96, 165, 250, 0.1);
  border: 1px solid rgba(96, 165, 250, 0.2);
  padding: 2px 8px;
  border-radius: 20px;
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
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
}

.counter-sep {
  color: rgba(255, 255, 255, 0.3);
  margin: 0 1px;
}

.dismiss-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s, color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.13);
  color: white;
}

/* ── Loading ─────────────────────────────────────── */
.loading-row {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
  padding: 8px 16px 6px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

/* ── Card Track ──────────────────────────────────── */
.cards-track {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  /* Side padding creates the "peek" effect: adjacent cards visible */
  padding: 4px 20px 8px;
  scroll-padding: 0 20px;
}

.cards-track::-webkit-scrollbar {
  display: none;
}

/* Invisible spacer so last card can fully center on snap */
.track-end-spacer {
  flex-shrink: 0;
  width: 1px;
}

/* ── Point Card ──────────────────────────────────── */
.point-card {
  flex-shrink: 0;
  /* ~2 cards visible on mobile, more on desktop */
  width: clamp(220px, 72vw, 280px);
  scroll-snap-align: center;
  background: var(--cat-bg);
  border: 1px solid var(--cat-border);
  border-radius: 14px;
  padding: 14px 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  /* Top accent bar */
  overflow: hidden;
  transition: transform 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

/* Colored top-edge accent strip */
.point-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--cat-color), transparent 70%);
}

/* Soft bottom glow */
.point-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 40px;
  background: radial-gradient(ellipse at bottom, var(--cat-color) 0%, transparent 70%);
  opacity: 0.08;
  pointer-events: none;
}

/* ── Card internals ──────────────────────────────── */
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cat-emoji {
  font-size: 1.25rem;
  line-height: 1;
  /* Subtle shadow to make emoji pop on dark bg */
  filter: drop-shadow(0 1px 4px rgba(0,0,0,0.5));
}

.card-index {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  border: 1px solid;
  letter-spacing: 0.04em;
  opacity: 0.85;
}

.text-en {
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.55;
  margin: 0;
  flex: 1;
}

.card-divider {
  height: 1px;
  opacity: 0.35;
  border-radius: 1px;
}

.text-ar {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin: 0;
  text-align: right;
  font-family: 'Segoe UI', 'Arial', Tahoma, sans-serif;
}

/* ── Dots ────────────────────────────────────────── */
.dots-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 4px 16px 2px;
}

.dot {
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.18);
  border: none;
  cursor: pointer;
  transition: width 0.3s ease, background 0.3s ease;
  width: 5px;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.dot.active {
  width: 18px;
}

/* ── Desktop: slightly larger cards ──────────────── */
@media (min-width: 768px) {
  .point-card {
    width: clamp(260px, 35vw, 300px);
  }

  .text-en {
    font-size: 0.9rem;
  }
}

/* ── Animations ──────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
