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

// Google Apps Script web app that writes answers to the Google Sheet (see google-sheets/rsvp.gs).
// Not a secret — it ends up in the public site code either way; it can only add a row to the sheet.
// VITE_RSVP_ENDPOINT overrides it (e.g. a copy of the sheet for testing).
const RSVP_ENDPOINT =
  (import.meta.env.VITE_RSVP_ENDPOINT as string | undefined) ||
  'https://script.google.com/macros/s/AKfycbz0EE8GlFamszqR1PePLyGHADTagBQtz0-RuQWCfpCZEVLj67QADOKmS20xoSfbg3w/exec'

const TIMEOUT_MS = 25000

/**
 * Sends the answer to the sheet.
 * Apps Script runs doPost (the row is written) and only then answers with a redirect to a second Google
 * address holding the reply. That second request often fails on phones (several Google accounts signed in,
 * Safari tracking protection) although the row is already saved — so we don't follow it: the redirect
 * itself means the script has run. This also saves a round trip.
 */
export async function submitRsvp(form: RsvpForm): Promise<void> {
  const payload = { ...form, name: form.name.trim(), id: guestId(), submittedAt: new Date().toISOString() }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  let res: Response
  try {
    // text/plain keeps it a simple request (no preflight); the script's redirect carries CORS headers
    res = await fetch(RSVP_ENDPOINT, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: abort.signal,
    })
  } finally {
    clearTimeout(timer)
  }
  // 'opaqueredirect' = the script ran and wrote the row
  if (res.type !== 'opaqueredirect' && !res.ok) throw new Error(`RSVP not saved (HTTP ${res.status})`)
  save(form)
}
