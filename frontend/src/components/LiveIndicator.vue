<template>
  <div class="live-indicator">
    <span
      v-if="!error"
      class="badge bg-success d-flex align-items-center"
    >
      <span class="pulse-dot me-2"></span>
      <span v-if="isLoading">Updating...</span>
      <span v-else-if="lastUpdate">
        Updated {{ timeAgo }}
      </span>
      <span v-else>Live</span>
    </span>
    <span
      v-else
      class="badge bg-danger d-flex align-items-center"
      :title="error"
    >
      <i class="bi bi-exclamation-circle me-1"></i>
      Error
    </span>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export default {
  name: 'LiveIndicator',
  props: {
    lastUpdate: {
      type: Date,
      default: null
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    }
  },
  setup(props) {
    const now = ref(new Date())
    let interval = null

    const timeAgo = computed(() => {
      if (!props.lastUpdate) return 'never'
      const diffMs = now.value - props.lastUpdate
      const diffSecs = Math.floor(diffMs / 1000)
      const diffMins = Math.floor(diffMs / 60000)

      if (diffSecs < 10) return 'just now'
      if (diffSecs < 60) return `${diffSecs}s ago`
      if (diffMins < 60) return `${diffMins}m ago`
      return 'over an hour ago'
    })

    onMounted(() => {
      // Update time every second
      interval = setInterval(() => {
        now.value = new Date()
      }, 1000)
    })

    onUnmounted(() => {
      if (interval) clearInterval(interval)
    })

    return {
      timeAgo
    }
  }
}
</script>

<style scoped>
/* ============================================
   LIVE INDICATOR - Mobile-First Design
   ============================================ */
.live-indicator {
  display: flex;
  align-items: center;
}

.badge {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  gap: 6px;
}

.bg-success {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(67, 233, 123, 0.3);
}

.bg-danger {
  background: linear-gradient(135deg, #f5756c 0%, #f093fb 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(245, 117, 108, 0.3);
}

.pulse-dot {
  width: 6px;
  height: 6px;
  background-color: white;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

/* ============================================
   ANIMATIONS
   ============================================ */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .pulse-dot {
    animation: none;
  }
}
</style>
