export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: string, params?: AnalyticsParams) {
  if (typeof window === 'undefined') return;
  const gtag = (window as any).gtag;
  if (typeof gtag === 'function') {
    gtag('event', name, params ?? {});
  } else if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics] event', name, params);
  }
}
