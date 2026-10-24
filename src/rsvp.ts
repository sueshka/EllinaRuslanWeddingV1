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

/** Stable id of this guest's browser: a changed answer updates their row in the sheet instead of adding a new one */
function guestId() {
  const k = 'rsvp:guest-id'
  try {
    let id = localStorage.getItem(k)
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem(k, id)
    }
    return id
  } catch {
    return null
  }
}

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
 * Sends the answer to VITE_RSVP_ENDPOINT — the Google Apps Script web app that writes it to the Google Sheet
 * (see google-sheets/rsvp.gs). Sent as text/plain to avoid a CORS preflight. Without an endpoint it is simulated.
 */
export async function submitRsvp(form: RsvpForm): Promise<void> {
  const endpoint = import.meta.env.VITE_RSVP_ENDPOINT as string | undefined
  const payload = { ...form, name: form.name.trim(), id: guestId(), submittedAt: new Date().toISOString() }
  if (endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
    // Apps Script answers 200 with an HTML page on its own errors, so check the script's reply too
    const reply = res.ok ? await res.json().catch(() => null) : null
    if (!reply?.ok) throw new Error(`RSVP not saved (HTTP ${res.status})`)
  } else {
    await new Promise((r) => setTimeout(r, 900))
    if (!navigator.onLine) throw new Error('offline')
    console.info('[rsvp] VITE_RSVP_ENDPOINT is not set — simulated submit', payload)
  }
  save(form)
}
