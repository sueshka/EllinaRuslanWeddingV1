// Event details: route link and .ics export (Moscow = UTC+3).

export const VENUE_1 = 'Москва, ул. Моховая, д. 15/1, стр. 1'
export const VENUE_2 = 'Москва, Милютинский переулок, д. 14, стр. 1'

// Yandex Maps: from current location → registration → dinner
export const ROUTE_URL = `https://yandex.ru/maps/?rtext=~${encodeURIComponent(VENUE_1)}~${encodeURIComponent(VENUE_2)}&rtt=auto`

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

// Yandex Maps: from current location → one address
export const routeUrl = (address: string) => `https://yandex.ru/maps/?rtext=~${encodeURIComponent(address)}&rtt=auto`

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;')

const event = (uid: string, start: string, end: string, summary: string, location: string) =>
  [
    'BEGIN:VEVENT',
    `UID:${uid}@ruslan-ellina-2026`,
    'DTSTAMP:20261001T000000Z',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${esc(summary)}`,
    `LOCATION:${esc(location)}`,
    'END:VEVENT',
  ].join('\r\n')

export function downloadIcs() {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ruslan & Ellina//Invitation//RU',
    'CALSCALE:GREGORIAN',
    event('registration', '20261226T113000Z', '20261226T123000Z', 'Регистрация брака · Руслан & Эллина', `Гостиница «Националь», зал «Суздаль», ${VENUE_1}`),
    event('dinner', '20261226T130000Z', '20261226T180000Z', 'Семейный вечер · Руслан & Эллина', `Усадьба Милютина, зал «Версаль», ${VENUE_2}`),
    'END:VCALENDAR',
  ].join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'ruslan-ellina-26-12-2026.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
