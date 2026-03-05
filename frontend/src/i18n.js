// Simple i18n implementation for bilingual support
export const translations = {
  en: {
    title: 'Live News Aggregator',
    search: {
      placeholder: 'Search news topic (e.g., US Iran war)',
      button: 'Refresh Now',
      trending: 'Trending:',
      language: {
        english: 'English',
        arabic: 'Arabic',
        both: 'Both'
      },
      region: {
        all: 'All Regions',
        us: 'US/Western',
        eu: 'Europe',
        middleeast: 'Middle East'
      }
    },
    news: {
      loading: 'Fetching latest news...',
      noResults: 'No news found. Try a different search term.',
      readMore: 'Read More',
      translate: 'Translate',
      original: 'Original',
      translating: 'Translating...'
    },
    tweets: {
      viewTweet: 'View Tweet'
    },
    status: {
      live: 'Live',
      updated: 'Updated',
      ago: 'ago',
      error: 'Error',
      updating: 'Updating...'
    },
    time: {
      justNow: 'Just now',
      minutesAgo: 'm ago',
      hoursAgo: 'h ago',
      daysAgo: 'd ago'
    }
  },
  ar: {
    title: 'ملخص الأخبار المباشر',
    search: {
      placeholder: 'ابحث عن موضوع (مثال: حرب إيران أمريكا)',
      button: 'تحديث الآن',
      trending: 'الرائج:',
      language: {
        english: 'English',
        arabic: 'العربية',
        both: 'كلاهما'
      },
      region: {
        all: 'كل المناطق',
        us: 'أمريكا/الغرب',
        eu: 'أوروبا',
        middleeast: 'الشرق الأوسط'
      }
    },
    news: {
      loading: 'جاري تحميل آخر الأخبار...',
      noResults: 'لم يتم العثور على أخبار. جرب مصطلح بحث مختلف.',
      readMore: 'اقرأ المزيد',
      translate: 'ترجم',
      original: 'الأصلي',
      translating: 'جاري الترجمة...'
    },
    tweets: {
      viewTweet: 'عرض التغريدة'
    },
    status: {
      live: 'مباشر',
      updated: 'آخر تحديث',
      ago: 'منذ',
      error: 'خطأ',
      updating: 'جاري التحديث...'
    },
    time: {
      justNow: 'الآن',
      minutesAgo: 'د',
      hoursAgo: 'س',
      daysAgo: 'ي'
    }
  }
}

export function createI18n() {
  let currentLocale = localStorage.getItem('locale') || 'en'

  return {
    locale: currentLocale,
    t: (key) => {
      const keys = key.split('.')
      let value = translations[currentLocale]

      for (const k of keys) {
        value = value?.[k]
      }

      return value || key
    },
    setLocale: (locale) => {
      currentLocale = locale
      localStorage.setItem('locale', locale)
    },
    getLocale: () => currentLocale
  }
}
