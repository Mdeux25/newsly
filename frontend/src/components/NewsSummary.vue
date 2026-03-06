<template>
  <div class="summary-card" v-if="loading || summary">
    <div class="summary-header">
      <span class="summary-title">
        <i class="bi bi-newspaper"></i>
        News Brief<span v-if="trigger"> &mdash; {{ trigger }}</span>
      </span>
      <button class="dismiss-btn" @click="$emit('dismiss')" aria-label="Dismiss">
        <i class="bi bi-x"></i>
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="summary-loading">
      <div class="summary-spinner"></div>
      <span>Generating summary&hellip;</span>
    </div>

    <!-- Summary content -->
    <div v-else-if="summary" class="summary-body">
      <div class="summary-lang">
        <span class="lang-badge">EN</span>
        <p class="summary-text">{{ summary.en }}</p>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-lang rtl">
        <span class="lang-badge">AR</span>
        <p class="summary-text" dir="rtl">{{ summary.ar }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'NewsSummary',
  props: {
    summary: { type: Object, default: null },   // { en, ar }
    loading: { type: Boolean, default: false },
    trigger: { type: String, default: '' }
  },
  emits: ['dismiss']
}
</script>

<style scoped>
.summary-card {
  background: rgba(30, 58, 138, 0.25);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 20px;
  animation: slideInUp 0.3s ease;
  backdrop-filter: blur(8px);
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.summary-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #93c5fd;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dismiss-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.dismiss-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}

.summary-loading {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  padding: 8px 0;
}

.summary-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.summary-body {
  display: flex;
  gap: 16px;
}

.summary-lang {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lang-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: #60a5fa;
  letter-spacing: 0.08em;
}

.summary-text {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}

.summary-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.summary-lang.rtl {
  text-align: right;
}

/* Stack vertically on small screens */
@media (max-width: 600px) {
  .summary-body {
    flex-direction: column;
  }

  .summary-divider {
    width: 100%;
    height: 1px;
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
