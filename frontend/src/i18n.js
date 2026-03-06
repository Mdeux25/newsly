// Simple i18n implementation for bilingual support
export const translations = {
  en: {
    title: 'Live News Aggregator',
    search: {
      placeholder: 'Search news topic (e.g., US Iran war)',
      button: 'Refresh Now',
      trending: 'Trending:',
      language: {
        label: 'Language',
        english: 'English',
        arabic: 'Arabic',
        both: 'Both'
      },
      time: {
        label: 'Time',
        h3: 'Last 3 hours',
        h12: 'Last 12 hours',
        h24: 'Last 24 hours',
        d3: 'Last 3 days',
        d7: 'Last 7 days'
      }
    },
    news: {
      loading: 'Fetching latest news...',
      noResults: 'No news found. Try a different search term.',
      readMore: 'Read More',
      translate: 'Translate',
      original: 'Original',
      translating: 'Translating...',
      showing: 'Showing',
      of: 'of',
      articles: 'articles',
      noDescription: 'No description available.'
    },
    tweets: {
      viewTweet: 'View Tweet'
    },
    nav: {
      news: 'News',
      refresh: 'Refresh',
      tweets: 'Tweets'
    },
    status: {
      live: 'Live',
      updated: 'Updated',
      ago: 'ago',
      error: 'Error',
      updating: 'Updating...',
      overAnHour: 'over an hour ago'
    },
    time: {
      justNow: 'Just now',
      secondsAgo: 's ago',
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
        label: 'اللغة',
        english: 'English',
        arabic: 'العربية',
        both: 'كلاهما'
      },
      time: {
        label: 'الفترة',
        h3: 'آخر 3 ساعات',
        h12: 'آخر 12 ساعة',
        h24: 'آخر 24 ساعة',
        d3: 'آخر 3 أيام',
        d7: 'آخر 7 أيام'
      }
    },
    news: {
      loading: 'جاري تحميل آخر الأخبار...',
      noResults: 'لم يتم العثور على أخبار. جرب مصطلح بحث مختلف.',
      readMore: 'اقرأ المزيد',
      translate: 'ترجم',
      original: 'الأصلي',
      translating: 'جاري الترجمة...',
      showing: 'عرض',
      of: 'من',
      articles: 'مقالة',
      noDescription: 'لا يوجد وصف.'
    },
    tweets: {
      viewTweet: 'عرض التغريدة'
    },
    nav: {
      news: 'الأخبار',
      refresh: 'تحديث',
      tweets: 'تغريدات'
    },
    status: {
      live: 'مباشر',
      updated: 'منذ',
      ago: '',
      error: 'خطأ',
      updating: 'جاري التحديث...',
      overAnHour: 'منذ أكثر من ساعة'
    },
    time: {
      justNow: 'الآن',
      secondsAgo: 'ث',
      minutesAgo: 'د',
      hoursAgo: 'س',
      daysAgo: 'ي'
    }
  }
}

export function createI18n() {
  // Use an object so mutations are visible to the closed-over t() function
  const state = { locale: localStorage.getItem('locale') || 'en' }

  const t = (key) => {
    const keys = key.split('.')
    let value = translations[state.locale]
    for (const k of keys) value = value?.[k]
    return value || key
  }

  return {
    get locale() { return state.locale },
    t,
    setLocale: (locale) => {
      state.locale = locale
      localStorage.setItem('locale', locale)
    },
    getLocale: () => state.locale
  }
}
