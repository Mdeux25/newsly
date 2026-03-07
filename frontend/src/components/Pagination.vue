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
/* ============================================
   PAGINATION CONTAINER - Mobile-First
   ============================================ */
.pagination-container {
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(8px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 20px;
}

.pagination-info {
  text-align: center;
  margin-bottom: 12px;
}

.info-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

/* ============================================
   PAGINATION CONTROLS - Mobile-Optimized
   ============================================ */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Touch-optimized buttons (44px minimum) */
.page-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 3px;
  color: #3b82f6;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.page-button:active:not(.disabled) {
  transform: scale(0.95);
  background: rgba(59, 130, 246, 0.2);
}

.page-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

/* Page Numbers Container */
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  padding: 0 8px;
}

.page-number:active:not(.active) {
  transform: scale(0.95);
  background: rgba(255, 255, 255, 0.1);
}

.page-number.active {
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  border-color: transparent;
  color: white;
  cursor: default;
}

.ellipsis {
  color: var(--text-muted);
  font-size: 0.875rem;
  padding: 0 4px;
}

/* ============================================
   TABLET ENHANCEMENT
   ============================================ */
@media (min-width: 768px) {
  .pagination-container {
    padding: 20px;
  }

  .pagination-controls {
    gap: 10px;
  }

  .page-numbers {
    gap: 6px;
  }

  .info-text {
    font-size: 0.9375rem;
  }
}

/* ============================================
   DESKTOP ENHANCEMENT
   ============================================ */
@media (min-width: 1024px) {
  .pagination-container {
    backdrop-filter: blur(12px) saturate(180%);
    border-radius: 4px;
  }

  /* Desktop hover effects */
  .page-button:hover:not(.disabled) {
    background: rgba(59, 130, 246, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
  }

  .page-button:active:not(.disabled) {
    transform: scale(0.95);
  }

  .page-number:hover:not(.active) {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    border-color: rgba(59, 130, 246, 0.3);
  }

  .page-number:active:not(.active) {
    transform: scale(0.95);
  }
}

/* ============================================
   ACCESSIBILITY - Reduce Motion
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .page-button,
  .page-number {
    transition: none;
  }

  .page-button:hover:not(.disabled),
  .page-button:active:not(.disabled),
  .page-number:hover:not(.active),
  .page-number:active:not(.active) {
    transform: none;
  }
}
</style>
