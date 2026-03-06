<template>
  <footer class="app-footer" :class="{ rtl: uiLanguage === 'ar' }">
    <div class="footer-inner">

      <!-- Brand + About -->
      <div class="footer-brand">
        <div class="footer-logo">
          <span class="footer-logo-text">{{ uiLanguage === 'ar' ? 'نيوزلي' : 'Newsly' }}</span>
          <span class="footer-dot"></span>
        </div>
        <p class="footer-tagline">
          {{ uiLanguage === 'ar'
            ? 'أخبار العالم بعيون متعددة — عربي وإنجليزي، في مكان واحد.'
            : 'World news through multiple lenses — Arabic & English, one place.' }}
        </p>
      </div>

      <!-- Divider -->
      <div class="footer-divider"></div>

      <!-- Three columns -->
      <div class="footer-columns">

        <!-- About DU Soft -->
        <div class="footer-col">
          <h4 class="footer-col-title">
            {{ uiLanguage === 'ar' ? 'من نحن' : 'About' }}
          </h4>
          <p class="footer-about-text">
            {{ uiLanguage === 'ar'
              ? 'نيوزلي من تطوير شركة DU Soft، شركة مصرية متخصصة في بناء تطبيقات الويب والذكاء الاصطناعي من القاهرة. نؤمن بأن الوصول إلى الأخبار الموثوقة حق للجميع.'
              : 'Newsly is built by DU Soft, a Cairo-based software company specialising in AI-powered web applications. We believe access to reliable, multilingual news is a right, not a privilege.' }}
          </p>
          <div class="footer-location">
            <i class="bi bi-geo-alt-fill"></i>
            <span>{{ uiLanguage === 'ar' ? 'القاهرة، مصر' : 'Cairo, Egypt' }}</span>
          </div>
        </div>

        <!-- Product links -->
        <div class="footer-col">
          <h4 class="footer-col-title">
            {{ uiLanguage === 'ar' ? 'المنتج' : 'Product' }}
          </h4>
          <ul class="footer-links">
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'الرئيسية' : 'Home' }}</a></li>
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'متابعة النزاعات' : 'Conflict Tracker' }}</a></li>
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'الأخبار العاجلة' : 'Breaking News' }}</a></li>
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'الإعلانات معنا' : 'Advertise with Us' }}</a></li>
          </ul>
        </div>

        <!-- Company links -->
        <div class="footer-col">
          <h4 class="footer-col-title">
            {{ uiLanguage === 'ar' ? 'الشركة' : 'Company' }}
          </h4>
          <ul class="footer-links">
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy' }}</a></li>
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'شروط الاستخدام' : 'Terms of Use' }}</a></li>
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'تواصل معنا' : 'Contact Us' }}</a></li>
            <li>
              <a href="https://dusoft.io" target="_blank" rel="noopener" class="footer-link footer-link-highlight">
                DU Soft {{ uiLanguage === 'ar' ? '↗' : '↗' }}
              </a>
            </li>
          </ul>
        </div>

      </div>

      <!-- Divider -->
      <div class="footer-divider"></div>

      <!-- Bottom bar -->
      <div class="footer-bottom">
        <span class="footer-copyright">
          © {{ currentYear }} Newsly &mdash;
          {{ uiLanguage === 'ar' ? 'بُني بواسطة DU Soft، القاهرة' : 'Built by DU Soft, Cairo' }}
        </span>
        <div class="footer-socials">
          <a href="#" class="social-icon" aria-label="X / Twitter"><i class="bi bi-twitter-x"></i></a>
          <a href="#" class="social-icon" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
          <a href="#" class="social-icon" aria-label="GitHub"><i class="bi bi-github"></i></a>
        </div>
      </div>

    </div>
  </footer>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'AppFooter',
  props: {
    uiLanguage: { type: String, default: 'en' }
  },
  setup() {
    const currentYear = computed(() => new Date().getFullYear())
    return { currentYear }
  }
}
</script>

<style scoped>
.app-footer {
  background: rgba(8, 10, 20, 0.85);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding: 40px 24px 32px;
  /* Stay above mobile bottom-nav padding handled by content-wrapper */
  margin-top: 48px;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Brand ─────────────────────────── */
.footer-brand {
  margin-bottom: 28px;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.footer-logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-dot {
  width: 6px;
  height: 6px;
  background: #06b6d4;
  border-radius: 50%;
}

.footer-tagline {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.6;
  max-width: 420px;
}

/* ── Divider ────────────────────────── */
.footer-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 28px 0;
}

/* ── Columns ────────────────────────── */
.footer-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 640px) {
  .footer-columns {
    grid-template-columns: 2fr 1fr 1fr;
    gap: 40px;
  }
}

.footer-col-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0 0 14px;
}

/* ── About text ─────────────────────── */
.footer-about-text {
  margin: 0 0 12px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.7;
}

.footer-location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
}

.footer-location i {
  color: #06b6d4;
  font-size: 0.875rem;
}

/* ── Links ──────────────────────────── */
.footer-links {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-link {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: #06b6d4;
}

.footer-link-highlight {
  color: #3b82f6;
}

.footer-link-highlight:hover {
  color: #60a5fa;
}

/* ── Bottom bar ─────────────────────── */
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-copyright {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
}

.footer-socials {
  display: flex;
  gap: 12px;
}

.social-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.social-icon:hover {
  background: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
  border-color: rgba(6, 182, 212, 0.3);
}

/* ── RTL ────────────────────────────── */
.rtl {
  direction: rtl;
}

.rtl .footer-bottom {
  flex-direction: row-reverse;
}

.rtl .footer-logo {
  flex-direction: row-reverse;
}

.rtl .footer-tagline,
.rtl .footer-about-text {
  text-align: right;
}

.rtl .footer-location {
  flex-direction: row-reverse;
}
</style>
