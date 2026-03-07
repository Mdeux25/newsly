<template>
  <footer class="app-footer" :class="{ rtl: uiLanguage === 'ar' }">
    <div class="footer-inner">

      <!-- Brand + Tagline -->
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

      <div class="footer-divider"></div>

      <!-- Four columns -->
      <div class="footer-columns">

        <!-- About DU Soft -->
        <div class="footer-col footer-col-wide">
          <h4 class="footer-col-title">{{ uiLanguage === 'ar' ? 'من نحن' : 'About' }}</h4>
          <p class="footer-about-text">
            {{ uiLanguage === 'ar'
              ? 'نيوزلي من تطوير شركة DU Soft، شركة مصرية متخصصة في بناء تطبيقات الويب والذكاء الاصطناعي من القاهرة. نؤمن بأن الوصول إلى الأخبار الموثوقة حق للجميع.'
              : 'Newsly is built by DU Soft, a Cairo-based software company specialising in AI-powered web applications. We believe access to reliable, multilingual news is a right, not a privilege.' }}
          </p>
          <div class="footer-location">
            <i class="bi bi-geo-alt-fill"></i>
            <span>{{ uiLanguage === 'ar' ? 'القاهرة، مصر' : 'Cairo, Egypt' }}</span>
          </div>
          <a href="https://dusoft.org" target="_blank" rel="noopener noreferrer" class="footer-dusoft-link">
            dusoft.org <i class="bi bi-arrow-up-right-square"></i>
          </a>
        </div>

        <!-- Product -->
        <div class="footer-col">
          <h4 class="footer-col-title">{{ uiLanguage === 'ar' ? 'المنتج' : 'Product' }}</h4>
          <ul class="footer-links">
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'الرئيسية' : 'Home' }}</a></li>
            <li><a href="#" class="footer-link">{{ uiLanguage === 'ar' ? 'خريطة الأخبار' : 'News Map' }}</a></li>
            <li><a href="#" class="footer-link footer-link-soon">
              {{ uiLanguage === 'ar' ? 'متابعة النزاعات' : 'Conflict Tracker' }}
              <span class="soon-badge">{{ uiLanguage === 'ar' ? 'قريبًا' : 'Soon' }}</span>
            </a></li>
            <li><a href="#" class="footer-link footer-link-soon">
              {{ uiLanguage === 'ar' ? 'تنبيهات الأخبار' : 'News Alerts' }}
              <span class="soon-badge">{{ uiLanguage === 'ar' ? 'قريبًا' : 'Soon' }}</span>
            </a></li>
            <li><a href="mailto:ads@dusoft.org" class="footer-link">{{ uiLanguage === 'ar' ? 'الإعلان معنا' : 'Advertise' }}</a></li>
          </ul>
        </div>

        <!-- Legal -->
        <div class="footer-col">
          <h4 class="footer-col-title">{{ uiLanguage === 'ar' ? 'قانوني' : 'Legal' }}</h4>
          <ul class="footer-links">
            <li>
              <button class="footer-link footer-link-btn" @click="$emit('open-policy', 'privacy')">
                {{ uiLanguage === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy' }}
              </button>
            </li>
            <li>
              <button class="footer-link footer-link-btn" @click="$emit('open-policy', 'terms')">
                {{ uiLanguage === 'ar' ? 'شروط الاستخدام' : 'Terms of Service' }}
              </button>
            </li>
            <li>
              <button class="footer-link footer-link-btn" @click="$emit('open-policy', 'cookies')">
                {{ uiLanguage === 'ar' ? 'سياسة الكوكيز' : 'Cookie Policy' }}
              </button>
            </li>
            <li>
              <button class="footer-link footer-link-btn" @click="$emit('open-policy', 'dmca')">
                {{ uiLanguage === 'ar' ? 'حقوق النشر / DMCA' : 'Copyright & DMCA' }}
              </button>
            </li>
          </ul>
        </div>

        <!-- Support -->
        <div class="footer-col">
          <h4 class="footer-col-title">{{ uiLanguage === 'ar' ? 'الدعم' : 'Support' }}</h4>
          <ul class="footer-links">
            <li><a href="mailto:support@dusoft.org" class="footer-link">{{ uiLanguage === 'ar' ? 'تواصل معنا' : 'Contact Us' }}</a></li>
            <li><a href="mailto:legal@dusoft.org" class="footer-link">{{ uiLanguage === 'ar' ? 'الإبلاغ عن محتوى' : 'Report Content' }}</a></li>
            <li><a href="#" class="footer-link footer-link-soon">
              {{ uiLanguage === 'ar' ? 'الأسئلة الشائعة' : 'FAQ' }}
              <span class="soon-badge">{{ uiLanguage === 'ar' ? 'قريبًا' : 'Soon' }}</span>
            </a></li>
            <li><a href="mailto:support@dusoft.org" class="footer-link">{{ uiLanguage === 'ar' ? 'الإبلاغ عن خطأ' : 'Report a Bug' }}</a></li>
          </ul>
        </div>

      </div>

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
          <a href="https://github.com" target="_blank" rel="noopener" class="social-icon" aria-label="GitHub"><i class="bi bi-github"></i></a>
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
  emits: ['open-policy'],
  setup() {
    const currentYear = computed(() => new Date().getFullYear())
    return { currentYear }
  }
}
</script>

<style scoped>
.app-footer {
  background: #f5f3ee;
  border-top: 2px solid rgba(30, 58, 95, 0.12);
  padding: 48px 24px 32px;
  margin-top: 48px;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Brand ───────────────────────── */
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
  background: linear-gradient(135deg, #1e3a5f 0%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.footer-dot {
  width: 6px;
  height: 6px;
  background: #d97706;
  border-radius: 50%;
}

.footer-tagline {
  margin: 0;
  font-size: 0.875rem;
  color: #78716c;
  line-height: 1.6;
  max-width: 440px;
}

/* ── Divider ─────────────────────── */
.footer-divider {
  height: 1px;
  background: rgba(30, 58, 95, 0.1);
  margin: 28px 0;
}

/* ── Columns ─────────────────────── */
.footer-columns {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

@media (min-width: 640px) {
  .footer-columns {
    grid-template-columns: repeat(2, 1fr);
    gap: 32px 40px;
  }
}

@media (min-width: 1024px) {
  .footer-columns {
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 48px;
  }
}

.footer-col-title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #a8a29e;
  margin: 0 0 14px;
}

/* ── About col ───────────────────── */
.footer-about-text {
  margin: 0 0 12px;
  font-size: 0.8125rem;
  color: #78716c;
  line-height: 1.75;
}

.footer-location {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #78716c;
  margin-bottom: 12px;
}

.footer-location i {
  color: #1e3a5f;
}

.footer-dusoft-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8125rem;
  color: #1e3a5f;
  text-decoration: none;
  transition: color 0.2s;
}

.footer-dusoft-link:hover {
  color: #2d5f8a;
}

.footer-dusoft-link i {
  font-size: 0.75rem;
}

/* ── Links ───────────────────────── */
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
  color: #78716c;
  text-decoration: none;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.footer-link:hover {
  color: #1e3a5f;
}

/* Policy links are buttons (no href) */
.footer-link-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: start;
}

.footer-link-soon {
  cursor: default;
  opacity: 0.6;
}

.footer-link-soon:hover {
  color: #78716c;
}

.soon-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  background: rgba(30, 58, 95, 0.06);
  border: 1px solid rgba(30, 58, 95, 0.15);
  color: #44403c;
  border-radius: 6px;
  letter-spacing: 0.02em;
}

/* ── Bottom bar ──────────────────── */
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-copyright {
  font-size: 0.75rem;
  color: #a8a29e;
}

.footer-socials {
  display: flex;
  gap: 10px;
}

.social-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 58, 95, 0.05);
  border: 1px solid rgba(30, 58, 95, 0.12);
  border-radius: 9px;
  color: #78716c;
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.social-icon:hover {
  background: rgba(30, 58, 95, 0.1);
  color: #1e3a5f;
  border-color: rgba(30, 58, 95, 0.25);
}

/* ── RTL ─────────────────────────── */
.rtl {
  direction: rtl;
}

.rtl .footer-tagline,
.rtl .footer-about-text {
  text-align: right;
}

.rtl .footer-link-btn {
  text-align: end;
}

.rtl .footer-location,
.rtl .footer-dusoft-link {
  flex-direction: row-reverse;
}
</style>
