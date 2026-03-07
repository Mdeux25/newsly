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
.ad-card {
  position: relative;
  background: #ffffff;
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 6px;
  overflow: hidden;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(30,58,95,0.05);
}

.ad-sponsored-label {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.12);
  color: #a8a29e;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  z-index: 2;
  pointer-events: none;
}

.ad-card--banner {
  border-radius: 0;
  border-left: none;
  border-right: none;
  min-height: 90px;
  margin: 8px 0;
  background: rgba(30,58,95,0.02);
  border-top: 1px solid rgba(30,58,95,0.07);
  border-bottom: 1px solid rgba(30,58,95,0.07);
  box-shadow: none;
}

.ad-card--banner .ad-sponsored-label {
  font-size: 0.6rem;
  top: 4px;
  left: 8px;
}

.ad-card .adsbygoogle { width: 100%; }

@media (max-width: 640px) {
  .ad-card {
    min-height: 90px;
  }
}
</style>
