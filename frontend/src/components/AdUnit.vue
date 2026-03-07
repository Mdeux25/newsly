<template>
  <div v-if="adEnabled" class="ad-card" :class="[`ad-card--${format}`, { 'ad-card--banner': banner }]">
    <span class="ad-sponsored-label">Sponsored</span>
    <ins
      class="adsbygoogle"
      style="display:block"
      :data-ad-client="adClient"
      :data-ad-slot="adSlot"
      :data-ad-format="format"
      data-full-width-responsive="true"
    />
  </div>
</template>

<script>
import { onMounted, computed } from 'vue'

export default {
  name: 'AdUnit',
  props: {
    adSlot: {
      type: String,
      required: true
    },
    format: {
      type: String,
      default: 'auto',
      validator: v => ['auto', 'rectangle', 'horizontal'].includes(v)
    },
    fullWidth: {
      type: Boolean,
      default: false
    },
    // banner=true: full-width strip (e.g. below NewsSummary)
    // banner=false (default): card-style, fits in the feed grid/swipe deck
    banner: {
      type: Boolean,
      default: false
    }
  },
  setup() {
    const adEnabled = computed(() => import.meta.env.VITE_AD_ENABLED === 'true')
    const adClient = import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-XXXXXXXXXXXXXXXX'

    onMounted(() => {
      if (!adEnabled.value) return
      try {
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (e) {
        console.warn('AdSense push failed:', e)
      }
    })

    return { adEnabled, adClient }
  }
}
</script>

<style scoped>
/* ── Card style (in-feed, matches NewsCard) ── */
.ad-card {
  position: relative;
  background: rgba(18, 22, 36, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Sponsored label (top-left, mirrors source-badge) ── */
.ad-sponsored-label {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(100, 116, 139, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.55);
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  z-index: 2;
  pointer-events: none;
}

/* ── Banner variant (full-width strip, e.g. below NewsSummary) ── */
.ad-card--banner {
  border-radius: 0;
  border-left: none;
  border-right: none;
  min-height: 90px;
  margin: 8px 0;
  background: transparent;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.ad-card--banner .ad-sponsored-label {
  font-size: 0.6rem;
  top: 4px;
  left: 8px;
}

/* ins fills the card */
.ad-card .adsbygoogle {
  width: 100%;
}
</style>
