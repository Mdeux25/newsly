const GA_ID = 'G-1N9T3BP2T6'

export function trackEvent(eventName, params = {}) {
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}

export function trackPageView(title) {
  if (typeof window.gtag !== 'function') return
  window.gtag('config', GA_ID, { page_title: title })
}
