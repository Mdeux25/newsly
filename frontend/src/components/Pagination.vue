<template>
  <div class="pagination-container" v-if="totalItems > 0">
    <div class="pagination-info">
      <span class="info-text">
        {{ tr.news.showing }} {{ startItem }}-{{ endItem }} {{ tr.news.of }} {{ totalItems }} {{ tr.news.articles }}
      </span>
    </div>

    <div class="pagination-controls" v-if="totalPages > 1">
      <!-- Previous Button -->
      <button
        class="page-button"
        :class="{ disabled: currentPage === 1 }"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
        aria-label="Previous page"
      >
        <i :class="uiLanguage === 'ar' ? 'bi bi-chevron-right' : 'bi bi-chevron-left'"></i>
      </button>

      <!-- Page Numbers (mobile-optimized: show limited pages) -->
      <div class="page-numbers">
        <!-- First page -->
        <button
          v-if="currentPage > 2"
          class="page-number"
          @click="goToPage(1)"
        >
          1
        </button>

        <!-- Ellipsis -->
        <span v-if="currentPage > 3" class="ellipsis">...</span>

        <!-- Previous page (on mobile only if space) -->
        <button
          v-if="currentPage > 1 && showPreviousPage"
          class="page-number"
          @click="goToPage(currentPage - 1)"
        >
          {{ currentPage - 1 }}
        </button>

        <!-- Current page -->
        <button class="page-number active">
          {{ currentPage }}
        </button>

        <!-- Next page (on mobile only if space) -->
        <button
          v-if="currentPage < totalPages && showNextPage"
          class="page-number"
          @click="goToPage(currentPage + 1)"
        >
          {{ currentPage + 1 }}
        </button>

        <!-- Ellipsis -->
        <span v-if="currentPage < totalPages - 2" class="ellipsis">...</span>

        <!-- Last page -->
        <button
          v-if="currentPage < totalPages - 1"
          class="page-number"
          @click="goToPage(totalPages)"
        >
          {{ totalPages }}
        </button>
      </div>

      <!-- Next Button -->
      <button
        class="page-button"
        :class="{ disabled: currentPage === totalPages }"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
        aria-label="Next page"
      >
        <i :class="uiLanguage === 'ar' ? 'bi bi-chevron-left' : 'bi bi-chevron-right'"></i>
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { translations } from '../i18n'

export default {
  name: 'Pagination',
  props: {
    currentPage: {
      type: Number,
      required: true,
      default: 1
    },
    itemsPerPage: {
      type: Number,
      required: true,
      default: 20
    },
    totalItems: {
      type: Number,
      required: true,
      default: 0
    },
    uiLanguage: {
      type: String,
      default: 'en'
    }
  },
  emits: ['page-change'],
  setup(props, { emit }) {
    const tr = computed(() => translations[props.uiLanguage] || translations.en)
    const totalPages = computed(() => {
      return Math.ceil(props.totalItems / props.itemsPerPage)
    })

    const startItem = computed(() => {
      return (props.currentPage - 1) * props.itemsPerPage + 1
    })

    const endItem = computed(() => {
      const end = props.currentPage * props.itemsPerPage
      return Math.min(end, props.totalItems)
    })

    // Mobile: show previous page button if we're not near the start
    const showPreviousPage = computed(() => {
      return props.currentPage > 2
    })

    // Mobile: show next page button if we're not near the end
    const showNextPage = computed(() => {
      return props.currentPage < totalPages.value - 1
    })

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        emit('page-change', page)
      }
    }

    return {
      tr,
      totalPages,
      startItem,
      endItem,
      showPreviousPage,
      showNextPage,
      goToPage
    }
  }
}
</script>

<style scoped>
.pagination-container {
  background: #ffffff;
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(30,58,95,0.06);
}

.pagination-info {
  text-align: center;
  margin-bottom: 12px;
}

.info-text {
  color: #44403c;
  font-size: 0.875rem;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.page-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30,58,95,0.06);
  border: 1px solid rgba(30,58,95,0.15);
  border-radius: 3px;
  color: #1e3a5f;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.page-button:active:not(.disabled) {
  transform: scale(0.95);
  background: rgba(30,58,95,0.1);
}

.page-button.disabled {
  opacity: 0.35;
  cursor: not-allowed;
  color: #a8a29e;
  background: rgba(30,58,95,0.03);
  border-color: rgba(30,58,95,0.08);
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-number {
  min-width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30,58,95,0.04);
  border: 1px solid rgba(30,58,95,0.1);
  border-radius: 3px;
  color: #1c1917;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  padding: 0 8px;
}

.page-number:active:not(.active) {
  transform: scale(0.95);
  background: rgba(30,58,95,0.08);
}

.page-number.active {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%);
  border-color: transparent;
  color: white;
  cursor: default;
}

.ellipsis {
  color: #a8a29e;
  font-size: 0.875rem;
  padding: 0 4px;
}

@media (min-width: 768px) {
  .pagination-container { padding: 20px; }
  .pagination-controls { gap: 10px; }
  .page-numbers { gap: 6px; }
  .info-text { font-size: 0.9375rem; }
}

@media (min-width: 1024px) {
  .page-button:hover:not(.disabled) {
    background: rgba(30,58,95,0.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(30,58,95,0.15);
  }
  .page-number:hover:not(.active) {
    background: rgba(30,58,95,0.08);
    transform: translateY(-1px);
    border-color: rgba(30,58,95,0.2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-button, .page-number { transition: none; }
  .page-button:hover:not(.disabled), .page-number:hover:not(.active) { transform: none; }
}
</style>
