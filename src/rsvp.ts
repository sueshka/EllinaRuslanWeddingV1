export type Attend = 'both' | 'ceremony' | 'dinner' | 'no'
export type Status = 'idle' | 'sending' | 'success' | 'error'

export interface RsvpForm {
  name: string
  attend: Attend
}

export const ATTEND_OPTIONS: [Attend, string][] = [
  ['both', 'Регистрация и ужин'],
  ['ceremony', 'Только регистрация'],
  ['dinner', 'Только ужин'],
  ['no', 'Не получится присутствовать'],
]

const KEY = 'rsvp:ruslan-ellina-2026'

/** Personal link: /?g=<token> */
export const guestToken = new URLSearchParams(window.location.search).get('g')

export function loadSaved(): RsvpForm | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const { name, attend } = JSON.parse(raw) as RsvpForm
    return { name, attend }
  } catch {
    return null
  }
}

function save(form: RsvpForm) {
  try {
    localStorage.setItem(KEY, JSON.stringify(form))
  } catch {
    /* private mode — ignore */
  }
}

/**
 * Sends the answer to VITE_RSVP_ENDPOINT (e.g. a Google Apps Script web app or an API route).
 * Sent as text/plain to avoid a CORS preflight. Without an endpoint the request is simulated.
 */
export async function submitRsvp(form: RsvpForm): Promise<void> {
  const endpoint = import.meta.env.VITE_RSVP_ENDPOINT as string | undefined
  const payload = { ...form, name: form.name.trim(), token: guestToken, submittedAt: new Date().toISOString() }
  if (endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } else {
    await new Promise((r) => setTimeout(r, 900))
    if (!navigator.onLine) throw new Error('offline')
    console.info('[rsvp] VITE_RSVP_ENDPOINT is not set — simulated submit', payload)
  }
  save(form)
}
