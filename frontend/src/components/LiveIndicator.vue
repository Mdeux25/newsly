<template>
  <div class="live-indicator">
    <span v-if="!error" class="live-chip">
      <span class="pulse-dot" :class="{ loading: isLoading }"></span>
      <span v-if="isLoading">{{ tr.status.updating }}</span>
      <span v-else-if="lastUpdate">{{ tr.status.updated }} {{ timeAgo }}</span>
      <span v-else>{{ tr.status.live }}</span>
    </span>
    <span v-else class="live-chip live-chip--error" :title="error">
      <i class="bi bi-exclamation-circle"></i>
      {{ tr.status.error }}
    </span>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { translations } from '../i18n'

export default {
  name: 'LiveIndicator',
  props: {
    lastUpdate: { type: Date, default: null },
    isLoading: { type: Boolean, default: false },
    error: { type: String, default: null },
    uiLanguage: { type: String, default: 'en' }
  },
  setup(props) {
    const now = ref(new Date())
    let interval = null

    const tr = computed(() => translations[props.uiLanguage] || translations.en)

    const timeAgo = computed(() => {
      if (!props.lastUpdate) return ''
      const t = tr.value
      const diffMs = now.value - props.lastUpdate
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffMs / 60000)

      if (diffSecs < 10) return t.time.justNow
      if (diffSecs < 60) return `${diffSecs}${t.time.secondsAgo}`
      if (diffMins < 60) return `${diffMins}${t.time.minutesAgo}`
      return t.status.overAnHour
    })

    onMounted(() => { interval = setInterval(() => { now.value = new Date() }, 5000) })
    onUnmounted(() => { if (interval) clearInterval(interval) })

    return { tr, timeAgo }
  }
}
</script>

<style scoped>
.live-indicator {
  display: flex;
  align-items: center;
}

.live-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 10px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.15);
  color: rgba(30,58,95,0.6);
  white-space: nowrap;
}

.live-chip--error {
  border-color: rgba(220,38,38,0.2);
  color: #dc2626;
  background: rgba(220,38,38,0.04);
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background: #16a34a;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

.pulse-dot.loading {
  background: #d97706;
  animation: pulse 0.8s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(1.4); }
}

@media (prefers-reduced-motion: reduce) {
  .pulse-dot { animation: none; }
}
</style>
