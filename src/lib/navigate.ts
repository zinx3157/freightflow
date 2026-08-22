'use client';
/**
 * Feature #2: Deep-link turn-by-turn navigation.
 *
 * On Android (S20+ / Chrome), opens:
 *   - Google Maps by default (works whether the app is installed or not — falls
 *     back to maps.google.com in the browser)
 *   - Waze if user picks it
 *   - Apple Maps on iOS (fallback browser link)
 *
 * Usage: navigateTo(lat, lng, label) or navigateToQuery("Ivato Airport, TNR")
 */

export type NavApp = 'google' | 'waze' | 'apple';

export function detectPlatform(): 'android' | 'ios' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'desktop';
}

export function navigateTo(lat: number, lng: number, label?: string, app: NavApp = 'google') {
  const q = encodeURIComponent(label || `${lat},${lng}`);
  let url = '';
  switch (app) {
    case 'waze':
      url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${q}`;
      break;
    case 'apple':
      url = `maps://maps.apple.com/?daddr=${lat},${lng}&q=${q}`;
      break;
    case 'google':
    default:
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${q}&travelmode=driving`;
      break;
  }
  // On mobile, attempt to open the app directly first
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function navigateToQuery(query: string, app: NavApp = 'google') {
  const q = encodeURIComponent(query);
  let url = '';
  switch (app) {
    case 'waze':
      url = `https://waze.com/ul?q=${q}&navigate=yes`;
      break;
    case 'apple':
      url = `maps://maps.apple.com/?q=${q}&dirflg=d`;
      break;
    case 'google':
    default:
      url = `https://www.google.com/maps/search/?api=1&query=${q}&travelmode=driving`;
      break;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

// Pre-rendered nav URLs for use in <a href> fallbacks
export function navUrl(lat: number, lng: number, label?: string, app: NavApp = 'google') {
  const q = encodeURIComponent(label || `${lat},${lng}`);
  switch (app) {
    case 'waze': return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${q}`;
    case 'apple': return `maps://maps.apple.com/?daddr=${lat},${lng}&q=${q}`;
    default: return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${q}&travelmode=driving`;
  }
}
