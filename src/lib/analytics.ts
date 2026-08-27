export interface LocalAnalyticsEvent {
  event: string;
  ts: number;
  props: Record<string, string | number | boolean>;
}

const STORAGE_KEY = 'csv_cleaner_analytics_events';
const MAX_EVENTS = 500;

export function trackEvent(eventName: string, props: Record<string, string | number | boolean> = {}): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const existing: LocalAnalyticsEvent[] = raw ? JSON.parse(raw) : [];

    const newEvent: LocalAnalyticsEvent = {
      event: eventName,
      ts: Date.now(),
      props,
    };

    const updated = [...existing.slice(-(MAX_EVENTS - 1)), newEvent];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Optional debug log in dev mode
    if (typeof window !== 'undefined' && window.location.search.includes('debug=analytics')) {
      console.log('📊 [CSV Cleaner Analytics]', newEvent);
    }
  } catch (e) {
    console.warn('Failed to record local analytics event:', e);
  }
}

export function getLocalAnalyticsEvents(): LocalAnalyticsEvent[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function clearLocalAnalyticsEvents(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
