<template>
  <article class="tweet-card" @click="openTweet">
    <div class="tweet-header">
      <img
        v-if="tweet.author.profile_image"
        :src="tweet.author.profile_image"
        class="profile-image"
        :alt="tweet.author.name"
      />
      <div class="author-info">
        <div class="author-name">
          <strong>{{ tweet.author.name }}</strong>
          <i v-if="tweet.author.verified" class="bi bi-patch-check-fill verified-badge"></i>
        </div>
        <span class="username">@{{ tweet.author.username }}</span>
      </div>
      <span class="tweet-badge">
        <i class="bi bi-twitter"></i>
      </span>
    </div>

    <p class="tweet-text">{{ tweet.text }}</p>

    <div class="tweet-metrics">
      <span class="metric-item">
        <i class="bi bi-heart"></i>
        {{ formatNumber(tweet.metrics?.like_count || 0) }}
      </span>
      <span class="metric-item">
        <i class="bi bi-arrow-repeat"></i>
        {{ formatNumber(tweet.metrics?.retweet_count || 0) }}
      </span>
      <span class="metric-item">
        <i class="bi bi-chat"></i>
        {{ formatNumber(tweet.metrics?.reply_count || 0) }}
      </span>
    </div>

    <div class="tweet-footer">
      <span class="tweet-time">
        <i class="bi bi-clock"></i>
        {{ formatDate(tweet.created_at) }}
      </span>
    </div>
  </article>
</template>

<script>
export default {
  name: 'TweetCard',
  props: {
    tweet: {
      type: Object,
      required: true
    }
  },
  setup(props) {
    const formatNumber = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
      return num.toString()
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    }

    const openTweet = () => {
      window.open(props.tweet.url, '_blank', 'noopener,noreferrer')
    }

    return {
      formatNumber,
      formatDate,
      openTweet
    }
  }
}
</script>

<style scoped>
/* ============================================
   TWEET CARD - Mobile-First Design
   ============================================ */
.tweet-card {
  /* Lightweight glassmorphism for mobile */
  background: rgba(26, 26, 46, 0.6);
  backdrop-filter: blur(8px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 3px solid #1da1f2;
  border-radius: 16px;
  padding: 16px;
  /* Touch-optimized transitions */
  transition: transform 0.2s ease, opacity 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  width: 100%;
  /* Remove tap highlight */
  -webkit-tap-highlight-color: transparent;
  /* Animation */
  animation: fadeIn 0.5s ease;
}

/* Touch feedback (active state for mobile) */
.tweet-card:active {
  transform: scale(0.97);
  opacity: 0.9;
}

/* ============================================
   TWEET HEADER - Mobile-Optimized
   ============================================ */
.tweet-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.profile-image {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid rgba(29, 161, 242, 0.3);
  object-fit: cover;
}

.author-info {
  flex: 1;
  min-width: 0;
}

.author-name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 2px;
}

.verified-badge {
  color: #1da1f2;
  font-size: 1rem;
}

.username {
  font-size: 0.875rem;
  color: #718096;
}

.tweet-badge {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1da1f2 0%, #0c7abf 100%);
  border-radius: 10px;
  color: white;
  font-size: 1rem;
}

/* ============================================
   TWEET TEXT - Mobile-Optimized
   ============================================ */
.tweet-text {
  color: #ffffff;
  font-size: 0.9375rem;
  line-height: 1.5;
  margin: 0 0 12px 0;
  /* Line clamp for mobile */
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ============================================
   TWEET METRICS - Mobile-Optimized
   ============================================ */
.tweet-metrics {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #718096;
  font-size: 0.875rem;
}

.metric-item i {
  color: #06b6d4;
  font-size: 1rem;
}

/* ============================================
   TWEET FOOTER - Mobile-Optimized
   ============================================ */
.tweet-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tweet-time {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #718096;
  font-size: 0.75rem;
}

.tweet-time i {
  color: #06b6d4;
}

/* ============================================
   TABLET ENHANCEMENT (min-width: 768px)
   ============================================ */
@media (min-width: 768px) {
  .tweet-card {
    padding: 20px;
  }

  .tweet-text {
    font-size: 1rem;
  }

  .metric-item {
    font-size: 0.9375rem;
  }
}

/* ============================================
   DESKTOP ENHANCEMENT (min-width: 1024px)
   ============================================ */
@media (min-width: 1024px) {
  .tweet-card {
    /* Enhanced glassmorphism for desktop */
    backdrop-filter: blur(12px) saturate(180%);
    border-radius: 20px;
  }

  /* Desktop hover effects (not mobile) */
  .tweet-card:hover {
    transform: translateY(-8px) scale(1.02);
    border-left-color: #1da1f2;
    box-shadow: 0 20px 40px rgba(29, 161, 242, 0.3),
      0 0 60px rgba(29, 161, 242, 0.15);
  }

  /* Remove active state on desktop (use hover instead) */
  .tweet-card:active {
    transform: translateY(-8px) scale(1.02);
    opacity: 1;
  }
}

/* ============================================
   ACCESSIBILITY
   ============================================ */
@media (prefers-reduced-motion: reduce) {
  .tweet-card {
    transition: none;
    animation: none;
  }

  .tweet-card:hover,
  .tweet-card:active {
    transform: none;
  }
}

/* ============================================
   ANIMATIONS
   ============================================ */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
