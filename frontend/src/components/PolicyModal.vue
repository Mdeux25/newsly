<template>
  <Teleport to="body">
    <div v-if="policy" class="policy-overlay" @click.self="$emit('close')">
      <div class="policy-modal" :class="{ rtl: uiLanguage === 'ar' }">

        <!-- Header -->
        <div class="policy-header">
          <h2 class="policy-title">{{ content.title }}</h2>
          <button class="policy-close" @click="$emit('close')" aria-label="Close">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Last updated -->
        <p class="policy-updated">
          {{ uiLanguage === 'ar' ? 'آخر تحديث:' : 'Last updated:' }}
          {{ content.updated }}
        </p>

        <!-- Body -->
        <div class="policy-body">
          <section v-for="section in content.sections" :key="section.heading" class="policy-section">
            <h3 class="policy-section-heading">{{ section.heading }}</h3>
            <p v-for="(para, i) in section.paragraphs" :key="i" class="policy-para">{{ para }}</p>
            <ul v-if="section.bullets" class="policy-bullets">
              <li v-for="(bullet, i) in section.bullets" :key="i">{{ bullet }}</li>
            </ul>
          </section>

          <!-- Contact box -->
          <div class="policy-contact">
            <i class="bi bi-envelope-fill"></i>
            <span>
              {{ uiLanguage === 'ar' ? 'للتواصل:' : 'Contact us:' }}
              <a href="mailto:legal@dusoft.org" class="policy-email">legal@dusoft.org</a>
            </span>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script>
import { computed } from 'vue'

const POLICIES = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      updated: 'March 2026',
      sections: [
        {
          heading: 'Overview',
          paragraphs: [
            'Newsly is a free news aggregation service operated by DU Soft, Cairo, Egypt. We take your privacy seriously. This policy explains what data we collect, why, and how we protect it.',
            'Newsly does not require account registration. You can use the full service without providing any personal information.'
          ]
        },
        {
          heading: 'Information We Collect',
          paragraphs: ['We collect only the minimum data needed to operate the service:'],
          bullets: [
            'Language and UI preferences stored locally in your browser (localStorage) — never transmitted to our servers.',
            'Anonymous usage analytics: page views, session duration, country (via server logs). No personally identifiable information.',
            'Search queries may be logged server-side for up to 7 days to diagnose issues, then permanently deleted.'
          ]
        },
        {
          heading: 'Cookies',
          paragraphs: [
            'We use essential cookies only. These store your language preference and theme setting. No advertising or tracking cookies are placed.',
            'You can disable cookies in your browser settings. The service will still function, but your preferences will reset on each visit.'
          ]
        },
        {
          heading: 'Third-Party Services',
          paragraphs: ['Newsly aggregates headlines from third-party news APIs. When you click an article, you leave Newsly and enter the publisher\'s website — their privacy policy applies. We are not responsible for third-party data practices.'],
          bullets: [
            'News content: NewsAPI, GNews — their respective terms apply.',
            'AI summaries: OpenAI API — prompts contain only article headlines, no user data.'
          ]
        },
        {
          heading: 'Data Retention & Your Rights',
          paragraphs: [
            'We do not store personal data. Since we have no accounts, there is no personal data to delete or export.',
            'If you believe any data about you exists in our systems, contact us at legal@dusoft.org and we will respond within 30 days.'
          ]
        },
        {
          heading: 'Changes to This Policy',
          paragraphs: ['We may update this policy. The "last updated" date above will reflect any changes. Continued use of Newsly after changes constitutes acceptance of the updated policy.']
        }
      ]
    },
    ar: {
      title: 'سياسة الخصوصية',
      updated: 'مارس ٢٠٢٦',
      sections: [
        {
          heading: 'نظرة عامة',
          paragraphs: [
            'نيوزلي خدمة تجميع أخبار مجانية تشغّلها شركة DU Soft، القاهرة، مصر. نأخذ خصوصيتك على محمل الجد. تشرح هذه السياسة البيانات التي نجمعها والسبب وكيفية حمايتها.',
            'لا تتطلب نيوزلي إنشاء حساب. يمكنك استخدام الخدمة بالكامل دون تقديم أي معلومات شخصية.'
          ]
        },
        {
          heading: 'المعلومات التي نجمعها',
          paragraphs: ['نجمع الحد الأدنى من البيانات اللازمة لتشغيل الخدمة:'],
          bullets: [
            'تفضيلات اللغة والواجهة المخزّنة محليًا في متصفحك (localStorage) — لا تُرسل إلى خوادمنا أبدًا.',
            'إحصاءات استخدام مجهولة الهوية: مشاهدات الصفحة، مدة الجلسة، البلد (عبر سجلات الخادم). لا معلومات تعريف شخصية.',
            'قد تُسجَّل استعلامات البحث من جانب الخادم لمدة تصل إلى 7 أيام لتشخيص المشكلات، ثم تُحذف نهائيًا.'
          ]
        },
        {
          heading: 'ملفات تعريف الارتباط (Cookies)',
          paragraphs: [
            'نستخدم ملفات تعريف الارتباط الأساسية فقط لحفظ تفضيلات اللغة والمظهر. لا توجد ملفات إعلانية أو تتبعية.',
            'يمكنك تعطيل ملفات تعريف الارتباط في إعدادات متصفحك. ستعمل الخدمة، لكن تفضيلاتك ستعود للإعدادات الافتراضية عند كل زيارة.'
          ]
        },
        {
          heading: 'الخدمات الخارجية',
          paragraphs: ['تجمع نيوزلي العناوين من واجهات برمجة إخبارية خارجية. عند النقر على مقال، تغادر نيوزلي وتدخل موقع الناشر — تسري سياسة الخصوصية الخاصة به.'],
          bullets: [
            'محتوى الأخبار: NewsAPI، GNews — تسري شروطهم.',
            'ملخصات الذكاء الاصطناعي: OpenAI API — تحتوي المطالبات على عناوين المقالات فقط، لا بيانات مستخدم.'
          ]
        },
        {
          heading: 'الاحتفاظ بالبيانات وحقوقك',
          paragraphs: [
            'لا نحتفظ ببيانات شخصية. بما أنه لا توجد حسابات، لا توجد بيانات للحذف أو التصدير.',
            'إذا اعتقدت أن أي بيانات عنك موجودة في أنظمتنا، تواصل معنا على legal@dusoft.org وسنردّ خلال 30 يومًا.'
          ]
        },
        {
          heading: 'التغييرات على هذه السياسة',
          paragraphs: ['قد نحدّث هذه السياسة. سيعكس تاريخ "آخر تحديث" أعلاه أي تغييرات. الاستمرار في استخدام نيوزلي بعد التغييرات يعني قبول السياسة المحدّثة.']
        }
      ]
    }
  },
  terms: {
    en: {
      title: 'Terms of Service',
      updated: 'March 2026',
      sections: [
        {
          heading: 'Acceptance of Terms',
          paragraphs: [
            'By using Newsly ("the Service"), you agree to these Terms of Service. If you do not agree, please do not use the Service. These terms are governed by the laws of Egypt.',
            'Newsly is operated by DU Soft, Cairo, Egypt. We reserve the right to modify these terms at any time.'
          ]
        },
        {
          heading: 'Description of Service',
          paragraphs: [
            'Newsly is a news aggregation platform. We display headlines, summaries, and metadata sourced from publicly available news APIs. We do not produce original journalism.',
            'Article content belongs to the original publishers. Newsly displays excerpts and links to source articles. Full articles are accessed on the publisher\'s website.'
          ]
        },
        {
          heading: 'Acceptable Use',
          paragraphs: ['You agree not to:'],
          bullets: [
            'Scrape, crawl, or systematically extract data from Newsly.',
            'Use the Service to republish aggregated content commercially without permission.',
            'Attempt to reverse-engineer, disrupt, or overwhelm our servers.',
            'Use automated tools to interact with the Service without written consent from DU Soft.'
          ]
        },
        {
          heading: 'Intellectual Property',
          paragraphs: [
            'The Newsly name, logo, and UI design are property of DU Soft. All rights reserved.',
            'News article titles, descriptions, and images are property of their respective publishers. We display them under fair use for news aggregation purposes.'
          ]
        },
        {
          heading: 'Disclaimer of Warranties',
          paragraphs: [
            'The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy, completeness, or timeliness of aggregated news content.',
            'We are not responsible for the content of linked third-party articles, opinions expressed therein, or any decisions made based on information found through Newsly.'
          ]
        },
        {
          heading: 'Limitation of Liability',
          paragraphs: ['To the maximum extent permitted by law, DU Soft shall not be liable for any indirect, incidental, or consequential damages arising from use of the Service.']
        },
        {
          heading: 'Termination',
          paragraphs: ['We reserve the right to suspend or terminate access to the Service at any time, without notice, for conduct that violates these Terms or is harmful to other users or us.']
        }
      ]
    },
    ar: {
      title: 'شروط الاستخدام',
      updated: 'مارس ٢٠٢٦',
      sections: [
        {
          heading: 'قبول الشروط',
          paragraphs: [
            'باستخدامك لنيوزلي ("الخدمة")، فإنك توافق على شروط الاستخدام هذه. إذا لم توافق، يُرجى عدم استخدام الخدمة. تخضع هذه الشروط لقوانين جمهورية مصر العربية.',
            'تُشغّل نيوزلي شركة DU Soft، القاهرة، مصر. نحتفظ بالحق في تعديل هذه الشروط في أي وقت.'
          ]
        },
        {
          heading: 'وصف الخدمة',
          paragraphs: [
            'نيوزلي منصة تجميع أخبار. تعرض عناوين وملخصات وبيانات وصفية مصدرها واجهات برمجية إخبارية متاحة للعموم. لا نُنتج صحافة أصيلة.',
            'محتوى المقالات ملك للناشرين الأصليين. تعرض نيوزلي مقتطفات وروابط للمقالات الأصلية. يُوصل إلى المقالات الكاملة عبر موقع الناشر.'
          ]
        },
        {
          heading: 'الاستخدام المقبول',
          paragraphs: ['تتعهد بعدم:'],
          bullets: [
            'كشط أو زحف أو استخراج منهجي للبيانات من نيوزلي.',
            'استخدام الخدمة لإعادة نشر المحتوى المجمّع تجاريًا دون إذن.',
            'محاولة عكس هندسة خوادمنا أو تعطيلها أو إرهاقها.',
            'استخدام أدوات آلية للتفاعل مع الخدمة دون موافقة خطية من DU Soft.'
          ]
        },
        {
          heading: 'الملكية الفكرية',
          paragraphs: [
            'اسم نيوزلي وشعارها وتصميم الواجهة ملك لشركة DU Soft. جميع الحقوق محفوظة.',
            'عناوين المقالات الإخبارية وأوصافها وصورها ملك لناشريها. نعرضها استنادًا إلى الاستخدام العادل لأغراض تجميع الأخبار.'
          ]
        },
        {
          heading: 'إخلاء المسؤولية',
          paragraphs: [
            'تُقدَّم الخدمة "كما هي" دون ضمانات من أي نوع. لا نضمن دقة أو اكتمال أو حداثة محتوى الأخبار المجمّعة.',
            'لسنا مسؤولين عن محتوى مقالات الأطراف الثالثة المرتبطة أو الآراء الواردة فيها أو أي قرارات تُتخذ بناءً على معلومات عُثر عليها عبر نيوزلي.'
          ]
        },
        {
          heading: 'تحديد المسؤولية',
          paragraphs: ['بالقدر الأقصى الذي يسمح به القانون، لن تكون DU Soft مسؤولة عن أي أضرار غير مباشرة أو عرضية أو تبعية ناجمة عن استخدام الخدمة.']
        },
        {
          heading: 'الإنهاء',
          paragraphs: ['نحتفظ بالحق في تعليق أو إنهاء الوصول إلى الخدمة في أي وقت، دون إشعار، في حالة السلوك المنتهك لهذه الشروط أو الضار بالمستخدمين الآخرين أو بنا.']
        }
      ]
    }
  },
  cookies: {
    en: {
      title: 'Cookie Policy',
      updated: 'March 2026',
      sections: [
        {
          heading: 'What Are Cookies?',
          paragraphs: ['Cookies are small text files stored in your browser. They allow websites to remember your preferences between visits.']
        },
        {
          heading: 'Cookies We Use',
          paragraphs: ['Newsly uses only essential cookies — no advertising or tracking cookies:'],
          bullets: [
            'newsly_lang — Stores your language preference (en/ar). Expires after 1 year.',
            'newsly_hours — Stores your preferred time filter. Expires after 1 year.',
            'No session tracking cookies. No fingerprinting. No cross-site tracking.'
          ]
        },
        {
          heading: 'What We Do NOT Do',
          bullets: [
            'We do not place advertising cookies.',
            'We do not use Google Analytics or similar tracking services.',
            'We do not share cookie data with third parties.',
            'We do not use cookies to build a profile about you.'
          ]
        },
        {
          heading: 'Managing Cookies',
          paragraphs: [
            'You can block or delete cookies through your browser settings. Visit your browser\'s help page for instructions:',
          ],
          bullets: [
            'Chrome: Settings > Privacy and security > Cookies and other site data',
            'Firefox: Settings > Privacy & Security > Cookies and Site Data',
            'Safari: Preferences > Privacy > Manage Website Data'
          ]
        },
        {
          heading: 'Future Changes',
          paragraphs: ['If we add advertising or analytics in the future (e.g., to support the free tier), we will update this policy and add a cookie consent banner before doing so.']
        }
      ]
    },
    ar: {
      title: 'سياسة ملفات تعريف الارتباط',
      updated: 'مارس ٢٠٢٦',
      sections: [
        {
          heading: 'ما هي ملفات تعريف الارتباط؟',
          paragraphs: ['ملفات تعريف الارتباط نصوص صغيرة مخزّنة في متصفحك. تتيح للمواقع تذكّر تفضيلاتك بين الزيارات.']
        },
        {
          heading: 'الملفات التي نستخدمها',
          paragraphs: ['تستخدم نيوزلي الملفات الأساسية فقط — لا ملفات إعلانية أو تتبعية:'],
          bullets: [
            'newsly_lang — يحفظ تفضيل اللغة (en/ar). تنتهي صلاحيته بعد عام.',
            'newsly_hours — يحفظ مرشح الوقت المفضّل. تنتهي صلاحيته بعد عام.',
            'لا ملفات تتبع جلسة. لا بصمة رقمية. لا تتبع عبر المواقع.'
          ]
        },
        {
          heading: 'ما لا نفعله',
          bullets: [
            'لا نضع ملفات إعلانية.',
            'لا نستخدم Google Analytics أو خدمات تتبع مماثلة.',
            'لا نشارك بيانات الملفات مع أطراف ثالثة.',
            'لا نستخدم الملفات لبناء ملف شخصي عنك.'
          ]
        },
        {
          heading: 'إدارة ملفات تعريف الارتباط',
          paragraphs: ['يمكنك حظر الملفات أو حذفها عبر إعدادات متصفحك.'],
          bullets: [
            'Chrome: الإعدادات > الخصوصية والأمان > ملفات تعريف الارتباط',
            'Firefox: الإعدادات > الخصوصية والأمان > ملفات تعريف الارتباط',
            'Safari: التفضيلات > الخصوصية > إدارة بيانات الموقع'
          ]
        },
        {
          heading: 'التغييرات المستقبلية',
          paragraphs: ['إذا أضفنا إعلانات أو تحليلات مستقبلًا (لدعم الطبقة المجانية)، سنحدّث هذه السياسة ونضيف لافتة موافقة على الملفات قبل ذلك.']
        }
      ]
    }
  },
  dmca: {
    en: {
      title: 'Copyright & DMCA',
      updated: 'March 2026',
      sections: [
        {
          heading: 'Nature of Newsly',
          paragraphs: [
            'Newsly is a news aggregation service. We display article titles, brief descriptions (excerpts), publication dates, and source attribution — all of which constitute fair use under applicable law for the purpose of news indexing and commentary.',
            'We do not reproduce full article bodies. All articles link directly to the original publisher.'
          ]
        },
        {
          heading: 'Copyright Ownership',
          paragraphs: ['All news article content (titles, images, descriptions) remains the intellectual property of the original publisher. Newsly claims no ownership over aggregated content.']
        },
        {
          heading: 'DMCA Takedown Requests',
          paragraphs: [
            'If you are a copyright holder and believe Newsly displays your content in a manner that infringes your rights, please contact us at legal@dusoft.org with:',
          ],
          bullets: [
            'Your name and contact information.',
            'A description of the copyrighted work you believe is infringed.',
            'The specific URL on Newsly where the content appears.',
            'A statement that you have a good-faith belief the use is not authorized.',
            'Your physical or electronic signature.'
          ]
        },
        {
          heading: 'Response Timeline',
          paragraphs: ['We will acknowledge valid DMCA requests within 5 business days and remove or disable access to the identified content within 10 business days.']
        },
        {
          heading: 'News API Sources',
          paragraphs: ['Newsly sources content via licensed news APIs (NewsAPI, GNews). These providers have their own agreements with publishers. Our display of their data is within the scope of those licenses.']
        }
      ]
    },
    ar: {
      title: 'حقوق النشر وإشعار DMCA',
      updated: 'مارس ٢٠٢٦',
      sections: [
        {
          heading: 'طبيعة نيوزلي',
          paragraphs: [
            'نيوزلي خدمة تجميع أخبار. تعرض عناوين المقالات ومقتطفات قصيرة وتواريخ النشر وإسناد المصدر — وهو ما يُعدّ استخدامًا عادلًا بموجب القانون المعمول به لأغراض فهرسة الأخبار والتعليق عليها.',
            'لا نستنسخ نصوص المقالات كاملة. تُوصِل جميع المقالات مباشرةً إلى الناشر الأصلي.'
          ]
        },
        {
          heading: 'ملكية حقوق النشر',
          paragraphs: ['يظل محتوى مقالات الأخبار (العناوين والصور والأوصاف) ملكًا فكريًا للناشر الأصلي. لا تدّعي نيوزلي ملكية المحتوى المجمّع.']
        },
        {
          heading: 'طلبات الإزالة (DMCA)',
          paragraphs: ['إذا كنت صاحب حقوق نشر وتعتقد أن نيوزلي تعرض محتواك بطريقة تنتهك حقوقك، تواصل معنا على legal@dusoft.org مع:'],
          bullets: [
            'اسمك ومعلومات الاتصال.',
            'وصف العمل المحمي الذي تعتقد انتهاكه.',
            'الرابط المحدد على نيوزلي حيث يظهر المحتوى.',
            'بيان بحسن النية بأن الاستخدام غير مرخّص.',
            'توقيعك المادي أو الإلكتروني.'
          ]
        },
        {
          heading: 'الجدول الزمني للاستجابة',
          paragraphs: ['سنتلقى طلبات DMCA الصحيحة خلال 5 أيام عمل وسنزيل المحتوى أو نعطّل الوصول إليه خلال 10 أيام عمل.']
        },
        {
          heading: 'مصادر واجهات الأخبار البرمجية',
          paragraphs: ['تحصل نيوزلي على المحتوى عبر واجهات أخبار مرخّصة (NewsAPI، GNews). لدى هؤلاء المزوّدين اتفاقياتهم الخاصة مع الناشرين. عرضنا لبياناتهم يندرج ضمن نطاق تلك التراخيص.']
        }
      ]
    }
  }
}

export default {
  name: 'PolicyModal',
  props: {
    policy: { type: String, default: null }, // 'privacy' | 'terms' | 'cookies' | 'dmca' | null
    uiLanguage: { type: String, default: 'en' }
  },
  emits: ['close'],
  setup(props) {
    const content = computed(() => {
      if (!props.policy) return null
      const lang = props.uiLanguage === 'ar' ? 'ar' : 'en'
      return POLICIES[props.policy]?.[lang] || null
    })
    return { content }
  }
}
</script>

<style scoped>
.policy-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  animation: overlayIn 0.2s ease;
}

@media (min-width: 640px) {
  .policy-overlay {
    align-items: center;
    padding: 24px;
  }
}

.policy-modal {
  background: #0f1117;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

@media (min-width: 640px) {
  .policy-modal {
    border-radius: 20px;
    max-height: 80vh;
    animation: fadeScaleIn 0.25s ease;
  }
}

/* ── Header ──────────────────────── */
.policy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}

.policy-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  background: linear-gradient(135deg, #3b82f6, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.policy-close {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
}

.policy-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.policy-updated {
  padding: 8px 24px;
  margin: 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}

/* ── Body ────────────────────────── */
.policy-body {
  overflow-y: auto;
  padding: 24px;
  flex: 1;
}

.policy-section {
  margin-bottom: 28px;
}

.policy-section-heading {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #06b6d4;
  margin: 0 0 10px;
}

.policy-para {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.75;
  margin: 0 0 8px;
}

.policy-bullets {
  margin: 8px 0 0 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.policy-bullets li {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
}

/* ── Contact box ─────────────────── */
.policy-contact {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  margin-top: 8px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.55);
}

.policy-contact i {
  color: #3b82f6;
  font-size: 1rem;
  flex-shrink: 0;
}

.policy-email {
  color: #3b82f6;
  text-decoration: none;
}

.policy-email:hover {
  color: #60a5fa;
  text-decoration: underline;
}

/* ── RTL ─────────────────────────── */
.rtl {
  direction: rtl;
}

.rtl .policy-header {
  flex-direction: row-reverse;
}

.rtl .policy-bullets {
  margin-left: 0;
  margin-right: 20px;
}

.rtl .policy-contact {
  flex-direction: row-reverse;
}

/* ── Animations ──────────────────── */
@keyframes overlayIn {
  from { opacity: 0 }
  to { opacity: 1 }
}

@keyframes slideUp {
  from { transform: translateY(100%) }
  to { transform: translateY(0) }
}

@keyframes fadeScaleIn {
  from { opacity: 0; transform: scale(0.95) }
  to { opacity: 1; transform: scale(1) }
}
</style>
