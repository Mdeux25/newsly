<template>
  <div v-if="adEnabled" class="ad-unit" :class="`ad-unit--${format}`">
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
.ad-unit {
  width: 100%;
  min-height: 90px;
  background: transparent;
  margin: 8px 0;
}

.ad-unit--rectangle {
  min-height: 250px;
}

.ad-unit--horizontal {
  min-height: 90px;
}
</style>
