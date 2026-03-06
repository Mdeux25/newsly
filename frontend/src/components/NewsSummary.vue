<template>
  <div class="summary-card" v-if="loading || summary">

    <!-- Header -->
    <div class="summary-header">
      <span class="summary-title">
        <i class="bi bi-lightning-charge-fill"></i>
        {{ uiLanguage === 'ar' ? 'موجز الأخبار' : 'News Briefing' }}<span v-if="trigger"> &mdash; {{ trigger }}</span>
      </span>
      <div class="summary-header-right">
        <span v-if="summary && pointCount" class="point-count">
          {{ pointCount }} {{ uiLanguage === 'ar' ? 'نقطة' : 'points' }}
        </span>
        <button class="dismiss-btn" @click="$emit('dismiss')" aria-label="Dismiss">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="summary-loading">
      <div class="summary-spinner"></div>
      <span>{{ uiLanguage === 'ar' ? 'جارٍ التحليل…' : 'Analysing articles…' }}</span>
    </div>

    <!-- Bullet point columns -->
    <div v-else-if="summary" class="summary-body">

      <!-- English column -->
      <div class="summary-col">
        <div class="col-label">
          <span class="flag">🇬🇧</span>
          <span class="lang-tag">EN</span>
        </div>
        <ul class="bullet-list">
          <li v-for="(point, i) in enPoints" :key="i" class="bullet-item">
            <span class="bullet-dot"></span>
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>

      <div class="col-divider"></div>

      <!-- Arabic column -->
      <div class="summary-col rtl">
        <div class="col-label">
          <span class="flag">🇸🇦</span>
          <span class="lang-tag">AR</span>
        </div>
        <ul class="bullet-list" dir="rtl">
          <li v-for="(point, i) in arPoints" :key="i" class="bullet-item">
            <span class="bullet-dot"></span>
            <span>{{ point }}</span>
          </li>
        </ul>
      </div>

    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'NewsSummary',
  props: {
    summary: { type: Object, default: null },   // { en: string[], ar: string[] }
    loading: { type: Boolean, default: false },
    trigger: { type: String, default: '' },
    uiLanguage: { type: String, default: 'en' }
  },
  emits: ['dismiss'],
  setup(props) {
    const enPoints = computed(() => {
      if (!props.summary?.en) return []
      return Array.isArray(props.summary.en) ? props.summary.en : [props.summary.en]
    })
    const arPoints = computed(() => {
      if (!props.summary?.ar) return []
      return Array.isArray(props.summary.ar) ? props.summary.ar : [props.summary.ar]
    })
    const pointCount = computed(() => enPoints.value.length || 0)
    return { enPoints, arPoints, pointCount }
  }
}
</script>

<style scoped>
.summary-card {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 20px;
  animation: slideInUp 0.3s ease;
  backdrop-filter: blur(10px);
}

/* ── Header ──────────────────────── */
.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.summary-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #60a5fa;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-title i {
  color: #fbbf24;
}

.summary-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.point-count {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 6px;
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
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.13);
  color: white;
}

/* ── Loading ─────────────────────── */
.summary-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.875rem;
  padding: 6px 0;
}

.summary-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.12);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

/* ── Two-column body ─────────────── */
.summary-body {
  display: flex;
  gap: 0;
}

.summary-col {
  flex: 1;
  min-width: 0;
  padding: 0 16px 0 0;
}

.summary-col.rtl {
  padding: 0 0 0 16px;
  text-align: right;
}

.col-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 10px;
}

.rtl .col-label {
  flex-direction: row-reverse;
}

.flag {
  font-size: 1rem;
}

.lang-tag {
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.1em;
}

.col-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
  margin: 0 4px;
}

/* ── Bullet list ─────────────────── */
.bullet-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.bullet-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
}

.rtl .bullet-item {
  flex-direction: row-reverse;
}

.bullet-dot {
  width: 5px;
  height: 5px;
  background: #3b82f6;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

/* ── Mobile: stack vertically ────── */
@media (max-width: 600px) {
  .summary-body {
    flex-direction: column;
    gap: 16px;
  }

  .summary-col,
  .summary-col.rtl {
    padding: 0;
  }

  .col-divider {
    width: 100%;
    height: 1px;
    margin: 0;
  }
}

@keyframes slideInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
