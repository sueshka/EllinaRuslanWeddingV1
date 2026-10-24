// Event details: routes, "add to calendar", countdown (Moscow = UTC+3).

export interface WeddingEvent {
  id: 'registration' | 'dinner'
  title: string
  /** UTC, as in .ics / Google Calendar */
  start: string
  end: string
  /** shown in the calendar event */
  location: string
  /** what the maps search for */
  address: string
}

export const REGISTRATION: WeddingEvent = {
  id: 'registration',
  title: 'Регистрация брака · Руслан & Эллина',
  start: '20261226T113000Z',
  end: '20261226T123000Z',
  location: 'Гостиница «Националь», зал «Суздаль», Москва, ул. Моховая, д. 15/1, стр. 1',
  address: 'Москва, улица Моховая, 15/1с1',
}

export const DINNER: WeddingEvent = {
  id: 'dinner',
  title: 'Семейный ужин · Руслан & Эллина',
  start: '20261226T130000Z',
  end: '20261226T180000Z',
  location: 'Усадьба Милютина, зал «Версаль», Москва, Милютинский пер., д. 14, стр. 1',
  address: 'Москва, Милютинский переулок, 14с1',
}

const ua = navigator.userAgent
const isAndroid = /Android/i.test(ua)
// iPhone / iPad (iPadOS reports itself as a Mac with touch) and Mac Safari open .ics in Apple Calendar
const isApple = /iPhone|iPad|iPod|Macintosh/i.test(ua)

const enc = encodeURIComponent

/**
 * Route link: Google Maps; where Google Maps can't be opened — Yandex Maps.
 * Android: opens the Google Maps app, and if it isn't installed, Chrome follows the Yandex fallback
 * (which opens the Yandex Maps app or its site).
 * iPhone and computers: the Google Maps link opens the app if it is installed, otherwise Google Maps in the browser
 * (a web page on iPhone can't check which apps are installed).
 */
export function routeHref(e: WeddingEvent) {
  const google = `https://www.google.com/maps/dir/?api=1&destination=${enc(e.address)}&travelmode=driving`
  if (!isAndroid) return google
  const yandex = `https://yandex.ru/maps/?rtext=~${enc(e.address)}&rtt=auto`
  return `intent://maps.google.com/maps?daddr=${enc(e.address)}#Intent;scheme=https;package=com.google.android.apps.maps;S.browser_fallback_url=${enc(yandex)};end`
}

/**
 * "Add to calendar" link.
 * iPhone / Mac: a static .ics file — Safari shows the system "Add to Calendar" sheet.
 * Android and the rest: Google Calendar with the event filled in (opens the app on Android).
 */
export function calendarHref(e: WeddingEvent) {
  if (isApple) return `${import.meta.env.BASE_URL}calendar/${e.id}.ics`
  return (
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${enc(e.title)}&dates=${e.start}/${e.end}&location=${enc(e.location)}` +
    `&details=${enc('Ждём вас! Руслан и Эллина')}&ctz=Europe/Moscow`
  )
}

/** Google Calendar / maps open in a new tab; .ics and Android intents must open in place */
export const opensInNewTab = (href: string) => href.startsWith('https://')

const CEREMONY = Date.UTC(2026, 11, 26, 11, 30)

/** "через 63 дня" / "уже сегодня" / "" once the day has passed */
export function countdown(now = Date.now()) {
  const diff = CEREMONY - now
  if (diff < -12 * 36e5) return ''
  const days = Math.floor(Math.max(0, diff) / 864e5)
  if (days === 0) return 'уже сегодня'
  const m = days % 10
  const h = days % 100
  const word = m === 1 && h !== 11 ? 'день' : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? 'дня' : 'дней'
  return `через ${days} ${word}`
}
